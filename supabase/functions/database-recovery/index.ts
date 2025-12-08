import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request body for organizationId
    let organizationId: string | null = null;
    try {
      const body = await req.json();
      organizationId = body.organizationId || null;
    } catch {
      // No body or invalid JSON - continue without org filter
    }

    console.log('[database-recovery] ===== DATABASE RECOVERY STARTED =====');
    console.log('[database-recovery] Organization ID:', organizationId || 'GLOBAL (all orgs)');
    const startTime = Date.now();
    const MAX_EXECUTION_TIME = 45000; // 45 seconds (leave 15s buffer before 60s timeout)

    const recoveryLog: string[] = [];
    const log = (message: string) => {
      console.log(`[database-recovery] ${message}`);
      recoveryLog.push(`[${new Date().toISOString()}] ${message}`);
    };

    // Helper function to count duplicates with org filter
    const countDuplicates = async () => {
      let allExternalIds: string[] = [];
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;
      let pageNumber = 0;

      log('Counting duplicates with pagination...');
      
      while (hasMore) {
        pageNumber++;
        
        let query = supabase
          .from('messages')
          .select('external_id, conversation_id')
          .not('external_id', 'is', null)
          .range(offset, offset + pageSize - 1);
        
        const { data: batch, error } = await query;
        
        if (error) {
          log(`Error fetching page ${pageNumber} for duplicate count: ${error.message}`);
          return 0;
        }
        
        if (batch && batch.length > 0) {
          // If org filter is set, we need to check conversation ownership
          if (organizationId) {
            // Get conversation IDs for this batch
            const convIds = [...new Set(batch.map(m => m.conversation_id).filter(Boolean))];
            
            if (convIds.length > 0) {
              const { data: orgConvs } = await supabase
                .from('conversations')
                .select('id')
                .eq('organization_id', organizationId)
                .in('id', convIds);
              
              const orgConvIds = new Set(orgConvs?.map(c => c.id) || []);
              
              // Only include external_ids from messages in this org's conversations
              const orgMessages = batch.filter(m => orgConvIds.has(m.conversation_id));
              allExternalIds = allExternalIds.concat(orgMessages.map(m => m.external_id));
            }
          } else {
            allExternalIds = allExternalIds.concat(batch.map(m => m.external_id));
          }
          
          offset += pageSize;
          hasMore = batch.length === pageSize;
          
          if (pageNumber % 10 === 0) {
            log(`Fetched ${pageNumber} pages, ${allExternalIds.length} messages so far...`);
          }
        } else {
          hasMore = false;
        }
      }
      
      log(`Fetched ${allExternalIds.length} total messages for duplicate count`);
      
      // Count unique external_ids
      const uniqueIds = new Set(allExternalIds);
      const duplicateCount = allExternalIds.length - uniqueIds.size;
      
      return duplicateCount;
    };

    // Step 1: Check initial duplicate count
    log('Step 1: Checking for duplicates...');
    const initialDuplicateCount = await countDuplicates();
    log(`Found ${initialDuplicateCount} messages with duplicate external_ids`);

    // Step 2: Run cleanup in loop until no duplicates remain
    log('Step 2: Starting iterative cleanup process...');
    let iteration = 0;
    let totalDeleted = 0;
    let hasMoreDuplicates = true;

    while (hasMoreDuplicates && iteration < 50) { // Max 50 iterations as safety
      iteration++;
      log(`--- Cleanup Iteration ${iteration} ---`);

      // Check if we're approaching timeout
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime > MAX_EXECUTION_TIME) {
        log(`Approaching timeout (${elapsedTime}ms elapsed), scheduling continuation...`);
        
        // Check remaining duplicates
        const remainingCount = await countDuplicates();
        log(`${remainingCount} duplicates remain, triggering self-invocation`);
        
        // Self-invoke to continue cleanup in a new function instance
        EdgeRuntime.waitUntil(
          fetch(`${supabaseUrl}/functions/v1/database-recovery`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ organizationId })
          }).then(res => {
            console.log('[database-recovery] Self-invocation triggered, status:', res.status);
          }).catch(err => {
            console.error('[database-recovery] Self-invocation failed:', err);
          })
        );
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        // Return immediate response indicating continuation
        return new Response(
          JSON.stringify({
            success: true,
            status: 'continuing',
            message: 'Cleanup continuing in background',
            organizationId,
            totalIterations: iteration,
            totalDuplicatesDeleted: totalDeleted,
            remainingDuplicates: remainingCount,
            durationSeconds: parseFloat(duration),
            nextInvocationTriggered: true,
            fullLog: recoveryLog
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: cleanupResult, error: cleanupError } = await supabase.functions.invoke(
        'cleanup-duplicate-messages',
        { body: { organizationId } }
      );

      if (cleanupError) {
        log(`ERROR in iteration ${iteration}: ${cleanupError.message}`);
        throw cleanupError;
      }

      // supabase.functions.invoke returns parsed JSON directly, not a Response object
      const result = cleanupResult as any;
      
      if (!result) {
        log('ERROR: cleanup-duplicate-messages returned no data');
        throw new Error('cleanup-duplicate-messages returned no data');
      }
      
      log(`Iteration ${iteration} result: ${JSON.stringify(result)}`);

      if (result.success) {
        totalDeleted += result.duplicatesDeleted || 0;
        hasMoreDuplicates = (result.duplicatesDeleted || 0) > 0;
        
        if (!hasMoreDuplicates) {
          log('No more duplicates found. Cleanup complete!');
        }
      } else {
        log(`Cleanup failed: ${result.error}`);
        throw new Error(result.error);
      }

      // Small delay between iterations
      if (hasMoreDuplicates) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    log(`Cleanup complete after ${iteration} iterations. Total deleted: ${totalDeleted}`);

    // Step 3: Verify no duplicates remain
    log('Step 3: Verifying cleanup...');
    const verifyCount = await countDuplicates();
    log(`Verification: ${verifyCount} duplicate messages remaining`);
    
    if (verifyCount > 0) {
      throw new Error(`Verification failed: ${verifyCount} duplicates still exist`);
    }

    // Step 4: Instructions for creating unique index
    log('Step 4: Database cleanup complete. Next steps:');
    log('');
    log('To prevent future duplicates, create a unique index by running this SQL in Supabase:');
    log('');
    log('CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_external_id_unique');
    log('ON public.messages(external_id)');
    log('WHERE external_id IS NOT NULL;');
    log('');
    log('After creating the index, re-enable email-sync-scheduler in config.toml');

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`===== DATABASE RECOVERY COMPLETED in ${duration}s =====`);

    const summary = {
      success: true,
      status: 'complete',
      organizationId,
      totalIterations: iteration,
      totalDuplicatesDeleted: totalDeleted,
      durationSeconds: parseFloat(duration),
      verificationPassed: verifyCount === 0,
      nextSteps: [
        '1. Create unique index in Supabase SQL editor:',
        '   CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_external_id_unique',
        '   ON public.messages(external_id)',
        '   WHERE external_id IS NOT NULL;',
        '',
        '2. Re-enable email-sync-scheduler in config.toml',
        '3. Monitor with monitor-database-health function'
      ],
      fullLog: recoveryLog
    };

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[database-recovery] FATAL ERROR:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

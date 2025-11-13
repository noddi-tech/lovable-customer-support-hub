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
    
    console.log('[database-recovery] ===== DATABASE RECOVERY STARTED =====');
    const startTime = Date.now();

    const recoveryLog: string[] = [];
    const log = (message: string) => {
      console.log(`[database-recovery] ${message}`);
      recoveryLog.push(`[${new Date().toISOString()}] ${message}`);
    };

    // Step 1: Check initial duplicate count
    log('Step 1: Checking for duplicates...');
    const { data: initialCheck, error: checkError } = await supabase.rpc('count_duplicate_messages');
    
    if (checkError) {
      log(`Error checking duplicates: ${checkError.message}`);
    } else {
      log(`Found ${initialCheck || 0} messages with duplicate external_ids`);
    }

    // Step 2: Run cleanup in loop until no duplicates remain
    log('Step 2: Starting iterative cleanup process...');
    let iteration = 0;
    let totalDeleted = 0;
    let hasMoreDuplicates = true;

    while (hasMoreDuplicates && iteration < 50) { // Max 50 iterations as safety
      iteration++;
      log(`--- Cleanup Iteration ${iteration} ---`);

      const { data: cleanupResult, error: cleanupError } = await supabase.functions.invoke(
        'cleanup-duplicate-messages',
        { body: {} }
      );

      if (cleanupError) {
        log(`ERROR in iteration ${iteration}: ${cleanupError.message}`);
        throw cleanupError;
      }

      const result = await cleanupResult.json();
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
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    log(`Cleanup complete after ${iteration} iterations. Total deleted: ${totalDeleted}`);

    // Step 3: Verify no duplicates remain
    log('Step 3: Verifying cleanup...');
    const { data: verifyCount, error: verifyError } = await supabase.rpc('count_duplicate_messages');
    
    if (verifyError) {
      log(`Warning: Could not verify cleanup: ${verifyError.message}`);
    } else {
      log(`Verification: ${verifyCount || 0} duplicate messages remaining`);
      
      if (verifyCount && verifyCount > 0) {
        throw new Error(`Verification failed: ${verifyCount} duplicates still exist`);
      }
    }

    // Step 4: Apply unique constraint migration
    log('Step 4: Applying unique constraint migration...');
    log('Note: This step requires manual SQL execution in Supabase dashboard');
    log('Run: CREATE UNIQUE INDEX CONCURRENTLY idx_messages_external_id_unique ON messages(external_id);');

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`===== DATABASE RECOVERY COMPLETED in ${duration}s =====`);

    const summary = {
      success: true,
      totalIterations: iteration,
      totalDuplicatesDeleted: totalDeleted,
      durationSeconds: parseFloat(duration),
      verificationPassed: (verifyCount || 0) === 0,
      nextSteps: [
        'Apply unique constraint migration in Supabase SQL editor',
        'Re-enable email-sync-scheduler in config.toml',
        'Monitor with monitor-database-health function'
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
        error: error.message,
        stack: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

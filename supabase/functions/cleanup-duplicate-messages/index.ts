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
    
    console.log('[cleanup-duplicate-messages] Starting duplicate cleanup process');

    // Find duplicates grouped by external_id, keeping the oldest message
    const { data: duplicates, error: findError } = await supabase
      .from('messages')
      .select('external_id, id, created_at')
      .not('external_id', 'is', null)
      .order('external_id')
      .order('created_at');

    if (findError) {
      console.error('[cleanup-duplicate-messages] Error finding duplicates:', findError);
      throw findError;
    }

    console.log(`[cleanup-duplicate-messages] Found ${duplicates?.length || 0} messages to analyze`);

    // Group by external_id and identify duplicates
    const groupedByExternalId = new Map<string, Array<{ id: string; created_at: string }>>();
    
    for (const msg of duplicates || []) {
      if (!groupedByExternalId.has(msg.external_id)) {
        groupedByExternalId.set(msg.external_id, []);
      }
      groupedByExternalId.get(msg.external_id)!.push({
        id: msg.id,
        created_at: msg.created_at
      });
    }

    // Find which messages to delete (keep oldest, delete rest)
    const messagesToDelete: string[] = [];
    let duplicateGroupsFound = 0;

    for (const [externalId, messages] of groupedByExternalId.entries()) {
      if (messages.length > 1) {
        duplicateGroupsFound++;
        // Sort by created_at to keep the oldest
        messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        
        // Mark all except the first (oldest) for deletion
        for (let i = 1; i < messages.length; i++) {
          messagesToDelete.push(messages[i].id);
        }
      }
    }

    console.log(`[cleanup-duplicate-messages] Found ${duplicateGroupsFound} duplicate groups`);
    console.log(`[cleanup-duplicate-messages] Will delete ${messagesToDelete.length} duplicate messages`);

    if (messagesToDelete.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No duplicates found',
          duplicatesDeleted: 0,
          duplicateGroupsFound: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete in batches of 50 to avoid PostgREST query parameter limits
    const batchSize = 50;
    let totalDeleted = 0;
    let batchNumber = 0;

    for (let i = 0; i < messagesToDelete.length; i += batchSize) {
      batchNumber++;
      const batch = messagesToDelete.slice(i, i + batchSize);
      
      console.log(`[cleanup-duplicate-messages] Processing batch ${batchNumber}: deleting ${batch.length} messages`);
      
      const { error: deleteError } = await supabase
        .from('messages')
        .delete()
        .in('id', batch);

      if (deleteError) {
        console.error(`[cleanup-duplicate-messages] Error in batch ${batchNumber}:`, deleteError);
        throw deleteError;
      }

      totalDeleted += batch.length;
      console.log(`[cleanup-duplicate-messages] Batch ${batchNumber} complete. Total deleted: ${totalDeleted}/${messagesToDelete.length}`);

      // Add delay between batches to prevent database overload
      if (i + batchSize < messagesToDelete.length) {
        console.log('[cleanup-duplicate-messages] Waiting 0.5 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const result = {
      success: true,
      duplicateGroupsFound,
      duplicatesDeleted: totalDeleted,
      batchesProcessed: batchNumber,
      message: `Successfully deleted ${totalDeleted} duplicate messages from ${duplicateGroupsFound} groups`
    };

    console.log('[cleanup-duplicate-messages] Cleanup complete:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[cleanup-duplicate-messages] Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

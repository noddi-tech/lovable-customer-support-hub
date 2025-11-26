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

    // Fetch ALL messages with pagination to handle datasets larger than 1000
    console.log('[cleanup-duplicate-messages] Fetching all messages with external_id...');
    let allMessages: Array<{ external_id: string; id: string; created_at: string }> = [];
    let offset = 0;
    const pageSize = 1000;
    let hasMore = true;
    let pageNumber = 0;

    while (hasMore) {
      pageNumber++;
      console.log(`[cleanup-duplicate-messages] Fetching page ${pageNumber} (offset: ${offset})...`);
      
      const { data: batch, error: fetchError } = await supabase
        .from('messages')
        .select('external_id, id, created_at')
        .not('external_id', 'is', null)
        .order('created_at')
        .range(offset, offset + pageSize - 1);

      if (fetchError) {
        console.error('[cleanup-duplicate-messages] Error fetching messages:', fetchError);
        throw fetchError;
      }

      if (batch && batch.length > 0) {
        allMessages = allMessages.concat(batch);
        console.log(`[cleanup-duplicate-messages] Page ${pageNumber}: fetched ${batch.length} messages. Total so far: ${allMessages.length}`);
        offset += pageSize;
        hasMore = batch.length === pageSize; // Continue if we got a full page
      } else {
        hasMore = false;
      }
    }

    console.log(`[cleanup-duplicate-messages] Finished fetching. Total messages to analyze: ${allMessages.length}`);

    // Group by external_id and identify duplicates
    const groupedByExternalId = new Map<string, Array<{ id: string; created_at: string }>>();
    
    for (const msg of allMessages) {
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

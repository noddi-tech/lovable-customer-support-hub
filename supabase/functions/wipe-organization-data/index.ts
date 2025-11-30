import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

const BATCH_SIZE = 100; // Delete in smaller batches to avoid timeout

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const body = await req.json();
    const { 
      organizationId, 
      wipeMessages = true, 
      wipeConversations = true, 
      wipeImportJobs = true,
      wipeCustomers = false,
      wipeInboxes = false 
    } = body;

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    const supabaseServiceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const progress = {
      messagesDeleted: 0,
      conversationsDeleted: 0,
      importJobsDeleted: 0,
      customersDeleted: 0,
      inboxesDeleted: 0,
      syncPaused: 0,
      syncResumed: 0,
      errors: [] as string[],
    };

    console.log('[WipeOrgData] Starting wipe for organization:', organizationId);

    // Step 0: Pause Gmail sync for this organization
    console.log('[WipeOrgData] Pausing Gmail sync for organization...');
    const { data: pausedAccounts, error: pauseError } = await supabaseServiceClient
      .from('email_accounts')
      .update({ auto_sync_enabled: false })
      .eq('organization_id', organizationId)
      .eq('auto_sync_enabled', true)
      .select('id, email_address');

    if (pauseError) {
      console.error('[WipeOrgData] Error pausing sync:', pauseError);
      progress.errors.push(`Failed to pause Gmail sync: ${pauseError.message}`);
    } else {
      const pausedCount = pausedAccounts?.length || 0;
      progress.syncPaused = pausedCount;
      console.log(`[WipeOrgData] Paused sync for ${pausedCount} email accounts`);
    }

    // Store IDs of paused accounts to re-enable later
    const pausedAccountIds = pausedAccounts?.map(a => a.id) || [];

    // Step 1: Delete messages (cascading will handle some related records)
    if (wipeMessages) {
      console.log('[WipeOrgData] Deleting messages...');
      
      // First, get all conversation IDs for this organization
      const { data: orgConversations, error: convError } = await supabaseServiceClient
        .from('conversations')
        .select('id')
        .eq('organization_id', organizationId);
      
      if (convError) {
        console.error('[WipeOrgData] Error fetching conversation IDs:', convError);
        progress.errors.push(`Failed to fetch conversation IDs: ${convError.message}`);
      } else if (orgConversations && orgConversations.length > 0) {
        const conversationIds = orgConversations.map(c => c.id);
        const CONV_BATCH_SIZE = 50; // Batch conversation IDs for .in() queries to avoid URL length limit
        let deletedCount = 0;
        let hasMore = true;

        while (hasMore) {
          // Get a batch of message IDs to delete, processing conversation IDs in batches
          let messageIds: string[] = [];
          
          for (let i = 0; i < conversationIds.length; i += CONV_BATCH_SIZE) {
            const convBatch = conversationIds.slice(i, i + CONV_BATCH_SIZE);
            
            const { data: batchMessages, error: fetchError } = await supabaseServiceClient
              .from('messages')
              .select('id')
              .in('conversation_id', convBatch)
              .limit(BATCH_SIZE);
            
            if (fetchError) {
              console.error('[WipeOrgData] Error fetching messages for conv batch:', fetchError);
              progress.errors.push(`Failed to fetch messages batch: ${fetchError.message}`);
              continue;
            }
            
            if (batchMessages) {
              messageIds.push(...batchMessages.map(m => m.id));
            }
            
            // Stop early if we have enough IDs for this deletion batch
            if (messageIds.length >= BATCH_SIZE) break;
          }
          
          if (messageIds.length === 0) {
            hasMore = false;
            break;
          }

          const { error: deleteError } = await supabaseServiceClient
            .from('messages')
            .delete()
            .in('id', messageIds);

          if (deleteError) {
            console.error('[WipeOrgData] Error deleting messages batch:', deleteError);
            progress.errors.push(`Failed to delete messages batch: ${deleteError.message}`);
            break;
          }

          deletedCount += messageIds.length;
          progress.messagesDeleted = deletedCount;
          console.log(`[WipeOrgData] Deleted ${deletedCount} messages so far...`);

          // If we got less than BATCH_SIZE, we're done
          if (messageIds.length < BATCH_SIZE) {
            hasMore = false;
          }

          // Small delay to avoid overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log(`[WipeOrgData] Deleted total ${deletedCount} messages`);
      } else {
        console.log('[WipeOrgData] No conversations found, skipping message deletion');
      }
    }

    // Step 2: Delete conversations
    if (wipeConversations) {
      console.log('[WipeOrgData] Deleting conversations...');
      let deletedCount = 0;
      let hasMore = true;

      while (hasMore) {
        const { data: conversations, error: fetchError } = await supabaseServiceClient
          .from('conversations')
          .select('id')
          .eq('organization_id', organizationId)
          .limit(BATCH_SIZE);

        if (fetchError) {
          console.error('[WipeOrgData] Error fetching conversations:', fetchError);
          progress.errors.push(`Failed to fetch conversations: ${fetchError.message}`);
          break;
        }

        if (!conversations || conversations.length === 0) {
          hasMore = false;
          break;
        }

        const conversationIds = conversations.map(c => c.id);

        const { error: deleteError } = await supabaseServiceClient
          .from('conversations')
          .delete()
          .in('id', conversationIds);

        if (deleteError) {
          console.error('[WipeOrgData] Error deleting conversations batch:', deleteError);
          progress.errors.push(`Failed to delete conversations batch: ${deleteError.message}`);
          break;
        }

        deletedCount += conversations.length;
        progress.conversationsDeleted = deletedCount;
        console.log(`[WipeOrgData] Deleted ${deletedCount} conversations so far...`);

        if (conversations.length < BATCH_SIZE) {
          hasMore = false;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`[WipeOrgData] Deleted total ${deletedCount} conversations`);
    }

    // Step 3: Delete import jobs
    if (wipeImportJobs) {
      console.log('[WipeOrgData] Deleting import jobs...');
      const { data, error } = await supabaseServiceClient
        .from('import_jobs')
        .delete()
        .eq('organization_id', organizationId)
        .select('id');

      if (error) {
        console.error('[WipeOrgData] Error deleting import jobs:', error);
        progress.errors.push(`Failed to delete import jobs: ${error.message}`);
      } else {
        progress.importJobsDeleted = data?.length || 0;
        console.log(`[WipeOrgData] Deleted ${progress.importJobsDeleted} import jobs`);
      }
    }

    // Step 4: Delete customers (optional)
    if (wipeCustomers) {
      console.log('[WipeOrgData] Deleting customers...');
      let deletedCount = 0;
      let hasMore = true;

      while (hasMore) {
        const { data: customers, error: fetchError } = await supabaseServiceClient
          .from('customers')
          .select('id')
          .eq('organization_id', organizationId)
          .limit(BATCH_SIZE);

        if (fetchError) {
          console.error('[WipeOrgData] Error fetching customers:', fetchError);
          progress.errors.push(`Failed to fetch customers: ${fetchError.message}`);
          break;
        }

        if (!customers || customers.length === 0) {
          hasMore = false;
          break;
        }

        const customerIds = customers.map(c => c.id);

        const { error: deleteError } = await supabaseServiceClient
          .from('customers')
          .delete()
          .in('id', customerIds);

        if (deleteError) {
          console.error('[WipeOrgData] Error deleting customers batch:', deleteError);
          progress.errors.push(`Failed to delete customers batch: ${deleteError.message}`);
          break;
        }

        deletedCount += customers.length;
        progress.customersDeleted = deletedCount;
        console.log(`[WipeOrgData] Deleted ${deletedCount} customers so far...`);

        if (customers.length < BATCH_SIZE) {
          hasMore = false;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`[WipeOrgData] Deleted total ${deletedCount} customers`);
    }

    // Step 5: Delete inboxes (optional)
    if (wipeInboxes) {
      console.log('[WipeOrgData] Deleting inboxes...');
      const { data, error } = await supabaseServiceClient
        .from('inboxes')
        .delete()
        .eq('organization_id', organizationId)
        .neq('is_default', true) // Keep default inbox
        .select('id');

      if (error) {
        console.error('[WipeOrgData] Error deleting inboxes:', error);
        progress.errors.push(`Failed to delete inboxes: ${error.message}`);
      } else {
        progress.inboxesDeleted = data?.length || 0;
        console.log(`[WipeOrgData] Deleted ${progress.inboxesDeleted} inboxes`);
      }
    }

    // Final Step: Resume Gmail sync for paused accounts
    if (pausedAccountIds.length > 0) {
      console.log('[WipeOrgData] Resuming Gmail sync...');
      const { error: resumeError } = await supabaseServiceClient
        .from('email_accounts')
        .update({ auto_sync_enabled: true })
        .in('id', pausedAccountIds);

      if (resumeError) {
        console.error('[WipeOrgData] Error resuming sync:', resumeError);
        progress.errors.push(`Failed to resume Gmail sync: ${resumeError.message}`);
      } else {
        progress.syncResumed = pausedAccountIds.length;
        console.log(`[WipeOrgData] Resumed sync for ${pausedAccountIds.length} email accounts`);
      }
    }

    console.log('[WipeOrgData] Wipe complete:', progress);

    return new Response(
      JSON.stringify({ 
        success: true, 
        progress,
        message: progress.errors.length > 0 
          ? 'Wipe completed with some errors' 
          : 'Wipe completed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[WipeOrgData] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

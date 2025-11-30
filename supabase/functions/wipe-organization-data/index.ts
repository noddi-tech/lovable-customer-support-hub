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
      errors: [] as string[],
    };

    console.log('[WipeOrgData] Starting wipe for organization:', organizationId);

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
        let deletedCount = 0;
        let hasMore = true;

        while (hasMore) {
          // Get a batch of message IDs to delete
          const { data: messages, error: fetchError } = await supabaseServiceClient
            .from('messages')
            .select('id')
            .in('conversation_id', conversationIds)
            .limit(BATCH_SIZE);

          if (fetchError) {
            console.error('[WipeOrgData] Error fetching messages:', fetchError);
            progress.errors.push(`Failed to fetch messages: ${fetchError.message}`);
            break;
          }

          if (!messages || messages.length === 0) {
            hasMore = false;
            break;
          }

          const messageIds = messages.map(m => m.id);

          const { error: deleteError } = await supabaseServiceClient
            .from('messages')
            .delete()
            .in('id', messageIds);

          if (deleteError) {
            console.error('[WipeOrgData] Error deleting messages batch:', deleteError);
            progress.errors.push(`Failed to delete messages batch: ${deleteError.message}`);
            break;
          }

          deletedCount += messages.length;
          progress.messagesDeleted = deletedCount;
          console.log(`[WipeOrgData] Deleted ${deletedCount} messages so far...`);

          // If we got less than BATCH_SIZE, we're done
          if (messages.length < BATCH_SIZE) {
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

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const HELPSCOUT_APP_ID = Deno.env.get('HELPSCOUT_APP_ID');
const HELPSCOUT_APP_SECRET = Deno.env.get('HELPSCOUT_APP_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface ImportProgress {
  totalMailboxes: number;
  totalConversations: number;
  conversationsImported: number;
  messagesImported: number;
  customersImported: number;
  errors: string[];
  status: 'running' | 'completed' | 'error';
}

// OAuth2 token exchange
async function getAccessToken(): Promise<string> {
  const tokenResponse = await fetch('https://api.helpscout.net/v2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: HELPSCOUT_APP_ID,
      client_secret: HELPSCOUT_APP_SECRET,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`Failed to authenticate: ${tokenResponse.statusText}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

// Fetch data from HelpScout with rate limiting
async function fetchHelpScout(
  accessToken: string,
  endpoint: string,
  retries = 3
): Promise<any> {
  const url = `https://api.helpscout.net/v2${endpoint}`;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
      console.log(`Rate limited. Waiting ${retryAfter}s before retry ${attempt + 1}/${retries}`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      continue;
    }

    if (!response.ok) {
      console.error(`HelpScout API error: ${response.status} ${response.statusText}`);
      if (attempt === retries - 1) {
        throw new Error(`HelpScout API error: ${response.status}`);
      }
      await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
      continue;
    }

    return await response.json();
  }

  throw new Error('Max retries exceeded');
}

// Import a customer
async function importCustomer(
  supabase: any,
  organizationId: string,
  customerData: any
): Promise<string | null> {
  if (!customerData?.email && !customerData?.phone) {
    return null;
  }

  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .eq('organization_id', organizationId)
    .or(`email.eq.${customerData.email || ''},phone.eq.${customerData.phone || ''}`)
    .single();

  if (existing) {
    return existing.id;
  }

  const { data, error } = await supabase
    .from('customers')
    .insert({
      organization_id: organizationId,
      email: customerData.email,
      full_name: `${customerData.firstName || ''} ${customerData.lastName || ''}`.trim() || customerData.email,
      phone: customerData.phone,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating customer:', error);
    return null;
  }

  return data.id;
}

// Import conversation with messages
async function importConversation(
  supabase: any,
  accessToken: string,
  organizationId: string,
  inboxId: string,
  conversation: any,
  progress: ImportProgress
): Promise<void> {
  try {
    // Check if conversation already exists
    const externalId = `helpscout_${conversation.id}`;
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('external_id', externalId)
      .single();

    if (existingConv) {
      console.log(`Conversation ${conversation.id} already imported, skipping`);
      return;
    }

    // Import customer
    const customerId = await importCustomer(supabase, organizationId, conversation.primaryCustomer);
    
    // Create conversation
    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert({
        organization_id: organizationId,
        inbox_id: inboxId,
        customer_id: customerId,
        external_id: externalId,
        subject: conversation.subject || 'No subject',
        status: conversation.status === 'active' ? 'open' : conversation.status === 'closed' ? 'closed' : 'pending',
        channel: 'email',
        priority: 'normal',
        created_at: conversation.createdAt,
        updated_at: conversation.userUpdatedAt || conversation.createdAt,
        received_at: conversation.createdAt,
      })
      .select('id')
      .single();

    if (convError) {
      progress.errors.push(`Failed to import conversation ${conversation.id}: ${convError.message}`);
      return;
    }

    progress.conversationsImported++;

    // Fetch and import threads (messages)
    const threadsData = await fetchHelpScout(accessToken, `/conversations/${conversation.id}/threads`);
    const threads = threadsData._embedded?.threads || [];

    for (const thread of threads) {
      if (thread.type !== 'message' && thread.type !== 'customer' && thread.type !== 'note') {
        continue; // Skip non-message threads
      }

      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: newConv.id,
          external_id: `helpscout_thread_${thread.id}`,
          content: thread.body || '',
          sender_type: thread.type === 'customer' ? 'customer' : 'agent',
          sender_id: customerId,
          created_at: thread.createdAt,
          is_internal: thread.type === 'note',
          content_type: 'html',
        });

      if (msgError) {
        console.error(`Error importing thread ${thread.id}:`, msgError);
      } else {
        progress.messagesImported++;
      }
    }

    console.log(`Imported conversation ${conversation.id} with ${threads.length} messages`);
  } catch (error) {
    progress.errors.push(`Error importing conversation ${conversation.id}: ${error.message}`);
    console.error(`Error importing conversation ${conversation.id}:`, error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organizationId, mailboxIds, dateFrom, preview, test, mailboxMapping } = await req.json();

    // Test mode - just verify credentials
    if (test) {
      try {
        const accessToken = await getAccessToken();
        return new Response(
          JSON.stringify({ success: true, message: 'Credentials are valid' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ error: 'Invalid credentials' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Preview mode - fetch mailboxes only
    if (preview) {
      try {
        const accessToken = await getAccessToken();
        const mailboxesData = await fetchHelpScout(accessToken, '/mailboxes');
        const mailboxes = (mailboxesData._embedded?.mailboxes || []).map((mb: any) => ({
          id: mb.id,
          name: mb.name,
          email: mb.email,
        }));
        
        return new Response(
          JSON.stringify({ mailboxes }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'organizationId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const progress: ImportProgress = {
      totalMailboxes: 0,
      totalConversations: 0,
      conversationsImported: 0,
      messagesImported: 0,
      customersImported: 0,
      errors: [],
      status: 'running',
    };

    // Start background task
    EdgeRuntime.waitUntil((async () => {
      try {
        console.log('Starting HelpScout import...');
        const accessToken = await getAccessToken();
        console.log('Authenticated with HelpScout');

        // Fetch mailboxes
        const mailboxesData = await fetchHelpScout(accessToken, '/mailboxes');
        const mailboxes = mailboxesData._embedded?.mailboxes || [];
        progress.totalMailboxes = mailboxes.length;

        console.log(`Found ${mailboxes.length} mailboxes`);

        // Filter mailboxes if specified
        const targetMailboxes = mailboxIds?.length > 0
          ? mailboxes.filter((mb: any) => mailboxIds.includes(mb.id))
          : mailboxes;

        // Process mailboxes based on mapping
        for (const mailbox of targetMailboxes) {
          // Check if this mailbox should be imported
          const targetInboxId = mailboxMapping?.[mailbox.id];
          
          if (!targetInboxId || targetInboxId === 'skip') {
            console.log(`Skipping mailbox: ${mailbox.name}`);
            continue;
          }

          console.log(`Processing mailbox: ${mailbox.name}`);

          // Determine target inbox
          let inboxId: string;
          
          if (targetInboxId === 'create_new') {
            // Create new inbox
            const { data: newInbox, error: inboxError } = await supabase
              .from('inboxes')
              .insert({
                organization_id: organizationId,
                name: mailbox.name,
                description: `Imported from HelpScout`,
                is_active: true,
              })
              .select('id')
              .single();
            
            if (inboxError || !newInbox) {
              progress.errors.push(`Failed to create inbox for mailbox ${mailbox.name}`);
              continue;
            }
            inboxId = newInbox.id;
          } else {
            // Use existing inbox
            inboxId = targetInboxId;
          }

          if (!inboxId) {
            progress.errors.push(`No inbox ID for mailbox ${mailbox.name}`);
            continue;
          }

          // Fetch conversations for this mailbox
          let page = 1;
          let hasMore = true;

          while (hasMore) {
            let endpoint = `/conversations?mailbox=${mailbox.id}&page=${page}&status=all`;
            if (dateFrom) {
              endpoint += `&modifiedSince=${dateFrom}`;
            }

            const conversationsData = await fetchHelpScout(accessToken, endpoint);
            const conversations = conversationsData._embedded?.conversations || [];
            
            if (conversations.length === 0) {
              hasMore = false;
              break;
            }

            progress.totalConversations += conversations.length;

            // Import each conversation
            for (const conversation of conversations) {
              await importConversation(
                supabase,
                accessToken,
                organizationId,
                inboxId,
                conversation,
                progress
              );
            }

            // Check if there are more pages
            hasMore = conversationsData.page?.number < conversationsData.page?.totalPages;
            page++;

            // Rate limiting: ~150ms between batches (400 req/min = ~150ms per request)
            await new Promise(resolve => setTimeout(resolve, 150));
          }
        }

        progress.status = 'completed';
        console.log('Import completed successfully', progress);
      } catch (error) {
        progress.status = 'error';
        progress.errors.push(error.message);
        console.error('Import failed:', error);
      }
    })());

    // Return immediate response
    return new Response(
      JSON.stringify({
        message: 'Import started',
        progress,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error starting import:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

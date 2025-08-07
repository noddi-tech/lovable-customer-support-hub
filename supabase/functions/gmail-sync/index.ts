import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  emailAccountId?: string;
  syncSent?: boolean;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      'https://qgfaycwsangsqzpveoup.supabase.co',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Check if this is a service role call (from cron job) or user call
    const authHeader = req.headers.get('Authorization') || '';
    const isServiceRoleCall = authHeader.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '');
    
    let user = null;
    if (!isServiceRoleCall) {
      const { data: { user: authUser } } = await supabaseClient.auth.getUser();
      if (!authUser) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      user = authUser;
    }

    const { emailAccountId, syncSent = false } = await req.json() as SyncRequest;

    // Get email accounts to sync
    let query = supabaseClient
      .from('email_accounts')
      .select('*')
      .eq('is_active', true);
    
    // For user calls, filter by user_id. For service role calls, allow access to all accounts
    if (!isServiceRoleCall && user) {
      query = query.eq('user_id', user.id);
    }

    if (emailAccountId) {
      query = query.eq('id', emailAccountId);
    }

    const { data: emailAccounts, error: accountsError } = await query;

    if (accountsError) {
      console.error('Error fetching email accounts:', accountsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch email accounts' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const syncResults = [];

    for (const account of emailAccounts) {
      try {
        console.log(`Syncing emails for account: ${account.email_address}`);
        
        // Check if token needs refresh
        if (new Date(account.token_expires_at) <= new Date()) {
          console.log('Token expired, refreshing...');
          const refreshResult = await refreshAccessToken(account, supabaseClient);
          if (!refreshResult.success) {
            syncResults.push({
              accountId: account.id,
              success: false,
              error: 'Token refresh failed'
            });
            continue;
          }
          account.access_token = refreshResult.accessToken;
        }

        // Sync emails from Gmail (inbox and optionally sent)
        const inboxResult = await syncGmailMessages(account, supabaseClient, 'inbox');
        let sentResult = { success: true, messageCount: 0 };
        
        if (syncSent) {
          sentResult = await syncGmailMessages(account, supabaseClient, 'sent');
        }
        
        syncResults.push({
          accountId: account.id,
          success: inboxResult.success && sentResult.success,
          messageCount: inboxResult.messageCount + sentResult.messageCount,
          error: inboxResult.error || sentResult.error
        });

        // Update last sync time
        await supabaseClient
          .from('email_accounts')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', account.id);

      } catch (error) {
        console.error(`Error syncing account ${account.id}:`, error);
        syncResults.push({
          accountId: account.id,
          success: false,
          error: error.message
        });
      }
    }

    return new Response(JSON.stringify({ syncResults }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in gmail-sync function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function refreshAccessToken(account: any, supabaseClient: any) {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: "1072539713646-gvkvnmg9v5d15fttugh6om7safekmh4p.apps.googleusercontent.com",
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
        refresh_token: account.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    const tokens = await response.json();
    
    if (!tokens.access_token) {
      console.error('Token refresh failed:', tokens);
      return { success: false };
    }

    // Update stored tokens
    await supabaseClient
      .from('email_accounts')
      .update({
        access_token: tokens.access_token,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      })
      .eq('id', account.id);

    return { success: true, accessToken: tokens.access_token };
  } catch (error) {
    console.error('Error refreshing token:', error);
    return { success: false };
  }
}

async function syncGmailMessages(account: any, supabaseClient: any, folder: 'inbox' | 'sent' = 'inbox') {
  try {
    console.log(`Starting Gmail sync for account: ${account.email_address}, folder: ${folder}`);
    console.log(`Account details:`, {
      id: account.id,
      email: account.email_address,
      hasAccessToken: !!account.access_token,
      tokenExpiry: account.token_expires_at
    });

    // Get messages from Gmail API
    const query = folder === 'sent' ? 'in:sent' : 'in:inbox';
    const gmailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=50`;
    console.log(`Fetching messages from: ${gmailUrl}`);
    
    const response = await fetch(gmailUrl, {
      headers: { 
        Authorization: `Bearer ${account.access_token}`,
        'Content-Type': 'application/json'
      },
    });

    console.log(`Gmail API response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gmail API error: ${response.status} - ${errorText}`);
      return { success: false, error: `Gmail API error: ${response.status}` };
    }

    const data = await response.json();
    console.log(`Gmail API response:`, {
      hasMessages: !!data.messages,
      messageCount: data.messages?.length || 0,
      resultSizeEstimate: data.resultSizeEstimate,
      nextPageToken: !!data.nextPageToken
    });
    
    if (!data.messages) {
      console.log('No messages found in Gmail inbox');
      return { success: true, messageCount: 0 };
    }

    let processedCount = 0;
    console.log(`📧 Processing ${Math.min(data.messages.length, 10)} messages from ${folder} for ${account.email_address}...`);

    for (const message of data.messages.slice(0, 10)) { // Limit to 10 for now
      try {
        console.log(`🔄 Processing message ID: ${message.id} (${processedCount + 1}/${Math.min(data.messages.length, 10)})`);
        
        // Get full message details
        const messageResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}`,
          {
            headers: { 
              Authorization: `Bearer ${account.access_token}`,
              'Content-Type': 'application/json'
            },
          }
        );

        if (!messageResponse.ok) {
          console.error(`Failed to fetch message ${message.id}: ${messageResponse.status}`);
          continue;
        }

        const fullMessage = await messageResponse.json();
        console.log(`Fetched message details for ${message.id}:`, {
          hasPayload: !!fullMessage.payload,
          hasHeaders: !!fullMessage.payload?.headers,
          threadId: fullMessage.threadId
        });
        
        // Check if message already exists
        const { data: existingMessage } = await supabaseClient
          .from('messages')
          .select('id')
          .eq('external_id', message.id)
          .single();

        if (existingMessage) {
          continue; // Skip if already processed
        }

        // Parse message data
        const headers = fullMessage.payload.headers;
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
        const from = headers.find((h: any) => h.name === 'From')?.value || '';
        const to = headers.find((h: any) => h.name === 'To')?.value || '';
        const messageId = headers.find((h: any) => h.name === 'Message-ID')?.value || '';
        const inReplyTo = headers.find((h: any) => h.name === 'In-Reply-To')?.value || '';
        const threadId = fullMessage.threadId;

        // Extract email content
        let content = '';
        if (fullMessage.payload.body?.data) {
          content = atob(fullMessage.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        } else if (fullMessage.payload.parts) {
          const textPart = fullMessage.payload.parts.find((part: any) => 
            part.mimeType === 'text/plain' || part.mimeType === 'text/html'
          );
          if (textPart?.body?.data) {
            content = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          }
        }

        // Determine sender type and extract relevant email
        const isFromAgent = folder === 'sent' || from.includes(account.email_address);
        const customerEmail = isFromAgent 
          ? (to.match(/<([^>]+)>/)?.[1] || to)
          : (from.match(/<([^>]+)>/)?.[1] || from);
        
        const senderType = isFromAgent ? 'agent' : 'customer';

        // Find or create customer
        let { data: customer } = await supabaseClient
          .from('customers')
          .select('id')
          .eq('email', customerEmail)
          .eq('organization_id', account.organization_id)
          .single();

        if (!customer) {
          const displayName = isFromAgent 
            ? to.replace(/<[^>]+>/, '').trim() || customerEmail
            : from.replace(/<[^>]+>/, '').trim() || customerEmail;
            
          const { data: newCustomer } = await supabaseClient
            .from('customers')
            .insert({
              organization_id: account.organization_id,
              email: customerEmail,
              full_name: displayName,
            })
            .select('id')
            .single();
          customer = newCustomer;
        }

        // Find existing conversation by threadId or inReplyTo
        let { data: conversation } = await supabaseClient
          .from('conversations')
          .select('id, subject')
          .eq('external_id', threadId)
          .eq('organization_id', account.organization_id)
          .single();

        // If no conversation found by threadId, try to find by Message-ID reference
        if (!conversation && inReplyTo) {
          const { data: referencedMessage } = await supabaseClient
            .from('messages')
            .select('conversation_id, conversation:conversations(id, subject)')
            .eq('email_message_id', inReplyTo)
            .single();
            
          if (referencedMessage?.conversation) {
            conversation = referencedMessage.conversation;
          }
        }

        if (!conversation) {
          const { data: newConversation } = await supabaseClient
            .from('conversations')
            .insert({
              organization_id: account.organization_id,
              email_account_id: account.id,
              customer_id: customer?.id,
              subject: subject.replace(/^Re:\s*/, ''), // Remove Re: prefix for clean subject
              external_id: threadId,
              channel: 'email',
              status: 'open',
            })
            .select('id')
            .single();
          conversation = newConversation;
        }

        // Create message
        console.log(`Inserting message for conversation ${conversation.id}: ${messageId}`);
        const { data: insertedMessage, error: insertError } = await supabaseClient
          .from('messages')
          .insert({
            conversation_id: conversation.id,
            content: content.substring(0, 10000), // Limit content length
            sender_type: senderType,
            external_id: message.id,
            email_message_id: messageId,
            email_thread_id: threadId,
            email_subject: subject,
            email_headers: headers,
            email_status: folder === 'sent' ? 'sent' : 'received'
          })
          .select('id')
          .single();

        if (insertError) {
          console.error(`Failed to insert message ${messageId}:`, insertError);
          throw insertError;
        } else {
          console.log(`Successfully inserted message ${insertedMessage.id} for conversation ${conversation.id}`);
        }

        processedCount++;
      } catch (error) {
        console.error(`Error processing message ${message.id}:`, error);
      }
    }

    return { success: true, messageCount: processedCount };
  } catch (error) {
    console.error('Error syncing Gmail messages:', error);
    return { success: false, error: error.message };
  }
}
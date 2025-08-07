import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Recursively finds the preferred text part (HTML or plain) from the payload.
 */
function findTextPart(part: any, preferredMime: string = 'text/html'): any {
  if (part.parts) {
    for (const subPart of part.parts) {
      const found = findTextPart(subPart, preferredMime);
      if (found) return found;
    }
  }
  if (part.mimeType === preferredMime || part.mimeType === 'text/plain') {
    return part;
  }
  return null;
}

/**
 * Decodes the email body from a Gmail API message object, handling base64url, charsets, and multipart.
 */
function getDecodedEmailContent(message: any): { content: string; contentType: string } {
  const payload = message.payload;
  if (!payload) return { content: '', contentType: 'text' };

  // Prefer HTML, fallback to plain text
  let part = findTextPart(payload, 'text/html');
  const isHtml = !!part;
  if (!part) part = findTextPart(payload, 'text/plain');
  if (!part || !part.body || !part.body.data) return { content: '', contentType: 'text' };

  // Extract charset from Content-Type header
  let charset = 'utf-8';
  const contentTypeHeader = part.headers?.find((h: any) => h.name.toLowerCase() === 'content-type');
  if (contentTypeHeader) {
    const match = contentTypeHeader.value.match(/charset=["']?([^"';]+)["']?/i);
    if (match) charset = match[1].toLowerCase();
  }

  // Decode base64url (Gmail-specific: replace -/+ , _// , add padding)
  let base64 = part.body.data.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }

  // Base64 to binary bytes
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  // Decode bytes using the charset (handles æøå, emojis, Chinese, etc.)
  try {
    const decoder = new TextDecoder(charset);
    const decodedContent = decoder.decode(bytes);
    return { 
      content: decodedContent, 
      contentType: isHtml ? 'html' : 'text' 
    };
  } catch (e) {
    console.warn(`Decoding failed with charset '${charset}', falling back to utf-8:`, e);
    const decoder = new TextDecoder('utf-8', { fatal: false, ignoreBOM: true });
    const decodedContent = decoder.decode(bytes);
    return { 
      content: decodedContent, 
      contentType: isHtml ? 'html' : 'text' 
    };
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  emailAccountId?: string;
  syncSent?: boolean;
  forceRedecode?: boolean;
  resetInbox?: boolean;
}

serve(async (req: Request) => {
  console.log('🚀 Gmail-sync function called at:', new Date().toISOString());
  
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

    // Check if this is a service role call (from cron job) by checking the request source
    const authHeader = req.headers.get('Authorization') || '';
    const userAgent = req.headers.get('User-Agent') || '';
    const isServiceRoleCall = userAgent.includes('pg_net') || authHeader.includes('Bearer ' + Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    
    console.log('🔐 Authentication check:', {
      isServiceRoleCall,
      userAgent,
      hasAuthHeader: !!authHeader
    });
    
    let user = null;
    if (!isServiceRoleCall) {
      const { data: { user: authUser } } = await supabaseClient.auth.getUser();
      if (!authUser) {
        console.log('❌ No authenticated user found for non-service call');
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      user = authUser;
      console.log('✅ Authenticated user:', user.id);
    } else {
      console.log('🤖 Service role call detected');
    }

    const { emailAccountId, syncSent = false, forceRedecode = false, resetInbox = false } = await req.json() as SyncRequest;

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

        // Reset inbox if requested
        if (resetInbox) {
          console.log(`🗑️ Resetting inbox for account: ${account.email_address}`);
          
          // First get all conversation IDs for this email account
          const { data: conversations } = await supabaseClient
            .from('conversations')
            .select('id')
            .eq('email_account_id', account.id);
          
          if (conversations && conversations.length > 0) {
            const conversationIds = conversations.map(c => c.id);
            
            // Delete messages from these conversations
            const { error: deleteError } = await supabaseClient
              .from('messages')
              .delete()
              .in('conversation_id', conversationIds);
            
            if (deleteError) {
              console.error('Error deleting existing messages:', deleteError);
            } else {
              console.log(`✅ Successfully deleted existing messages from ${conversationIds.length} conversations`);
            }
          }
        }

        // Sync emails from Gmail (inbox and optionally sent)
        const inboxResult = await syncGmailMessages(account, supabaseClient, 'inbox', forceRedecode || resetInbox, resetInbox);
        let sentResult = { success: true, messageCount: 0 };
        
        if (syncSent) {
          sentResult = await syncGmailMessages(account, supabaseClient, 'sent', forceRedecode || resetInbox, resetInbox);
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

async function syncGmailMessages(account: any, supabaseClient: any, folder: 'inbox' | 'sent' = 'inbox', forceRedecodeOrReset: boolean = false, resetInbox: boolean = false) {
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
        console.log(`🔍 Checking if message ${message.id} already exists...`);
        const { data: existingMessage, error: checkError } = await supabaseClient
          .from('messages')
          .select('id')
          .eq('external_id', message.id)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          console.error(`❌ Error checking for existing message:`, checkError);
        }

        // Check if message already exists (skip this check if we're in reset mode)
        if (!resetInbox && existingMessage) {
          console.log(`⏭️  Message ${message.id} already exists, skipping`);
          continue;
        }
        
        console.log(`✅ Processing message ${message.id}...`);

        // Parse message data
        const headers = fullMessage.payload.headers;
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
        const from = headers.find((h: any) => h.name === 'From')?.value || '';
        const to = headers.find((h: any) => h.name === 'To')?.value || '';
        const messageId = headers.find((h: any) => h.name === 'Message-ID')?.value || '';
        const inReplyTo = headers.find((h: any) => h.name === 'In-Reply-To')?.value || '';
        const threadId = fullMessage.threadId;

        // Extract email content with support for HTML and images
        let content = '';
        let contentType = 'text';
        let attachments: any[] = [];

        // Function to extract attachments and inline images
        const extractAttachments = (parts: any[]) => {
          const attachmentList: any[] = [];
          
          for (const part of parts) {
            if (part.filename && part.body?.attachmentId) {
              // Regular attachment
              attachmentList.push({
                filename: part.filename,
                mimeType: part.mimeType,
                attachmentId: part.body.attachmentId,
                size: part.body.size || 0,
                contentDisposition: part.headers?.find((h: any) => h.name === 'Content-Disposition')?.value
              });
            } else if (part.headers?.find((h: any) => h.name === 'Content-ID') && part.body?.attachmentId) {
              // Inline image
              const contentId = part.headers.find((h: any) => h.name === 'Content-ID')?.value?.replace(/[<>]/g, '');
              attachmentList.push({
                filename: part.filename || `image_${contentId}`,
                mimeType: part.mimeType,
                attachmentId: part.body.attachmentId,
                size: part.body.size || 0,
                contentId: contentId,
                isInline: true
              });
            }
            
            // Recursively process nested parts
            if (part.parts) {
              attachmentList.push(...extractAttachments(part.parts));
            }
          }
          
          return attachmentList;
        };

        // Use proper charset-aware decoding
        const decodedEmail = getDecodedEmailContent(fullMessage);
        content = decodedEmail.content;
        contentType = decodedEmail.contentType;
        
        // Extract attachments if there are parts
        if (fullMessage.payload.parts) {
          attachments = extractAttachments(fullMessage.payload.parts);
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

        // Create message (always create in reset mode, update in redecode mode)
        if (resetInbox || !existingMessage) {
          // Create new message
          console.log(`Inserting message for conversation ${conversation.id}: ${messageId}`);
          const { data: insertedMessage, error: insertError } = await supabaseClient
            .from('messages')
            .insert({
              conversation_id: conversation.id,
              content: content.substring(0, 50000),
              content_type: contentType,
              sender_type: senderType,
              external_id: message.id,
              email_message_id: messageId,
              email_thread_id: threadId,
              email_subject: subject,
              email_headers: headers,
              attachments: attachments,
              email_status: folder === 'sent' ? 'sent' : 'pending'
            })
            .select('id')
            .single();

          if (insertError) {
            console.error(`Failed to insert message ${messageId}:`, insertError);
            throw insertError;
          } else {
            console.log(`Successfully inserted message ${insertedMessage.id} for conversation ${conversation.id}`);
          }
        } else if (existingMessage && forceRedecodeOrReset) {
          // Update existing message with newly decoded content
          console.log(`Updating message ${message.id} with new decoding...`);
          const { error: updateError } = await supabaseClient
            .from('messages')
            .update({
              content: content.substring(0, 50000),
              content_type: contentType,
              email_headers: headers,
              attachments: attachments,
            })
            .eq('external_id', message.id);

          if (updateError) {
            console.error(`Failed to update message ${message.id}:`, updateError);
            throw updateError;
          } else {
            console.log(`Successfully updated message ${message.id} with new decoding`);
          }
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
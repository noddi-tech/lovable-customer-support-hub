import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify user
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { messageId, filename } = await req.json();
    if (!messageId || !filename) {
      return new Response(JSON.stringify({ error: 'messageId and filename required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[fetch-gmail-attachment] Fetching attachment "${filename}" for message ${messageId}`);

    // Get message with its conversation to find the Gmail account
    const { data: message, error: msgError } = await supabaseClient
      .from('messages')
      .select('id, external_id, attachments, conversation_id, conversations!inner(organization_id, email_account_id)')
      .eq('id', messageId)
      .single();

    if (msgError || !message) {
      console.error('[fetch-gmail-attachment] Message not found:', msgError);
      return new Response(JSON.stringify({ error: 'Message not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const gmailMessageId = message.external_id;
    if (!gmailMessageId) {
      return new Response(JSON.stringify({ error: 'Message has no Gmail ID (external_id)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const conv = (message as any).conversations;
    const emailAccountId = conv.email_account_id;
    const organizationId = conv.organization_id;

    if (!emailAccountId) {
      return new Response(JSON.stringify({ error: 'No email account linked to this conversation' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get Gmail account credentials
    const { data: account, error: accError } = await supabaseClient
      .from('email_accounts')
      .select('id, access_token, refresh_token, token_expires_at, email_address')
      .eq('id', emailAccountId)
      .single();

    if (accError || !account) {
      return new Response(JSON.stringify({ error: 'Email account not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Refresh token if expired
    let accessToken = account.access_token;
    if (new Date(account.token_expires_at) <= new Date()) {
      console.log('[fetch-gmail-attachment] Token expired, refreshing...');
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: "1072539713646-gvkvnmg9v5d15fttugh6om7safekmh4p.apps.googleusercontent.com",
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
          refresh_token: account.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      const tokens = await refreshResponse.json();
      if (!tokens.access_token) {
        console.error('[fetch-gmail-attachment] Token refresh failed:', tokens);
        return new Response(JSON.stringify({ error: 'Failed to refresh Gmail token' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      accessToken = tokens.access_token;
      await supabaseClient
        .from('email_accounts')
        .update({
          access_token: tokens.access_token,
          token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        })
        .eq('id', account.id);
    }

    // Find the attachment in the message's attachments array
    const attachments = Array.isArray(message.attachments) ? message.attachments : [];
    const attachment = attachments.find((a: any) => a.filename === filename);
    
    if (!attachment) {
      return new Response(JSON.stringify({ error: `Attachment "${filename}" not found in message data` }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!attachment.attachmentId) {
      return new Response(JSON.stringify({ error: 'Attachment has no Gmail attachment ID' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch binary from Gmail API
    console.log(`[fetch-gmail-attachment] Fetching from Gmail: message=${gmailMessageId}, attachment=${attachment.attachmentId}`);
    const attResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${gmailMessageId}/attachments/${attachment.attachmentId}`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    if (!attResponse.ok) {
      const errText = await attResponse.text();
      console.error(`[fetch-gmail-attachment] Gmail API error ${attResponse.status}:`, errText);
      return new Response(JSON.stringify({ error: `Gmail API error: ${attResponse.status}` }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const attData = await attResponse.json();
    if (!attData.data) {
      return new Response(JSON.stringify({ error: 'No data in Gmail attachment response' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Convert URL-safe base64 to standard base64, then to binary
    const base64 = attData.data.replace(/-/g, '+').replace(/_/g, '/');
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Upload to Supabase Storage
    const storageKey = `${organizationId}/gmail/${gmailMessageId}/${crypto.randomUUID()}_${filename}`;
    const { error: uploadError } = await supabaseClient.storage
      .from('message-attachments')
      .upload(storageKey, bytes, {
        contentType: attachment.mimeType || 'application/octet-stream',
        upsert: true,
      });

    if (uploadError) {
      console.error('[fetch-gmail-attachment] Storage upload failed:', uploadError);
      return new Response(JSON.stringify({ error: 'Failed to upload attachment to storage' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Backfill storageKey in message attachments
    const updatedAttachments = attachments.map((a: any) => 
      a.filename === filename ? { ...a, storageKey } : a
    );

    const { error: updateError } = await supabaseClient
      .from('messages')
      .update({ attachments: updatedAttachments })
      .eq('id', messageId);

    if (updateError) {
      console.warn('[fetch-gmail-attachment] Failed to update message attachments:', updateError);
    }

    console.log(`[fetch-gmail-attachment] Success! Uploaded ${filename} -> ${storageKey}`);

    // Return the file for immediate download
    return new Response(bytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': attachment.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[fetch-gmail-attachment] Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

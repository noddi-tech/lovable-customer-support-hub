import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to safely create a RFC 5322 Message-ID using the sender domain
function createMessageId(fromEmail: string) {
  const domain = fromEmail.split('@')[1] || 'mail.local';
  const id = (crypto as any).randomUUID?.() || Math.random().toString(36).slice(2);
  return `<msg-${id}@${domain}>`;
}

// Extract an email address from a "Name <email>" or bare "email" string
function extractEmail(s: string): string | null {
  const match = s.match(/<([^>]+)>/) || s.match(/([^\s,<>"]+@[^\s,<>"]+)/);
  return match ? match[1].trim().toLowerCase() : null;
}

// Parse a header value from raw email headers string
function parseHeaderValue(raw: string, headerName: string): string | null {
  const regex = new RegExp(`^${headerName}:\\s*(.+?)$`, 'mi');
  const match = raw.match(regex);
  if (!match) return null;
  // Handle folded headers (continuation lines starting with whitespace)
  let value = match[1];
  const lines = raw.split('\n');
  const idx = lines.findIndex(l => l.match(new RegExp(`^${headerName}:`, 'i')));
  if (idx >= 0) {
    for (let i = idx + 1; i < lines.length; i++) {
      if (lines[i].match(/^\s+/)) {
        value += ' ' + lines[i].trim();
      } else {
        break;
      }
    }
  }
  return value.trim();
}

// Extract CC recipients from conversation messages, excluding specified emails
function extractCcRecipients(messages: any[], excludeEmails: string[]): { email: string }[] {
  const seen = new Set(excludeEmails.map(e => e.toLowerCase()));
  const ccList: { email: string }[] = [];

  for (const msg of messages) {
    const headers = msg.email_headers;
    if (!headers) continue;

    let ccRaw = '';
    if (typeof headers.raw === 'string') {
      ccRaw = parseHeaderValue(headers.raw, 'Cc') || parseHeaderValue(headers.raw, 'CC') || '';
    } else if (typeof headers.cc === 'string') {
      ccRaw = headers.cc;
    } else if (typeof headers.Cc === 'string') {
      ccRaw = headers.Cc;
    }

    if (!ccRaw) continue;

    for (const part of ccRaw.split(',')) {
      const email = extractEmail(part.trim());
      if (email && !seen.has(email)) {
        seen.add(email);
        ccList.push({ email });
      }
    }
  }
  return ccList;
}


const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('send-reply-email (SendGrid) called');

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { messageId, replyAll = true } = await req.json();
    console.log('Processing message ID:', messageId);

    if (!messageId) throw new Error('Message ID is required');

    // Fetch message, conversation, customer and email account
    const { data: message, error: messageError } = await supabaseClient
      .from('messages')
      .select(`
        *,
        conversation:conversations(
          subject,
          organization_id,
          external_id,
          inbox_id,
          customer:customers(email, full_name),
          email_account:email_accounts(*)
        )
      `)
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      console.error('Error fetching message:', messageError);
      throw new Error('Message not found');
    }

    // Skip internal notes and clear their email_status
    if (message.is_internal) {
      console.log('Message is internal, skipping email send');
      await supabaseClient.from('messages').update({ email_status: null }).eq('id', messageId);
      return new Response(JSON.stringify({ success: true, skipped: 'internal_note' }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // For widget channel: only skip if visitor is actively in a live chat session
    const { data: convData } = await supabaseClient
      .from('conversations')
      .select('channel')
      .eq('id', message.conversation_id)
      .single();
    
    if (convData?.channel === 'widget') {
      // Check for an active chat session with a recent heartbeat (within 60s)
      const { data: chatSession } = await supabaseClient
        .from('widget_chat_sessions')
        .select('status, last_seen_at')
        .eq('conversation_id', message.conversation_id)
        .eq('status', 'active')
        .maybeSingle();
      
      const isActivelyLive = chatSession && chatSession.last_seen_at &&
        (new Date().getTime() - new Date(chatSession.last_seen_at).getTime() < 60000);
      
      if (isActivelyLive) {
        console.log('Widget conversation has active live chat session, skipping email send');
        return new Response(JSON.stringify({ success: true, skipped: 'active_live_chat' }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      console.log('Widget conversation is not actively live, proceeding with email send');
    }

    // Get sender (agent) info
  let senderInfo: { full_name?: string; email?: string } | null = null;
  if (message.sender_id) {
    const { data: sender } = await supabaseClient
      .from('profiles')
      .select('full_name, email')
      .eq('user_id', message.sender_id)
      .single();
    senderInfo = sender;
  }

  const customer = message.conversation?.customer;
  const emailAccount = message.conversation?.email_account;
  let fromEmail: string | null = null;
  let senderDisplayName: string | null = null;

  // Prefer the inbox's public group email from inbound route
  const inboxId = (message.conversation as any)?.inbox_id || null;
  if (inboxId) {
    const { data: inboundRoute } = await supabaseClient
      .from('inbound_routes')
      .select('group_email, sender_display_name')
      .eq('inbox_id', inboxId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .maybeSingle();
    fromEmail = inboundRoute?.group_email || null;
    senderDisplayName = inboundRoute?.sender_display_name || null;
  }

  // Priority 2: Check inbox for sender_display_name if not set by inbound route
  if (!senderDisplayName && inboxId) {
    const { data: inbox } = await supabaseClient
      .from('inboxes')
      .select('sender_display_name')
      .eq('id', inboxId)
      .maybeSingle();
    senderDisplayName = inbox?.sender_display_name || null;
  }

  // Priority 3: Use organization's sender_display_name or name as fallback
  if (!senderDisplayName) {
    const { data: organization } = await supabaseClient
      .from('organizations')
      .select('sender_display_name, name')
      .eq('id', message.conversation.organization_id)
      .single();
    senderDisplayName = organization?.sender_display_name || organization?.name || null;
  }

  // Priority 4: Use agent's full name
  if (!senderDisplayName && senderInfo?.full_name) {
    senderDisplayName = senderInfo.full_name;
  }

  // Final fallback for sender display name
  senderDisplayName = senderDisplayName || 'Support';

  console.log('Sender display name:', senderDisplayName);

    if (!customer?.email) throw new Error('Customer email not found');
    if (!fromEmail && !emailAccount?.email_address) throw new Error('Missing sending address (set inbound route public email or connect an email account)');

    // Load email template: prefer inbox-specific, fall back to org default
    let template: any = null;
    if (inboxId) {
      const { data: inboxTemplate } = await supabaseClient
        .from('email_templates')
        .select('*')
        .eq('organization_id', message.conversation.organization_id)
        .eq('template_type', 'conversation_reply')
        .eq('inbox_id', inboxId)
        .maybeSingle();
      template = inboxTemplate;
    }
    if (!template) {
      const { data: orgTemplate } = await supabaseClient
        .from('email_templates')
        .select('*')
        .eq('organization_id', message.conversation.organization_id)
        .eq('template_type', 'conversation_reply')
        .is('inbox_id', null)
        .eq('is_default', true)
        .maybeSingle();
      template = orgTemplate;
    }

    const templateSettings = template || {
      header_background_color: '#3B82F6',
      header_text_color: '#FFFFFF',
      header_content: '',
      footer_background_color: '#F8F9FA',
      footer_text_color: '#6B7280',
      footer_content: 'Best regards,<br>Support Team',
      body_background_color: '#FFFFFF',
      body_text_color: '#374151',
      signature_content: 'Best regards,<br>{{agent_name}}<br>Support Team',
      include_agent_name: true
    } as any;

    // Threading headers: build a proper References chain
    const conversationExternalId = (message.conversation as any)?.external_id || null;

    // Get the last customer message for In-Reply-To
    let inReplyToId: string | null = null;
    const { data: lastCustomer } = await supabaseClient
      .from('messages')
      .select('email_message_id')
      .eq('conversation_id', message.conversation_id)
      .eq('sender_type', 'customer')
      .not('email_message_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);
    inReplyToId = lastCustomer?.[0]?.email_message_id || null;

    // Fetch ALL previous email_message_ids for the full References chain
    const { data: allPrevMessages } = await supabaseClient
      .from('messages')
      .select('email_message_id, email_headers')
      .eq('conversation_id', message.conversation_id)
      .not('email_message_id', 'is', null)
      .neq('id', messageId)
      .order('created_at', { ascending: true });

    // Build References: conversation external_id first, then all previous message IDs
    const referencesChain: string[] = [];
    const seenRefs = new Set<string>();
    const addRef = (id: string) => {
      const normalized = id.startsWith('<') ? id : `<${id}>`;
      const clean = id.replace(/[<>]/g, '');
      if (clean && !seenRefs.has(clean)) {
        seenRefs.add(clean);
        referencesChain.push(normalized);
      }
    };
    // Add the conversation's original external_id first (thread root)
    if (conversationExternalId) addRef(conversationExternalId);
    // Add all previous message IDs
    if (allPrevMessages) {
      for (const m of allPrevMessages) {
        if (m.email_message_id) addRef(m.email_message_id);
      }
    }

    // Check if this is the first message (new conversation) or a reply
    const { count: previousMessageCount } = await supabaseClient
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', message.conversation_id);

    // Build signature
    let signature = templateSettings.signature_content || '';
    if (templateSettings.include_agent_name && senderInfo?.full_name) {
      signature = signature.replace('{{agent_name}}', senderInfo.full_name);
    } else {
      signature = signature.replace('{{agent_name}}', 'Support Team');
    }

    // Only add "Re:" prefix if there are previous messages (this is a reply)
    const subject = previousMessageCount && previousMessageCount > 1
      ? `Re: ${message.conversation.subject}`
      : message.conversation.subject;
    const fromEmailFinal = (fromEmail || (emailAccount?.email_address as string)) as string;
    let toEmail = customer.email as string;

    // Reply-To fallback: if customer email matches the inbox/route address (wrong attribution),
    // use the Reply-To from the original inbound message instead
    const normalizedTo = toEmail.toLowerCase().trim();
    const normalizedFrom = fromEmailFinal.toLowerCase().trim();
    if (normalizedTo === normalizedFrom || (fromEmail && normalizedTo === fromEmail.toLowerCase())) {
      // Customer email matches our sending address — likely misattributed. Check first message for Reply-To
      const { data: firstMsg } = await supabaseClient
        .from('messages')
        .select('email_headers')
        .eq('conversation_id', message.conversation_id)
        .eq('sender_type', 'customer')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      
      const rawHeaders = firstMsg?.email_headers?.raw || (typeof firstMsg?.email_headers === 'string' ? firstMsg?.email_headers : '');
      if (rawHeaders) {
        const replyToHeader = parseHeaderValue(rawHeaders, 'Reply-To');
        const replyToAddr = replyToHeader ? extractEmail(replyToHeader) : null;
        if (replyToAddr && replyToAddr.toLowerCase() !== normalizedTo) {
          console.log(`📧 Reply-To fallback: customer email ${toEmail} matches inbox, using Reply-To: ${replyToAddr}`);
          toEmail = replyToAddr;
        }
      }
    }

    // Build HTML content with optimized structure
    const emailHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #374151; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; }
    .content { padding: 20px; }
    .signature { margin-top: 20px; padding-top: 20px; border-top: 1px solid #E5E7EB; }
    .footer { margin-top: 20px; font-size: 12px; color: #6B7280; text-align: center; padding: 20px; }
  </style>
</head>
<body>
  <div class="container">
    ${templateSettings.header_content ? `<div style="background: ${templateSettings.header_background_color}; color: ${templateSettings.header_text_color}; padding: 20px; text-align: center;">${templateSettings.header_content}</div>` : ''}
    <div class="content">${String(message.content || '').replace(/\n/g, '<br>')}</div>
    ${signature ? `<div class="signature">${signature}</div>` : ''}
    ${templateSettings.footer_content ? `<div class="footer">${templateSettings.footer_content}</div>` : ''}
  </div>
</body>
</html>`;
    const plainText = String(message.content || '');

    // Monitor email size to prevent Gmail clipping (102KB limit)
    const estimatedSize = emailHTML.length + plainText.length + 2000; // +2KB for headers
    console.log(`📧 Email size: ${(estimatedSize/1024).toFixed(1)}KB (HTML: ${(emailHTML.length/1024).toFixed(1)}KB, Plain: ${(plainText.length/1024).toFixed(1)}KB)`);
    
    if (estimatedSize > 90000) {  // Warn at 90KB (before 102KB limit)
      console.warn(`⚠️ Email approaching Gmail clip threshold: ${(estimatedSize/1024).toFixed(1)}KB - consider simplifying content`);
    }

    // Compose SendGrid payload
    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    if (!SENDGRID_API_KEY) throw new Error('SENDGRID_API_KEY is not configured');

    // Process attachments from message metadata
    const sgAttachments: { content: string; filename: string; type: string; disposition: string }[] = [];
    if (message.attachments && Array.isArray(message.attachments)) {
      for (const att of message.attachments as any[]) {
        if (!att.storageKey) continue;
        try {
          const { data: fileData, error: dlError } = await supabaseClient.storage
            .from('message-attachments')
            .download(att.storageKey);
          if (dlError || !fileData) {
            console.warn('Failed to download attachment:', att.storageKey, dlError);
            continue;
          }
          const arrayBuffer = await fileData.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          sgAttachments.push({
            content: base64,
            filename: att.filename || 'attachment',
            type: att.mimeType || 'application/octet-stream',
            disposition: att.isInline ? 'inline' : 'attachment',
          });
        } catch (attErr) {
          console.warn('Error processing attachment:', att.storageKey, attErr);
        }
      }
    }

    const messageIdHeader = createMessageId(fromEmailFinal);
    const headers: Record<string, string> = {
      'Message-ID': messageIdHeader,
    };
    if (inReplyToId) {
      const normalized = inReplyToId.startsWith('<') ? inReplyToId : `<${inReplyToId}>`;
      headers['In-Reply-To'] = normalized;
    }
    // Use the full References chain instead of just In-Reply-To
    if (referencesChain.length > 0) {
      headers['References'] = referencesChain.join(' ');
    } else if (inReplyToId) {
      const normalized = inReplyToId.startsWith('<') ? inReplyToId : `<${inReplyToId}>`;
      headers['References'] = normalized;
    }

    // Extract CC recipients from conversation history for Reply All (only if replyAll is true)
    const ccRecipients = replyAll
      ? extractCcRecipients(allPrevMessages || [], [toEmail, fromEmailFinal])
      : [];
    if (ccRecipients.length > 0) {
      console.log('Reply All CC recipients:', ccRecipients.map(r => r.email).join(', '));
    }

    const sendgridBody = {
      personalizations: [
        {
          to: [{ email: toEmail, name: customer.full_name || undefined }],
          ...(ccRecipients.length > 0 ? { cc: ccRecipients } : {}),
        },
      ],
      from: { email: fromEmailFinal, name: senderDisplayName },
      reply_to: { email: fromEmailFinal },
      subject,
      content: [
        { type: 'text/plain', value: plainText },
        { type: 'text/html', value: emailHTML },
      ],
      headers,
      ...(sgAttachments.length > 0 ? { attachments: sgAttachments } : {}),
    } as any;

    console.log('Sending via SendGrid to:', toEmail, 'from:', fromEmailFinal);
    const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sendgridBody),
    });

    if (!(sgRes.status === 202)) {
      const errTxt = await sgRes.text();
      console.error('SendGrid error:', sgRes.status, errTxt);
      throw new Error(`SendGrid error ${sgRes.status}: ${errTxt}`);
    }

    // Build email headers object for storage
    const emailHeaders: Record<string, string> = {
      'Message-ID': messageIdHeader,
      'From': `${senderDisplayName} <${fromEmailFinal}>`,
      'To': customer.full_name ? `${customer.full_name} <${toEmail}>` : toEmail,
      'Subject': subject,
      ...(ccRecipients.length > 0 ? { 'Cc': ccRecipients.map(r => r.email).join(', ') } : {}),
    };
    if (inReplyToId) {
      const normalized = inReplyToId.startsWith('<') ? inReplyToId : `<${inReplyToId}>`;
      emailHeaders['In-Reply-To'] = normalized;
    }
    if (referencesChain.length > 0) {
      emailHeaders['References'] = referencesChain.join(' ');
    } else if (inReplyToId) {
      const normalized = inReplyToId.startsWith('<') ? inReplyToId : `<${inReplyToId}>`;
      emailHeaders['References'] = normalized;
    }

    // Update message as sent, store Message-ID, thread ID, and headers
    // IMPORTANT: Store original content, not wrapped HTML, to prevent exponential growth
    const { error: updateError } = await supabaseClient
      .from('messages')
      .update({
        email_status: 'sent',
        email_message_id: messageIdHeader.replace(/[<>]/g, ''),
        email_thread_id: conversationExternalId || undefined,
        content_type: 'html',
        content: message.content, // Keep original content, don't store wrapped HTML
        email_headers: emailHeaders,
      })
      .eq('id', messageId);

    if (updateError) console.warn('Failed to update message status:', updateError);

    // Update conversation received_at to move it to top of list after agent reply
    const { error: convUpdateError } = await supabaseClient
      .from('conversations')
      .update({ 
        received_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', message.conversation_id);
    
    if (convUpdateError) console.warn('Failed to update conversation received_at:', convUpdateError);

    return new Response(
      JSON.stringify({ success: true, sentTo: toEmail, sentFrom: fromEmailFinal, messageId: messageIdHeader }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error('Error in send-reply-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message, details: error.stack }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

Deno.serve(handler);

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

    const { messageId } = await req.json();
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

    // Skip internal notes
    if (message.is_internal) {
      console.log('Message is internal, skipping email send');
      return new Response(JSON.stringify({ success: true, skipped: 'internal_note' }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
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

    // Prefer the inbox's public group email from inbound route
    const inboxId = (message.conversation as any)?.inbox_id || null;
    if (inboxId) {
      const { data: inboundRoute } = await supabaseClient
        .from('inbound_routes')
        .select('group_email')
        .eq('inbox_id', inboxId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .maybeSingle();
      fromEmail = inboundRoute?.group_email || null;
    }

    if (!customer?.email) throw new Error('Customer email not found');
    if (!fromEmail && !emailAccount?.email_address) throw new Error('Missing sending address (set inbound route public email or connect an email account)');

    // Load org email template (optional)
    const { data: template } = await supabaseClient
      .from('email_templates')
      .select('*')
      .eq('organization_id', message.conversation.organization_id)
      .eq('is_default', true)
      .single();

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

    // Threading headers from last customer message if available
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

    // Build signature
    let signature = templateSettings.signature_content || '';
    if (templateSettings.include_agent_name && senderInfo?.full_name) {
      signature = signature.replace('{{agent_name}}', senderInfo.full_name);
    } else {
      signature = signature.replace('{{agent_name}}', 'Support Team');
    }

    const subject = `Re: ${message.conversation.subject}`;
    const fromEmailFinal = (fromEmail || (emailAccount?.email_address as string)) as string;
    const toEmail = customer.email as string;

    // Build HTML content
    const emailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: ${templateSettings.body_background_color};">
        ${templateSettings.header_content ? `
          <div style="background-color: ${templateSettings.header_background_color}; color: ${templateSettings.header_text_color}; padding: 20px; text-align: center;">
            ${templateSettings.header_content}
          </div>
        ` : ''}
        <div style="padding: 30px; color: ${templateSettings.body_text_color}; line-height: 1.6;">
          ${String(message.content || '').replace(/\n/g, '<br>')}
        </div>
        ${signature ? `
          <div style="padding: 20px 30px; margin-top: 20px;">
            <div style="border-top: 1px solid #E5E7EB; padding-top: 20px;">
              ${signature}
            </div>
          </div>
        ` : ''}
        ${templateSettings.footer_content ? `
          <div style="background-color: ${templateSettings.footer_background_color}; color: ${templateSettings.footer_text_color}; padding: 20px; text-align: center; font-size: 12px;">
            ${templateSettings.footer_content}
          </div>
        ` : ''}
      </div>
    `;
    const plainText = String(message.content || '');

    // Compose SendGrid payload
    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    if (!SENDGRID_API_KEY) throw new Error('SENDGRID_API_KEY is not configured');

    const messageIdHeader = createMessageId(fromEmailFinal);
    const headers: Record<string, string> = {
      'Message-ID': messageIdHeader,
    };
    if (inReplyToId) {
      const normalized = inReplyToId.startsWith('<') ? inReplyToId : `<${inReplyToId}>`;
      headers['In-Reply-To'] = normalized;
      headers['References'] = normalized;
    }

    const sendgridBody = {
      personalizations: [
        {
          to: [{ email: toEmail, name: customer.full_name || undefined }],
        },
      ],
      from: { email: fromEmailFinal, name: senderInfo?.full_name || 'Support' },
      reply_to: { email: fromEmailFinal },
      subject,
      content: [
        { type: 'text/plain', value: plainText },
        { type: 'text/html', value: emailHTML },
      ],
      headers,
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

    // Update message as sent, store Message-ID we generated
    const { error: updateError } = await supabaseClient
      .from('messages')
      .update({
        email_status: 'sent',
        email_message_id: messageIdHeader.replace(/[<>]/g, ''),
        content_type: 'html',
        content: emailHTML,
      })
      .eq('id', messageId);

    if (updateError) console.warn('Failed to update message status:', updateError);

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

serve(handler);

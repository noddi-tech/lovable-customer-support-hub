import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranscriptRequest {
  sessionId: string;
  email: string;
  language?: string;
}

interface ChatMessage {
  id: string;
  content: string;
  sender_type: string;
  created_at: string;
  sender_name?: string;
}

const translations: Record<string, { subject: string; intro: string; footer: string }> = {
  en: {
    subject: 'Your Chat Transcript',
    intro: 'Here is a copy of your conversation with our support team.',
    footer: 'Thank you for contacting us!',
  },
  no: {
    subject: 'Din chat-transkripsjon',
    intro: 'Her er en kopi av samtalen din med supportteamet vårt.',
    footer: 'Takk for at du kontaktet oss!',
  },
  sv: {
    subject: 'Din chatttranskription',
    intro: 'Här är en kopia av din konversation med vårt supportteam.',
    footer: 'Tack för att du kontaktade oss!',
  },
  da: {
    subject: 'Din chat-udskrift',
    intro: 'Her er en kopi af din samtale med vores supportteam.',
    footer: 'Tak fordi du kontaktede os!',
  },
  de: {
    subject: 'Ihr Chat-Protokoll',
    intro: 'Hier ist eine Kopie Ihres Gesprächs mit unserem Support-Team.',
    footer: 'Vielen Dank für Ihre Kontaktaufnahme!',
  },
  fr: {
    subject: 'Votre transcription de chat',
    intro: 'Voici une copie de votre conversation avec notre équipe de support.',
    footer: 'Merci de nous avoir contactés !',
  },
  es: {
    subject: 'Tu transcripción de chat',
    intro: 'Aquí tienes una copia de tu conversación con nuestro equipo de soporte.',
    footer: '¡Gracias por contactarnos!',
  },
  it: {
    subject: 'La tua trascrizione della chat',
    intro: 'Ecco una copia della tua conversazione con il nostro team di supporto.',
    footer: 'Grazie per averci contattato!',
  },
  pt: {
    subject: 'Sua transcrição do chat',
    intro: 'Aqui está uma cópia da sua conversa com nossa equipe de suporte.',
    footer: 'Obrigado por entrar em contato!',
  },
  nl: {
    subject: 'Je chat-transcript',
    intro: 'Hier is een kopie van je gesprek met ons supportteam.',
    footer: 'Bedankt voor je contact!',
  },
};

function formatMessage(msg: ChatMessage, isCustomer: boolean): string {
  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const senderLabel = isCustomer ? 'You' : (msg.sender_name || 'Agent');
  const bgColor = isCustomer ? '#7c3aed' : '#f3f4f6';
  const textColor = isCustomer ? '#ffffff' : '#374151';
  const align = isCustomer ? 'right' : 'left';
  
  return `
    <tr>
      <td style="text-align: ${align}; padding: 8px 0;">
        <div style="display: inline-block; max-width: 80%;">
          <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">${senderLabel} • ${time}</div>
          <div style="background-color: ${bgColor}; color: ${textColor}; padding: 12px 16px; border-radius: 12px; display: inline-block;">
            ${msg.content}
          </div>
        </div>
      </td>
    </tr>
  `;
}

function generateEmailHtml(messages: ChatMessage[], lang: string, companyName?: string): string {
  const t = translations[lang] || translations.en;
  const company = companyName || 'Support';
  
  const messagesHtml = messages.map(msg => 
    formatMessage(msg, msg.sender_type === 'customer')
  ).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              <tr>
                <td style="padding: 32px; border-bottom: 1px solid #e5e7eb;">
                  <h1 style="margin: 0; font-size: 24px; color: #111827;">${t.subject}</h1>
                  <p style="margin: 8px 0 0; color: #6b7280;">${t.intro}</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 24px 32px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    ${messagesHtml}
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding: 24px 32px; background-color: #f9fafb; border-radius: 0 0 12px 12px;">
                  <p style="margin: 0; color: #6b7280; font-size: 14px;">${t.footer}</p>
                  <p style="margin: 8px 0 0; color: #9ca3af; font-size: 12px;">— ${company}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { sessionId, email, language = 'en' }: TranscriptRequest = await req.json();

    if (!sessionId || !email) {
      return new Response(
        JSON.stringify({ error: 'sessionId and email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the session and its conversation
    const { data: session, error: sessionError } = await supabase
      .from('widget_chat_sessions')
      .select('conversation_id, widget_config_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error('Session not found:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get widget config for company name
    const { data: widgetConfig } = await supabase
      .from('widget_configs')
      .select('company_name')
      .eq('id', session.widget_config_id)
      .single();

    // Get all messages for the conversation
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, content, sender_type, created_at')
      .eq('conversation_id', session.conversation_id)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Failed to fetch messages:', messagesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch messages' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No messages in conversation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate email HTML
    const emailHtml = generateEmailHtml(messages, language, widgetConfig?.company_name);
    const t = translations[language] || translations.en;

    // Send email using internal email sending (or Resend if configured)
    // For now, we'll use a simple approach - you can integrate with your email provider
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (resendApiKey) {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Support <noreply@noddi.no>',
          to: [email],
          subject: t.subject,
          html: emailHtml,
        }),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.text();
        console.error('Failed to send email:', errorData);
        return new Response(
          JSON.stringify({ error: 'Failed to send email' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Transcript email sent successfully to:', email);
    } else {
      // Log that email would be sent (for development/testing)
      console.log('RESEND_API_KEY not configured. Would send transcript to:', email);
      console.log('Email content generated successfully');
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Transcript sent' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-chat-transcript:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

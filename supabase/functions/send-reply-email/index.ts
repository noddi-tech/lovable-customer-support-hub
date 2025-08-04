import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Send reply email function called');
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { messageId } = await req.json();
    console.log('Processing message ID:', messageId);

    if (!messageId) {
      throw new Error('Message ID is required');
    }

    // Get message details with conversation and customer info
    const { data: message, error: messageError } = await supabaseClient
      .from('messages')
      .select(`
        *,
        conversation:conversations(
          subject,
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

    console.log('Message data:', { 
      id: message.id, 
      conversationSubject: message.conversation?.subject,
      customerEmail: message.conversation?.customer?.email 
    });

    // Don't send email for internal notes
    if (message.is_internal) {
      console.log('Message is internal, skipping email send');
      return new Response(JSON.stringify({ success: true, skipped: 'internal_note' }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const customer = message.conversation?.customer;
    const emailAccount = message.conversation?.email_account;
    
    if (!customer?.email) {
      console.error('No customer email found');
      throw new Error('Customer email not found');
    }

    if (!emailAccount?.access_token) {
      console.error('No Gmail access token found');
      throw new Error('Gmail account not properly connected');
    }

    // Create email content in RFC 2822 format
    const subject = `Re: ${message.conversation.subject}`;
    const fromEmail = emailAccount.email_address;
    const toEmail = customer.email;
    
    const emailContent = [
      `From: ${fromEmail}`,
      `To: ${toEmail}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      `<div style="font-family: Arial, sans-serif; max-width: 600px;">`,
      `<p>Hello ${customer.full_name || 'there'},</p>`,
      `<div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">`,
      message.content.replace(/\n/g, '<br>'),
      `</div>`,
      `<p style="color: #666; font-size: 14px; margin-top: 30px;">`,
      `This email was sent in response to your message regarding: ${message.conversation.subject}`,
      `</p>`,
      `<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">`,
      `<p style="color: #888; font-size: 12px;">`,
      `Best regards,<br>Support Team`,
      `</p>`,
      `</div>`
    ].join('\r\n');

    // Encode email content in base64url format
    const encodedEmail = btoa(emailContent)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send email via Gmail API
    console.log('Sending email via Gmail API to:', toEmail, 'from:', fromEmail);
    
    const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${emailAccount.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedEmail
      })
    });

    if (!gmailResponse.ok) {
      const errorText = await gmailResponse.text();
      console.error('Gmail API error:', gmailResponse.status, errorText);
      
      // If token is expired, we might need to refresh it
      if (gmailResponse.status === 401) {
        throw new Error('Gmail access token expired. Please reconnect your Gmail account.');
      }
      
      throw new Error(`Gmail API error: ${gmailResponse.status} ${errorText}`);
    }

    const gmailResult = await gmailResponse.json();
    console.log('Email sent successfully via Gmail:', gmailResult);

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: gmailResult.id,
      sentTo: toEmail,
      sentFrom: fromEmail
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in send-reply-email function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
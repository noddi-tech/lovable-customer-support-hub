import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { Resend } from "npm:resend@2.0.0";

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

    // Initialize Resend client
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    if (!Deno.env.get("RESEND_API_KEY")) {
      console.error('RESEND_API_KEY not found');
      throw new Error('RESEND_API_KEY not configured');
    }

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
          email_account:email_accounts(email_address)
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
    const fromAccount = message.conversation?.email_account;
    
    if (!customer?.email) {
      console.error('No customer email found');
      throw new Error('Customer email not found');
    }

    if (!fromAccount?.email_address) {
      console.error('No from email account found');
      throw new Error('From email account not found');
    }

    // Send email using Resend
    console.log('Sending email to:', customer.email, 'from:', fromAccount.email_address);
    
    const emailResponse = await resend.emails.send({
      from: `${fromAccount.email_address}`, // Use the connected email account
      to: [customer.email],
      subject: `Re: ${message.conversation.subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <p>Hello ${customer.full_name || 'there'},</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            ${message.content.replace(/\n/g, '<br>')}
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            This email was sent in response to your message regarding: ${message.conversation.subject}
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          
          <p style="color: #888; font-size: 12px;">
            Best regards,<br>
            Support Team
          </p>
        </div>
      `,
    });

    console.log('Email sent successfully:', emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id,
      sentTo: customer.email 
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
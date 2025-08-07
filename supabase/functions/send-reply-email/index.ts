import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

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

    // Get message details with conversation, customer, and sender info  
    const { data: message, error: messageError } = await supabaseClient
      .from('messages')
      .select(`
        *,
        conversation:conversations(
          subject,
          organization_id,
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

    // Get sender info separately since there's no foreign key relationship
    let senderInfo = null;
    if (message.sender_id) {
      const { data: sender } = await supabaseClient
        .from('profiles')
        .select('full_name, email')
        .eq('user_id', message.sender_id)
        .single();
      
      senderInfo = sender;
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

    if (!emailAccount?.access_token || !emailAccount?.refresh_token) {
      console.error('No Gmail tokens found');
      throw new Error('Gmail account not properly connected');
    }

    // Check if token is expired and refresh if needed
    let accessToken = emailAccount.access_token;
    const tokenExpiry = new Date(emailAccount.token_expires_at);
    const now = new Date();
    
    if (tokenExpiry <= now) {
      console.log('Access token expired, refreshing...');
      
      const clientId = '1072539713646-gvkvnmg9v5d15fttugh6om7safekmh4p.apps.googleusercontent.com';
      const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '';
      
      console.log('Client ID available:', !!clientId);
      console.log('Client Secret available:', !!clientSecret);
      console.log('Client Secret length:', clientSecret.length);
      console.log('Refresh token available:', !!emailAccount.refresh_token);
      console.log('Refresh token length:', emailAccount.refresh_token?.length);
      
      if (!clientSecret) {
        console.error('GOOGLE_CLIENT_SECRET not found in environment variables');
        throw new Error('Google Client Secret not configured. Please check your edge function secrets.');
      }
      
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: emailAccount.refresh_token,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!refreshResponse.ok) {
        const errorText = await refreshResponse.text();
        console.error('Token refresh failed:', refreshResponse.status, errorText);
        throw new Error('Failed to refresh Gmail access token. Please reconnect your Gmail account.');
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;
      
      // Update the database with new token
      const newExpiryTime = new Date(Date.now() + (refreshData.expires_in * 1000));
      await supabaseClient
        .from('email_accounts')
        .update({ 
          access_token: accessToken,
          token_expires_at: newExpiryTime.toISOString()
        })
        .eq('id', emailAccount.id);
      
      console.log('Token refreshed successfully');
    }

    // Get email template for the organization
    const { data: template, error: templateError } = await supabaseClient
      .from('email_templates')
      .select('*')
      .eq('organization_id', message.conversation.organization_id)
      .eq('is_default', true)
      .single();

    if (templateError) {
      console.log('No template found, using default styling');
    }

    // Use template settings or defaults
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
    };

    // Replace placeholders in signature
    let signature = templateSettings.signature_content;
    if (templateSettings.include_agent_name && senderInfo?.full_name) {
      signature = signature.replace('{{agent_name}}', senderInfo.full_name);
    } else {
      signature = signature.replace('{{agent_name}}', 'Support Team');
    }

    // Create email content in RFC 2822 format (multipart/alternative)
    const subject = `Re: ${message.conversation.subject}`;
    const fromEmail = emailAccount.email_address;
    const toEmail = customer.email;
    
    // Build email HTML with custom template
    const emailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: ${templateSettings.body_background_color};">
        ${templateSettings.header_content ? `
          <div style="background-color: ${templateSettings.header_background_color}; color: ${templateSettings.header_text_color}; padding: 20px; text-align: center;">
            ${templateSettings.header_content}
          </div>
        ` : ''}
        
        <div style="padding: 30px; color: ${templateSettings.body_text_color}; line-height: 1.6;">
          ${message.content.replace(/\n/g, '<br>')}
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

    // Plain-text fallback
    const plainText = message.content || '';

    // Multipart boundary
    const boundary = `lovable-boundary-${(crypto as any).randomUUID?.() || Math.random().toString(36).slice(2)}`;

    const emailContent = [
      `From: ${fromEmail}`,
      `To: ${toEmail}`,
      `Subject: ${subject}`,
      `Reply-To: ${fromEmail}`,
      `Date: ${new Date().toUTCString()}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: 8bit',
      '',
      plainText,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      'Content-Transfer-Encoding: 8bit',
      '',
      emailHTML,
      '',
      `--${boundary}--`,
      ''
    ].join('\r\n');

    // Encode email content in base64url format (handle emojis and special characters)
    const encoder = new TextEncoder();
    const encodedBytes = encoder.encode(emailContent);
    
    // Convert to base64 safely for Unicode characters
    const base64String = btoa(
      Array.from(encodedBytes)
        .map(byte => String.fromCharCode(byte))
        .join('')
    );
    
    const encodedEmail = base64String
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send email via Gmail API
    console.log('Sending email via Gmail API to:', toEmail, 'from:', fromEmail);
    
    const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
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

    // Update message status to 'sent' in the database
    const { error: updateError } = await supabaseClient
      .from('messages')
      .update({ 
        email_status: 'sent',
        email_message_id: gmailResult.id // Store Gmail message ID
      })
      .eq('id', messageId);

    if (updateError) {
      console.error('Error updating message status:', updateError);
    }

    // Trigger email sync to capture the sent message
    console.log('Triggering email sync for account:', emailAccount.id);
    try {
      const syncResponse = await supabaseClient.functions.invoke('gmail-sync', {
        body: { emailAccountId: emailAccount.id, syncSent: true }
      });
      console.log('Sync triggered successfully:', syncResponse);
    } catch (syncError) {
      console.warn('Failed to trigger sync, but email was sent:', syncError);
    }

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
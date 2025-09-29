import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IncomingEmail {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  messageId: string;
  inReplyTo?: string;
  references?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const emailData: IncomingEmail = await req.json();
    console.log('Received email:', emailData);

    // Helper function to extract thread ID from email headers
    const getThreadId = (messageId: string, inReplyTo?: string, references?: string): string => {
      // Clean Message-ID by removing angle brackets
      const cleanId = (id: string) => id?.replace(/[<>]/g, '').trim();
      
      // If In-Reply-To exists, use it (points to immediate parent)
      if (inReplyTo) {
        console.log('Using In-Reply-To for thread ID:', inReplyTo);
        return cleanId(inReplyTo);
      }
      
      // Parse References header and use first Message-ID (thread root)
      if (references) {
        // Extract all Message-IDs from References using regex
        const messageIds = references.match(/<[^>]+>/g);
        if (messageIds && messageIds.length > 0) {
          console.log('Using first reference for thread ID:', messageIds[0]);
          return cleanId(messageIds[0]); // Use first (root) message ID
        }
      }
      
      // Fallback to current Message-ID for new threads
      console.log('Using Message-ID for new thread:', messageId);
      return cleanId(messageId);
    };

    // Extract the forwarding address from the 'to' field
    const forwardingAddress = emailData.to;
    
    // Find the email account by forwarding address
    const { data: emailAccount, error: accountError } = await supabaseClient
      .from('email_accounts')
      .select('*')
      .eq('forwarding_address', forwardingAddress)
      .eq('is_active', true)
      .single();

    if (accountError || !emailAccount) {
      console.error('Email account not found for forwarding address:', forwardingAddress);
      return new Response(JSON.stringify({ error: 'Email account not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract customer email from the 'from' field
    const customerEmail = emailData.from;
    const customerName = customerEmail.split('@')[0]; // Simple name extraction

    // Find or create customer
    let { data: customer, error: customerError } = await supabaseClient
      .from('customers')
      .select('*')
      .eq('email', customerEmail)
      .eq('organization_id', emailAccount.organization_id)
      .single();

    if (customerError && customerError.code === 'PGRST116') {
      // Customer doesn't exist, create new one
      const { data: newCustomer, error: createError } = await supabaseClient
        .from('customers')
        .insert({
          email: customerEmail,
          full_name: customerName,
          organization_id: emailAccount.organization_id,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating customer:', createError);
        return new Response(JSON.stringify({ error: 'Failed to create customer' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      customer = newCustomer;
    }

    // Generate thread ID using intelligent parsing
    const threadId = getThreadId(emailData.messageId, emailData.inReplyTo, emailData.references);
    
    console.log('Thread ID determination:', {
      messageId: emailData.messageId,
      inReplyTo: emailData.inReplyTo,
      references: emailData.references,
      resolvedThreadId: threadId,
      method: emailData.inReplyTo ? 'inReplyTo' : 
              (emailData.references ? 'references' : 'messageId')
    });

    // Find or create conversation
    let { data: conversation, error: conversationError } = await supabaseClient
      .from('conversations')
      .select('*')
      .eq('external_id', threadId)
      .eq('organization_id', emailAccount.organization_id)
      .single();

    if (conversationError && conversationError.code === 'PGRST116') {
      // Conversation doesn't exist, create new one
      const { data: newConversation, error: createConversationError } = await supabaseClient
        .from('conversations')
        .insert({
          subject: emailData.subject || 'No subject',
          external_id: threadId,
          organization_id: emailAccount.organization_id,
          customer_id: customer.id,
          email_account_id: emailAccount.id,
          inbox_id: emailAccount.inbox_id,
          channel: 'email',
          status: 'open',
          is_read: false,
        })
        .select()
        .single();

      if (createConversationError) {
        console.error('Error creating conversation:', createConversationError);
        return new Response(JSON.stringify({ error: 'Failed to create conversation' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      conversation = newConversation;
    }

    // Create message
    const { data: message, error: messageError } = await supabaseClient
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        content: emailData.text || emailData.html || '',
        sender_type: 'customer',
        email_message_id: emailData.messageId,
        email_thread_id: threadId,
        email_subject: emailData.subject,
        email_headers: {
          from: emailData.from,
          to: emailData.to,
          inReplyTo: emailData.inReplyTo,
          references: emailData.references,
        },
        content_type: emailData.html ? 'html' : 'text',
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error creating message:', messageError);
      return new Response(JSON.stringify({ error: 'Failed to create message' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Email processed successfully:', message.id);

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: message.id,
      conversationId: conversation.id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in email-webhook function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
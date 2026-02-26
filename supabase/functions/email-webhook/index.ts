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

Deno.serve(async (req: Request) => {
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

    // Helper: extract ALL Message-IDs from email headers for multi-ID lookup
    const extractAllIds = (messageId: string, inReplyTo?: string, references?: string): { helpScoutKey: string | null; allIds: string[] } => {
      const cleanId = (id: string) => id?.replace(/[<>]/g, '').trim();
      const helpScoutPattern = /reply-(\d+)-(\d+)(-\d+)?@helpscout\.net/;

      // Check HelpScout pattern across all headers
      for (const header of [messageId, inReplyTo, references]) {
        if (header) {
          const match = header.match(helpScoutPattern);
          if (match) {
            const key = `reply-${match[1]}-${match[2]}`;
            console.log('Detected HelpScout thread:', key);
            return { helpScoutKey: key, allIds: [key] };
          }
        }
      }

      const allIds: string[] = [];
      const seen = new Set<string>();
      const addId = (id: string) => {
        const cleaned = cleanId(id);
        if (cleaned && !seen.has(cleaned)) { seen.add(cleaned); allIds.push(cleaned); }
      };

      if (references) {
        const refIds = references.match(/<[^>]+>/g);
        if (refIds) refIds.forEach(addId);
        else addId(references);
      }
      if (inReplyTo) addId(inReplyTo);
      if (messageId) addId(messageId);

      return { helpScoutKey: null, allIds };
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
    const customerName = customerEmail.split('@')[0];

    // Find or create customer
    let { data: customer, error: customerError } = await supabaseClient
      .from('customers')
      .select('*')
      .eq('email', customerEmail)
      .eq('organization_id', emailAccount.organization_id)
      .single();

    if (customerError && customerError.code === 'PGRST116') {
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

    // Multi-ID thread lookup
    const { helpScoutKey, allIds } = extractAllIds(emailData.messageId, emailData.inReplyTo, emailData.references);
    let threadId: string;
    let conversation: any = null;

    if (helpScoutKey) {
      threadId = helpScoutKey;
      const { data: hsConv } = await supabaseClient
        .from('conversations').select('*')
        .eq('external_id', threadId)
        .eq('organization_id', emailAccount.organization_id)
        .maybeSingle();
      conversation = hsConv;
    } else if (allIds.length > 0) {
      threadId = allIds[0];
      console.log('Multi-ID lookup with', allIds.length, 'IDs:', allIds);

      // STEP 1: Check conversations.external_id
      const { data: convByExtId } = await supabaseClient
        .from('conversations').select('*')
        .in('external_id', allIds)
        .eq('organization_id', emailAccount.organization_id)
        .order('created_at', { ascending: true })
        .limit(1);

      if (convByExtId && convByExtId.length > 0) {
        conversation = convByExtId[0];
        console.log('Found conversation by external_id:', conversation.id);
      } else {
        // STEP 2: Check messages.email_message_id
        const { data: msgMatch } = await supabaseClient
          .from('messages')
          .select('conversation_id, conversation:conversations!inner(id, organization_id, subject, customer_id, email_account_id, inbox_id, channel, status, is_read, external_id)')
          .in('email_message_id', allIds)
          .limit(5);

        const orgMatch = (msgMatch as any[])?.find((m: any) => m.conversation?.organization_id === emailAccount.organization_id);
        if (orgMatch) {
          // Fetch the full conversation
          const { data: fullConv } = await supabaseClient
            .from('conversations').select('*').eq('id', orgMatch.conversation_id).single();
          conversation = fullConv;
          console.log('Found conversation by message email_message_id:', conversation?.id);
        }
      }
    } else {
      threadId = cleanId(emailData.messageId);
    }

    // Helper for cleaning IDs at top scope
    function cleanId(id: string) { return id?.replace(/[<>]/g, '').trim(); }

    if (!conversation) {
      // Create new conversation
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
    } else {
      // Existing conversation found - reopen it on customer reply
      await supabaseClient
        .from('conversations')
        .update({ status: 'open', is_read: false, updated_at: new Date().toISOString() })
        .eq('id', conversation.id);
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
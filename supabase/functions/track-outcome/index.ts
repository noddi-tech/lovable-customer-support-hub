import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Missing configuration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { conversationId, messageId } = await req.json();
    
    if (!conversationId || !messageId) {
      return new Response(JSON.stringify({ error: 'Missing conversationId or messageId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get the customer message and find the agent's previous response
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return new Response(JSON.stringify({ error: 'Failed to fetch messages' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find the current message and the previous agent response
    const currentMessageIndex = messages.findIndex(m => m.id === messageId);
    if (currentMessageIndex === -1) {
      return new Response(JSON.stringify({ error: 'Message not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const currentMessage = messages[currentMessageIndex];
    
    // Find the most recent agent message before this customer message
    let agentMessageId = null;
    for (let i = currentMessageIndex - 1; i >= 0; i--) {
      if (messages[i].direction === 'outbound') {
        agentMessageId = messages[i].id;
        break;
      }
    }

    if (!agentMessageId) {
      console.log('No prior agent message found, skipping outcome tracking');
      return new Response(JSON.stringify({ message: 'No prior agent message to track' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find the response tracking record for this agent message
    const { data: tracking, error: trackingError } = await supabase
      .from('response_tracking')
      .select('*')
      .eq('message_id', agentMessageId)
      .single();

    if (trackingError || !tracking) {
      console.log('No tracking record found for agent message:', agentMessageId);
      return new Response(JSON.stringify({ message: 'No tracking record found' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate reply time in seconds
    const agentMessageTime = new Date(messages.find(m => m.id === agentMessageId)?.created_at || 0);
    const customerReplyTime = new Date(currentMessage.created_at);
    const replyTimeSeconds = Math.floor((customerReplyTime.getTime() - agentMessageTime.getTime()) / 1000);

    // Check if conversation appears to be resolved (simple heuristic: positive sentiment words)
    const positiveWords = ['thank', 'thanks', 'perfect', 'great', 'solved', 'resolved', 'appreciate', 'helpful'];
    const messageText = currentMessage.content?.toLowerCase() || '';
    const conversationResolved = positiveWords.some(word => messageText.includes(word));

    // Insert outcome record
    const { error: outcomeError } = await supabase
      .from('response_outcomes')
      .insert({
        tracking_id: tracking.id,
        conversation_id: conversationId,
        customer_replied: true,
        reply_time_seconds: replyTimeSeconds,
        conversation_resolved: conversationResolved,
        customer_satisfaction_score: conversationResolved ? 5 : 3, // Simple heuristic
      });

    if (outcomeError) {
      console.error('Error inserting outcome:', outcomeError);
      return new Response(JSON.stringify({ error: 'Failed to insert outcome' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Outcome tracked successfully for tracking_id:', tracking.id);

    return new Response(JSON.stringify({ 
      success: true,
      tracking_id: tracking.id,
      reply_time_seconds: replyTimeSeconds,
      conversation_resolved: conversationResolved
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('track-outcome error', err);
    return new Response(JSON.stringify({ 
      error: 'Failed to track outcome', 
      detail: err instanceof Error ? err.message : String(err) 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

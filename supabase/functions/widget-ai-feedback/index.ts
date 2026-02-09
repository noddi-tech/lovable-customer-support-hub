import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { widgetKey, messageId, conversationId, rating, feedbackText } = await req.json();

    if (!widgetKey || !messageId || !conversationId || !['positive', 'negative'].includes(rating)) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get organization from widget key
    const { data: widget } = await supabase
      .from('widget_configs')
      .select('organization_id')
      .eq('widget_key', widgetKey)
      .single();

    if (!widget) {
      return new Response(JSON.stringify({ error: 'Widget not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert feedback
    const { error: feedbackError } = await supabase
      .from('widget_ai_feedback')
      .insert({
        message_id: messageId,
        conversation_id: conversationId,
        organization_id: widget.organization_id,
        rating,
        feedback_text: feedbackText || null,
      });

    if (feedbackError) {
      console.error('[widget-ai-feedback] Insert error:', feedbackError);
      return new Response(JSON.stringify({ error: 'Failed to save feedback' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update the message's feedback_rating
    await supabase
      .from('widget_ai_messages')
      .update({ feedback_rating: rating })
      .eq('id', messageId);

    // Auto-learning: if positive feedback, check if we should create a knowledge entry
    if (rating === 'positive') {
      try {
        await handleAutoLearning(supabase, messageId, conversationId, widget.organization_id);
      } catch (err) {
        console.error('[widget-ai-feedback] Auto-learning error:', err);
        // Don't fail the request
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[widget-ai-feedback] Error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleAutoLearning(
  supabase: any,
  messageId: string,
  conversationId: string,
  organizationId: string,
) {
  // Get the AI message that received positive feedback
  const { data: aiMessage } = await supabase
    .from('widget_ai_messages')
    .select('content, role, created_at')
    .eq('id', messageId)
    .single();

  if (!aiMessage || aiMessage.role !== 'assistant') return;

  // Get the preceding user message (the question)
  const { data: precedingMessages } = await supabase
    .from('widget_ai_messages')
    .select('content, role')
    .eq('conversation_id', conversationId)
    .eq('role', 'user')
    .lt('created_at', aiMessage.created_at)
    .order('created_at', { ascending: false })
    .limit(1);

  const userMessage = precedingMessages?.[0];
  if (!userMessage) return;

  // Check if a similar knowledge entry already exists (avoid duplicates)
  const { data: existing } = await supabase
    .from('knowledge_entries')
    .select('id')
    .eq('organization_id', organizationId)
    .ilike('customer_context', `%${userMessage.content.slice(0, 50)}%`)
    .limit(1);

  if (existing && existing.length > 0) return;

  // Create as pending entry for human review
  await supabase.from('knowledge_pending_entries').insert({
    organization_id: organizationId,
    customer_context: userMessage.content,
    agent_response: aiMessage.content,
    review_status: 'pending',
    source_conversation_id: conversationId,
    source_message_id: messageId,
    ai_quality_score: 0.8, // Thumbs-up implies quality
    suggested_tags: ['auto-learned', 'ai-feedback'],
  });

  console.log('[widget-ai-feedback] Created pending knowledge entry from positive feedback');
}

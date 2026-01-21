import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface StartChatRequest {
  action: 'start';
  widgetKey: string;
  visitorId: string;
  visitorName?: string;
  visitorEmail?: string;
  pageUrl?: string;
}

interface MessageRequest {
  action: 'message';
  sessionId: string;
  content: string;
}

interface EndChatRequest {
  action: 'end';
  sessionId: string;
}

interface TypingRequest {
  action: 'typing';
  sessionId: string;
  isTyping: boolean;
}

type ChatRequest = StartChatRequest | MessageRequest | EndChatRequest | TypingRequest;

// ========== Rate Limiting ==========
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(identifier: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimits.get(identifier);
  
  // Clean up old entries periodically
  if (rateLimits.size > 1000) {
    for (const [key, value] of rateLimits.entries()) {
      if (now > value.resetAt) {
        rateLimits.delete(key);
      }
    }
  }
  
  if (!record || now > record.resetAt) {
    rateLimits.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (record.count >= limit) {
    return false;
  }
  
  record.count++;
  return true;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Handle GET request for polling messages
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const sessionId = url.searchParams.get('sessionId');
      const since = url.searchParams.get('since');

      if (!sessionId) {
        return new Response(
          JSON.stringify({ error: 'Session ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Rate limit GET requests: 60 requests per minute per session
      if (!checkRateLimit(`get:${sessionId}`, 60, 60000)) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return await handleGetMessages(supabase, sessionId, since);
    }

    // Handle POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: ChatRequest = await req.json();

    switch (body.action) {
      case 'start':
        return await handleStartChat(supabase, body);
      case 'message':
        return await handleSendMessage(supabase, body);
      case 'end':
        return await handleEndChat(supabase, body);
      case 'typing':
        return await handleTyping(supabase, body);
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error in widget-chat:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleStartChat(supabase: any, data: StartChatRequest) {
  const { widgetKey, visitorId, visitorName, visitorEmail, pageUrl } = data;

  // Validate required fields
  if (!widgetKey || !visitorId) {
    return new Response(
      JSON.stringify({ error: 'Widget key and visitor ID are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Fetch widget configuration
  const { data: widgetConfig, error: configError } = await supabase
    .from('widget_configs')
    .select('id, inbox_id, organization_id, enable_chat')
    .eq('widget_key', widgetKey)
    .eq('is_active', true)
    .single();

  if (configError || !widgetConfig) {
    console.error('Widget config not found:', configError);
    return new Response(
      JSON.stringify({ error: 'Widget not found or inactive' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!widgetConfig.enable_chat) {
    return new Response(
      JSON.stringify({ error: 'Live chat is not enabled for this widget' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { inbox_id, organization_id } = widgetConfig;

  // Find or create customer
  let customerId: string | null = null;
  
  if (visitorEmail) {
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', visitorEmail.toLowerCase())
      .eq('organization_id', organization_id)
      .single();

    if (existingCustomer) {
      customerId = existingCustomer.id;
      
      // Update customer name if provided
      if (visitorName) {
        await supabase
          .from('customers')
          .update({ full_name: visitorName, updated_at: new Date().toISOString() })
          .eq('id', customerId);
      }
    } else {
      // Create new customer
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          email: visitorEmail.toLowerCase(),
          full_name: visitorName || null,
          organization_id,
        })
        .select('id')
        .single();

      if (!customerError && newCustomer) {
        customerId = newCustomer.id;
      }
    }
  }

  // Create conversation
  const { data: conversation, error: conversationError } = await supabase
    .from('conversations')
    .insert({
      organization_id,
      inbox_id,
      customer_id: customerId,
      channel: 'widget',
      subject: `Live chat from ${visitorName || visitorEmail || 'Visitor'}`,
      preview_text: 'Chat started...',
      status: 'open',
      priority: 'normal',
      is_read: false,
      received_at: new Date().toISOString(),
      metadata: {
        source: 'widget_chat',
        page_url: pageUrl,
        visitor_id: visitorId,
      },
    })
    .select('id')
    .single();

  if (conversationError || !conversation) {
    console.error('Error creating conversation:', conversationError);
    return new Response(
      JSON.stringify({ error: 'Failed to create conversation' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Create chat session
  const { data: chatSession, error: sessionError } = await supabase
    .from('widget_chat_sessions')
    .insert({
      conversation_id: conversation.id,
      widget_config_id: widgetConfig.id,
      visitor_id: visitorId,
      visitor_name: visitorName,
      visitor_email: visitorEmail?.toLowerCase(),
      status: 'waiting',
      metadata: { page_url: pageUrl },
    })
    .select('id, status, started_at')
    .single();

  if (sessionError || !chatSession) {
    console.error('Error creating chat session:', sessionError);
    return new Response(
      JSON.stringify({ error: 'Failed to create chat session' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      id: chatSession.id,
      conversationId: conversation.id,
      status: chatSession.status,
      startedAt: chatSession.started_at,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleSendMessage(supabase: any, data: MessageRequest) {
  const { sessionId, content } = data;

  if (!sessionId || !content?.trim()) {
    return new Response(
      JSON.stringify({ error: 'Session ID and content are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get session with visitor_id for rate limiting
  const { data: session, error: sessionError } = await supabase
    .from('widget_chat_sessions')
    .select('id, conversation_id, status, visitor_id')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return new Response(
      JSON.stringify({ error: 'Session not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (session.status === 'ended' || session.status === 'abandoned') {
    return new Response(
      JSON.stringify({ error: 'Chat session has ended' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Rate limit messages: 30 messages per minute per visitor
  if (!checkRateLimit(`msg:${session.visitor_id}`, 30, 60000)) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Please slow down.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Sanitize content (basic HTML escape)
  const sanitizedContent = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim();

  // Create message
  const { data: message, error: messageError } = await supabase
    .from('messages')
    .insert({
      conversation_id: session.conversation_id,
      content: sanitizedContent,
      sender_type: 'customer',
      content_type: 'text',
    })
    .select('id, content, sender_type, created_at')
    .single();

  if (messageError || !message) {
    console.error('Error creating message:', messageError);
    return new Response(
      JSON.stringify({ error: 'Failed to send message' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Update session last_message_at and conversation preview
  await Promise.all([
    supabase
      .from('widget_chat_sessions')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', sessionId),
    supabase
      .from('conversations')
      .update({ 
        preview_text: sanitizedContent.substring(0, 200),
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.conversation_id),
  ]);

  // Clear typing indicator
  await supabase
    .from('chat_typing_indicators')
    .delete()
    .eq('conversation_id', session.conversation_id)
    .not('user_id', 'is', null);

  return new Response(
    JSON.stringify({
      id: message.id,
      content: message.content,
      senderType: message.sender_type,
      createdAt: message.created_at,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleGetMessages(supabase: any, sessionId: string, since: string | null) {
  // Get session
  const { data: session, error: sessionError } = await supabase
    .from('widget_chat_sessions')
    .select('conversation_id, status, assigned_agent_id')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return new Response(
      JSON.stringify({ error: 'Session not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Fetch messages
  let query = supabase
    .from('messages')
    .select('id, content, sender_type, created_at, sender_id')
    .eq('conversation_id', session.conversation_id)
    .order('created_at', { ascending: true });

  if (since) {
    query = query.gt('created_at', since);
  }

  const { data: messages, error: messagesError } = await query;

  if (messagesError) {
    console.error('Error fetching messages:', messagesError);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch messages' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get agent name if assigned
  let agentName: string | null = null;
  if (session.assigned_agent_id) {
    const { data: agent } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', session.assigned_agent_id)
      .single();
    
    if (agent) {
      agentName = agent.full_name;
    }
  }

  // Check for agent typing
  const { data: typing } = await supabase
    .from('chat_typing_indicators')
    .select('is_typing')
    .eq('conversation_id', session.conversation_id)
    .not('user_id', 'is', null)
    .eq('is_typing', true)
    .maybeSingle();

  // Update last_seen_at
  await supabase
    .from('widget_chat_sessions')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', sessionId);

  return new Response(
    JSON.stringify({
      messages: messages.map((m: any) => ({
        id: m.id,
        content: m.content,
        senderType: m.sender_type,
        createdAt: m.created_at,
        senderName: m.sender_type === 'agent' ? agentName : undefined,
      })),
      status: session.status,
      agentTyping: typing?.is_typing || false,
      assignedAgentName: agentName,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleEndChat(supabase: any, data: EndChatRequest) {
  const { sessionId } = data;

  if (!sessionId) {
    return new Response(
      JSON.stringify({ error: 'Session ID required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { error } = await supabase
    .from('widget_chat_sessions')
    .update({ 
      status: 'ended',
      ended_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error) {
    console.error('Error ending chat:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to end chat' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleTyping(supabase: any, data: TypingRequest) {
  const { sessionId, isTyping } = data;

  if (!sessionId) {
    return new Response(
      JSON.stringify({ error: 'Session ID required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get session to get conversation_id and visitor_id
  const { data: session } = await supabase
    .from('widget_chat_sessions')
    .select('conversation_id, visitor_id')
    .eq('id', sessionId)
    .single();

  if (!session) {
    return new Response(
      JSON.stringify({ error: 'Session not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Upsert typing indicator
  await supabase
    .from('chat_typing_indicators')
    .upsert({
      conversation_id: session.conversation_id,
      visitor_id: session.visitor_id,
      is_typing: isTyping,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'conversation_id,visitor_id',
    });

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

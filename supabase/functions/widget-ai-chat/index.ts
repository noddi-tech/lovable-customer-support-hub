import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Simple in-memory rate limiter (per widget key, resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;

function isRateLimited(widgetKey: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(widgetKey);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(widgetKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

const API_BASE = (Deno.env.get("NODDI_API_BASE") || "https://api.noddi.co").replace(/\/+$/, "");

interface AiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface RequestBody {
  widgetKey: string;
  messages: AiMessage[];
  visitorPhone?: string;
  visitorEmail?: string;
  language?: string;
  test?: boolean;
  stream?: boolean;
  conversationId?: string;
}

// ========== Tool definitions for OpenAI ==========

const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'search_knowledge_base',
      description: 'Search the knowledge base for answers to customer questions about Noddi services, pricing, booking processes, etc.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query to find relevant knowledge base entries' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'lookup_customer',
      description: 'Look up a customer by phone number or email to find their account and bookings. Phone number is the primary identifier.',
      parameters: {
        type: 'object',
        properties: {
          phone: { type: 'string', description: 'Customer phone number (primary identifier)' },
          email: { type: 'string', description: 'Customer email (fallback identifier)' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_booking_details',
      description: 'Get detailed information about a specific booking by its ID.',
      parameters: {
        type: 'object',
        properties: {
          booking_id: { type: 'number', description: 'The Noddi booking ID' },
        },
        required: ['booking_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'reschedule_booking',
      description: 'Reschedule a booking to a new date/time. Requires the booking ID and the new desired date/time. Always confirm with the customer before calling this.',
      parameters: {
        type: 'object',
        properties: {
          booking_id: { type: 'number', description: 'The Noddi booking ID to reschedule' },
          new_date: { type: 'string', description: 'The new desired date/time in ISO 8601 format' },
        },
        required: ['booking_id', 'new_date'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'cancel_booking',
      description: 'Cancel a booking. Requires the booking ID. Always ask the customer to confirm before calling this - cancellations may not be reversible.',
      parameters: {
        type: 'object',
        properties: {
          booking_id: { type: 'number', description: 'The Noddi booking ID to cancel' },
          reason: { type: 'string', description: 'Optional cancellation reason from the customer' },
        },
        required: ['booking_id'],
      },
    },
  },
];

// ========== Tool execution functions ==========

async function executeSearchKnowledge(
  query: string,
  organizationId: string,
  supabase: any,
  openaiApiKey: string,
): Promise<string> {
  try {
    const embeddingResp = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: String(query).slice(0, 8000),
      }),
    });

    if (!embeddingResp.ok) {
      console.error('[widget-ai-chat] Embedding failed:', await embeddingResp.text());
      return JSON.stringify({ error: 'Search temporarily unavailable' });
    }

    const embeddingData = await embeddingResp.json();
    const embedding = embeddingData?.data?.[0]?.embedding;
    if (!embedding) {
      return JSON.stringify({ error: 'No embedding returned' });
    }

    const { data: results, error } = await supabase.rpc('find_similar_responses', {
      query_embedding: embedding,
      org_id: organizationId,
      match_threshold: 0.75,
      match_count: 5,
    });

    if (error) {
      console.error('[widget-ai-chat] Knowledge search error:', error);
      return JSON.stringify({ error: 'Search failed' });
    }

    if (!results || results.length === 0) {
      return JSON.stringify({ results: [], message: 'No relevant knowledge base entries found.' });
    }

    return JSON.stringify({
      results: results.map((r: any) => ({
        question: r.customer_context,
        answer: r.agent_response,
        category: r.category,
        similarity: r.similarity,
      })),
    });
  } catch (err) {
    console.error('[widget-ai-chat] Knowledge search error:', err);
    return JSON.stringify({ error: 'Search failed' });
  }
}

async function executeLookupCustomer(phone?: string, email?: string): Promise<string> {
  const noddiToken = Deno.env.get('NODDI_API_TOKEN');
  if (!noddiToken) return JSON.stringify({ error: 'Customer lookup not configured' });

  const headers: HeadersInit = {
    'Authorization': `Token ${noddiToken}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  try {
    let userData: any = null;

    if (phone) {
      const cleanPhone = phone.replace(/\s+/g, '').replace(/^(\+?47)?/, '+47');
      const resp = await fetch(`${API_BASE}/v1/users/get-by-phone-number/?phone_number=${encodeURIComponent(cleanPhone)}`, { headers });
      if (resp.ok) userData = await resp.json();
    }

    if (!userData && email) {
      const resp = await fetch(`${API_BASE}/v1/users/get-by-email/?email=${encodeURIComponent(email)}`, { headers });
      if (resp.ok) userData = await resp.json();
    }

    if (!userData) return JSON.stringify({ found: false, message: 'No customer found with the provided information.' });

    const userGroupId = userData.user_groups?.[0]?.id;
    let bookings: any[] = [];

    if (userGroupId) {
      const resp = await fetch(`${API_BASE}/v1/user-groups/${userGroupId}/bookings-for-customer/`, { headers });
      if (resp.ok) {
        const data = await resp.json();
        bookings = Array.isArray(data) ? data : (data.results || []);
      }
    }

    return JSON.stringify({
      found: true,
      customer: {
        name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
        email: userData.email,
        phone: userData.phone,
        userId: userData.id,
        userGroupId,
      },
      bookings: bookings.slice(0, 10).map((b: any) => ({
        id: b.id,
        status: b.status,
        scheduledAt: b.start_time || b.scheduled_at,
        services: b.order_lines?.map((ol: any) => ol.service_name || ol.name).filter(Boolean) || [],
        address: b.address?.full_address || b.address || null,
        vehicle: b.car ? `${b.car.make || ''} ${b.car.model || ''} (${b.car.license_plate || ''})`.trim() : null,
      })),
    });
  } catch (err) {
    console.error('[widget-ai-chat] Customer lookup error:', err);
    return JSON.stringify({ error: 'Customer lookup failed' });
  }
}

async function executeGetBookingDetails(bookingId: number): Promise<string> {
  const noddiToken = Deno.env.get('NODDI_API_TOKEN');
  if (!noddiToken) return JSON.stringify({ error: 'Booking lookup not configured' });

  try {
    const resp = await fetch(`${API_BASE}/v1/bookings/${bookingId}/`, {
      headers: { 'Authorization': `Token ${noddiToken}`, 'Accept': 'application/json' },
    });

    if (!resp.ok) {
      return JSON.stringify({ error: resp.status === 404 ? 'Booking not found' : `Booking lookup failed (${resp.status})` });
    }

    const booking = await resp.json();
    return JSON.stringify({
      id: booking.id,
      status: booking.status,
      scheduledAt: booking.start_time || booking.scheduled_at,
      endTime: booking.end_time,
      services: booking.order_lines?.map((ol: any) => ({ name: ol.service_name || ol.name, price: ol.price })) || [],
      address: booking.address?.full_address || booking.address || null,
      vehicle: booking.car ? { make: booking.car.make, model: booking.car.model, licensePlate: booking.car.license_plate, year: booking.car.year } : null,
      totalPrice: booking.total_price,
      notes: booking.customer_notes || null,
    });
  } catch (err) {
    console.error('[widget-ai-chat] Booking details error:', err);
    return JSON.stringify({ error: 'Failed to fetch booking details' });
  }
}

async function executeRescheduleBooking(bookingId: number, newDate: string): Promise<string> {
  const noddiToken = Deno.env.get('NODDI_API_TOKEN');
  if (!noddiToken) return JSON.stringify({ error: 'Booking modification not configured' });

  try {
    const resp = await fetch(`${API_BASE}/v1/bookings/${bookingId}/reschedule/`, {
      method: 'POST',
      headers: { 'Authorization': `Token ${noddiToken}`, 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_start_time: newDate }),
    });

    if (!resp.ok) {
      const errorBody = await resp.text();
      console.error('[widget-ai-chat] Reschedule failed:', resp.status, errorBody);
      if (resp.status === 404) return JSON.stringify({ success: false, error: 'Booking not found' });
      if (resp.status === 400) return JSON.stringify({ success: false, error: 'The requested time slot is not available. Please try a different time.' });
      return JSON.stringify({ success: false, error: 'Rescheduling failed. Please try again or contact support.' });
    }

    const data = await resp.json();
    return JSON.stringify({
      success: true,
      message: 'Booking rescheduled successfully',
      newScheduledAt: data.start_time || data.scheduled_at || newDate,
    });
  } catch (err) {
    console.error('[widget-ai-chat] Reschedule error:', err);
    return JSON.stringify({ success: false, error: 'Rescheduling failed' });
  }
}

async function executeCancelBooking(bookingId: number, reason?: string): Promise<string> {
  const noddiToken = Deno.env.get('NODDI_API_TOKEN');
  if (!noddiToken) return JSON.stringify({ error: 'Booking modification not configured' });

  try {
    const body: any = {};
    if (reason) body.cancellation_reason = reason;

    const resp = await fetch(`${API_BASE}/v1/bookings/${bookingId}/cancel/`, {
      method: 'POST',
      headers: { 'Authorization': `Token ${noddiToken}`, 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errorBody = await resp.text();
      console.error('[widget-ai-chat] Cancel failed:', resp.status, errorBody);
      if (resp.status === 404) return JSON.stringify({ success: false, error: 'Booking not found' });
      if (resp.status === 400) return JSON.stringify({ success: false, error: 'This booking cannot be cancelled. It may already be completed or cancelled.' });
      return JSON.stringify({ success: false, error: 'Cancellation failed. Please contact support.' });
    }

    return JSON.stringify({ success: true, message: 'Booking cancelled successfully' });
  } catch (err) {
    console.error('[widget-ai-chat] Cancel error:', err);
    return JSON.stringify({ success: false, error: 'Cancellation failed' });
  }
}

// ========== System prompt ==========

function buildSystemPrompt(language: string): string {
  const langInstruction = language === 'no' || language === 'nb' || language === 'nn'
    ? 'Respond in Norwegian (bokmål). Match the customer\'s language.'
    : `Respond in the same language as the customer. The widget is set to language code: ${language}.`;

  return `You are Noddi's AI customer assistant. You help customers with questions about Noddi's services (mobile car wash, tire change, tire storage, etc.) and help them look up and manage their bookings.

${langInstruction}

RULES:
1. Be friendly, helpful, and concise. Use a warm, professional tone.
2. NEVER invent or fabricate booking data, prices, or service details. Only share information returned by the tools.
3. When a customer asks about their bookings, ask for their phone number first (it's the primary identifier in Noddi's system).
4. Use the search_knowledge_base tool to answer general questions about services, pricing, processes, etc.
5. Use the lookup_customer tool when the customer provides their phone number or email to find their bookings.
6. Use get_booking_details for detailed information about a specific booking.
7. For rescheduling: ALWAYS confirm the new date/time with the customer before calling reschedule_booking. Show them what will change.
8. For cancellations: ALWAYS ask the customer to explicitly confirm they want to cancel. Warn that cancellations may not be reversible.
9. If you cannot answer a question, suggest the customer talk to a human agent or send a message.
10. Format booking information clearly with dates, services, and status.
11. Never ask for sensitive information like passwords or payment details.
12. If the customer seems frustrated or the issue is complex, suggest speaking with a human agent.
13. Keep responses focused and not too long. Use bullet points for lists.
14. You can use emojis sparingly to be friendly.`;
}

// ========== Tool executor ==========

async function executeTool(
  toolName: string,
  args: any,
  organizationId: string,
  supabase: any,
  openaiApiKey: string,
  visitorPhone?: string,
  visitorEmail?: string,
): Promise<string> {
  switch (toolName) {
    case 'search_knowledge_base':
      return executeSearchKnowledge(args.query, organizationId, supabase, openaiApiKey);
    case 'lookup_customer':
      return executeLookupCustomer(args.phone || visitorPhone, args.email || visitorEmail);
    case 'get_booking_details':
      return executeGetBookingDetails(args.booking_id);
    case 'reschedule_booking':
      return executeRescheduleBooking(args.booking_id, args.new_date);
    case 'cancel_booking':
      return executeCancelBooking(args.booking_id, args.reason);
    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

// ========== Persistence helpers ==========

async function getOrCreateConversation(
  supabase: any,
  conversationId: string | undefined,
  organizationId: string,
  widgetConfigId: string,
  visitorPhone?: string,
  visitorEmail?: string,
  isTest?: boolean,
): Promise<string | null> {
  if (isTest) return null; // Don't persist test conversations

  if (conversationId) {
    // Verify it exists
    const { data } = await supabase
      .from('widget_ai_conversations')
      .select('id')
      .eq('id', conversationId)
      .single();
    if (data) return data.id;
  }

  // Create new
  const { data, error } = await supabase
    .from('widget_ai_conversations')
    .insert({
      organization_id: organizationId,
      widget_config_id: widgetConfigId,
      visitor_phone: visitorPhone || null,
      visitor_email: visitorEmail || null,
      status: 'active',
    })
    .select('id')
    .single();

  if (error) {
    console.error('[widget-ai-chat] Failed to create conversation:', error);
    return null;
  }
  return data.id;
}

async function saveMessage(
  supabase: any,
  conversationId: string | null,
  role: string,
  content: string,
  toolsUsed?: string[],
) {
  if (!conversationId) return;
  try {
    await supabase.from('widget_ai_messages').insert({
      conversation_id: conversationId,
      role,
      content,
      tools_used: toolsUsed || [],
    });
    // Update message count
    await supabase.rpc('', {}).catch(() => {}); // no-op, we'll use a simpler approach
    await supabase
      .from('widget_ai_conversations')
      .update({ message_count: undefined, updated_at: new Date().toISOString() })
      .eq('id', conversationId);
  } catch { /* best effort */ }
}

async function updateConversationMeta(
  supabase: any,
  conversationId: string | null,
  toolsUsed: string[],
) {
  if (!conversationId || toolsUsed.length === 0) return;
  try {
    // Append unique tools used
    const { data: conv } = await supabase
      .from('widget_ai_conversations')
      .select('tools_used')
      .eq('id', conversationId)
      .single();
    
    const existing = conv?.tools_used || [];
    const merged = [...new Set([...existing, ...toolsUsed])];
    
    await supabase
      .from('widget_ai_conversations')
      .update({ tools_used: merged })
      .eq('id', conversationId);
  } catch { /* best effort */ }
}

// ========== Main handler ==========

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI chat not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body: RequestBody = await req.json();
    const { widgetKey, messages, visitorPhone, visitorEmail, language = 'no', stream = false, test = false, conversationId } = body;

    if (!widgetKey || !messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'widgetKey and messages are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (isRateLimited(widgetKey)) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please wait a moment.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Validate widget key and get organization
    const { data: widgetConfig, error: configError } = await supabase
      .from('widget_configs')
      .select('id, organization_id, is_active')
      .eq('widget_key', widgetKey)
      .eq('is_active', true)
      .single();

    if (configError || !widgetConfig) {
      return new Response(
        JSON.stringify({ error: 'Widget not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const organizationId = widgetConfig.organization_id;

    // Create/get conversation for persistence
    const dbConversationId = await getOrCreateConversation(
      supabase, conversationId, organizationId, widgetConfig.id,
      visitorPhone, visitorEmail, test,
    );

    // Save user message
    const lastUserMsg = messages[messages.length - 1];
    if (lastUserMsg?.role === 'user') {
      await saveMessage(supabase, dbConversationId, 'user', lastUserMsg.content);
    }

    // Build conversation with system prompt
    const systemPrompt = buildSystemPrompt(language);
    const conversationMessages: any[] = [
      { role: 'system', content: systemPrompt },
    ];

    if (visitorPhone || visitorEmail) {
      const parts: string[] = [];
      if (visitorPhone) parts.push(`phone: ${visitorPhone}`);
      if (visitorEmail) parts.push(`email: ${visitorEmail}`);
      conversationMessages.push({
        role: 'system',
        content: `The customer has identified themselves with: ${parts.join(', ')}. You can use this to look up their account when relevant.`,
      });
    }

    conversationMessages.push(...messages.map((m) => ({ role: m.role, content: m.content })));

    // Tool-calling loop (non-streaming phase — resolve all tool calls first)
    let currentMessages = [...conversationMessages];
    let maxIterations = 5;
    const allToolsUsed: string[] = [];

    while (maxIterations > 0) {
      maxIterations--;

      const chatResp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: currentMessages,
          tools,
          tool_choice: 'auto',
          temperature: 0.7,
          max_tokens: 1024,
          stream: false, // Tool-calling phase is always non-streaming
        }),
      });

      if (!chatResp.ok) {
        const errorText = await chatResp.text();
        console.error('[widget-ai-chat] OpenAI error:', chatResp.status, errorText);
        return new Response(
          JSON.stringify({ error: 'AI service temporarily unavailable' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const chatData = await chatResp.json();
      const choice = chatData.choices?.[0];
      if (!choice) {
        return new Response(
          JSON.stringify({ error: 'No response from AI' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const assistantMessage = choice.message;

      // If no tool calls, we have the final answer
      if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
        const reply = assistantMessage.content || 'I apologize, I was unable to generate a response.';

        // Save assistant reply & update conversation meta
        await saveMessage(supabase, dbConversationId, 'assistant', reply, allToolsUsed);
        await updateConversationMeta(supabase, dbConversationId, allToolsUsed);

        // If streaming requested and we have the final text, stream it via SSE
        if (stream) {
          return streamTextResponse(reply, dbConversationId);
        }

        return new Response(
          JSON.stringify({ reply, conversationId: dbConversationId }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // Execute tool calls
      currentMessages.push(assistantMessage);

      for (const toolCall of assistantMessage.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        allToolsUsed.push(toolCall.function.name);

        const result = await executeTool(
          toolCall.function.name, args, organizationId, supabase, OPENAI_API_KEY,
          visitorPhone, visitorEmail,
        );

        currentMessages.push({
          role: 'tool',
          content: result,
          tool_call_id: toolCall.id,
        });
      }
    }

    // Exhausted iterations
    const fallback = 'I apologize, but I need a moment. Could you please try rephrasing your question?';
    await saveMessage(supabase, dbConversationId, 'assistant', fallback);

    return new Response(
      JSON.stringify({ reply: fallback, conversationId: dbConversationId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[widget-ai-chat] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

// Stream the final reply text as SSE events
function streamTextResponse(text: string, conversationId: string | null): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send conversationId first
      if (conversationId) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'meta', conversationId })}\n\n`));
      }

      // Stream text in small chunks for a natural typing effect
      const words = text.split(/(\s+)/);
      let i = 0;
      const chunkSize = 3; // Send 3 words at a time

      const interval = setInterval(() => {
        if (i >= words.length) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
          controller.close();
          clearInterval(interval);
          return;
        }
        const chunk = words.slice(i, i + chunkSize).join('');
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'token', content: chunk })}\n\n`));
        i += chunkSize;
      }, 30);
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

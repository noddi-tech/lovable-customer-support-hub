import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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
];

// ========== Tool execution functions ==========

async function executeSearchKnowledge(
  query: string,
  organizationId: string,
  supabase: any,
  openaiApiKey: string,
): Promise<string> {
  try {
    // Generate embedding
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
      target_organization_id: organizationId,
      match_limit: 5,
    });

    if (error) {
      console.error('[widget-ai-chat] Knowledge search error:', error);
      return JSON.stringify({ error: 'Search failed' });
    }

    if (!results || results.length === 0) {
      return JSON.stringify({ results: [], message: 'No relevant knowledge base entries found.' });
    }

    const formatted = results.map((r: any) => ({
      question: r.customer_context,
      answer: r.agent_response,
      category: r.category,
      similarity: r.similarity,
    }));

    return JSON.stringify({ results: formatted });
  } catch (err) {
    console.error('[widget-ai-chat] Knowledge search error:', err);
    return JSON.stringify({ error: 'Search failed' });
  }
}

async function executeLookupCustomer(
  phone?: string,
  email?: string,
): Promise<string> {
  const noddiToken = Deno.env.get('NODDI_API_TOKEN');
  if (!noddiToken) {
    return JSON.stringify({ error: 'Customer lookup not configured' });
  }

  const headers: HeadersInit = {
    'Authorization': `Token ${noddiToken}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  try {
    let userData: any = null;

    // Try phone first (primary identifier)
    if (phone) {
      const cleanPhone = phone.replace(/\s+/g, '').replace(/^(\+?47)?/, '+47');
      const phoneResp = await fetch(`${API_BASE}/v1/users/get-by-phone-number/?phone_number=${encodeURIComponent(cleanPhone)}`, {
        headers,
      });
      if (phoneResp.ok) {
        userData = await phoneResp.json();
      } else {
        console.log('[widget-ai-chat] Phone lookup returned:', phoneResp.status);
      }
    }

    // Fallback to email
    if (!userData && email) {
      const emailResp = await fetch(`${API_BASE}/v1/users/get-by-email/?email=${encodeURIComponent(email)}`, {
        headers,
      });
      if (emailResp.ok) {
        userData = await emailResp.json();
      } else {
        console.log('[widget-ai-chat] Email lookup returned:', emailResp.status);
      }
    }

    if (!userData) {
      return JSON.stringify({ found: false, message: 'No customer found with the provided information.' });
    }

    // Get user group id for booking lookup
    const userGroupId = userData.user_groups?.[0]?.id;
    let bookings: any[] = [];

    if (userGroupId) {
      const bookingsResp = await fetch(
        `${API_BASE}/v1/user-groups/${userGroupId}/bookings-for-customer/`,
        { headers },
      );
      if (bookingsResp.ok) {
        const bookingsData = await bookingsResp.json();
        bookings = Array.isArray(bookingsData) ? bookingsData : (bookingsData.results || []);
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
  if (!noddiToken) {
    return JSON.stringify({ error: 'Booking lookup not configured' });
  }

  try {
    const resp = await fetch(`${API_BASE}/v1/bookings/${bookingId}/`, {
      headers: {
        'Authorization': `Token ${noddiToken}`,
        'Accept': 'application/json',
      },
    });

    if (!resp.ok) {
      if (resp.status === 404) {
        return JSON.stringify({ error: 'Booking not found' });
      }
      return JSON.stringify({ error: `Booking lookup failed (${resp.status})` });
    }

    const booking = await resp.json();

    return JSON.stringify({
      id: booking.id,
      status: booking.status,
      scheduledAt: booking.start_time || booking.scheduled_at,
      endTime: booking.end_time,
      services: booking.order_lines?.map((ol: any) => ({
        name: ol.service_name || ol.name,
        price: ol.price,
      })) || [],
      address: booking.address?.full_address || booking.address || null,
      vehicle: booking.car ? {
        make: booking.car.make,
        model: booking.car.model,
        licensePlate: booking.car.license_plate,
        year: booking.car.year,
      } : null,
      totalPrice: booking.total_price,
      notes: booking.customer_notes || null,
    });
  } catch (err) {
    console.error('[widget-ai-chat] Booking details error:', err);
    return JSON.stringify({ error: 'Failed to fetch booking details' });
  }
}

// ========== System prompt ==========

function buildSystemPrompt(language: string): string {
  const langInstruction = language === 'no' || language === 'nb' || language === 'nn'
    ? 'Respond in Norwegian (bokmål). Match the customer\'s language.'
    : `Respond in the same language as the customer. The widget is set to language code: ${language}.`;

  return `You are Noddi's AI customer assistant. You help customers with questions about Noddi's services (mobile car wash, tire change, tire storage, etc.) and help them look up their bookings.

${langInstruction}

RULES:
1. Be friendly, helpful, and concise. Use a warm, professional tone.
2. NEVER invent or fabricate booking data, prices, or service details. Only share information returned by the tools.
3. When a customer asks about their bookings, ask for their phone number first (it's the primary identifier in Noddi's system).
4. Use the search_knowledge_base tool to answer general questions about services, pricing, processes, etc.
5. Use the lookup_customer tool when the customer provides their phone number or email to find their bookings.
6. Use get_booking_details for detailed information about a specific booking.
7. If you cannot answer a question, suggest the customer talk to a human agent or send a message.
8. Format booking information clearly with dates, services, and status.
9. Never ask for sensitive information like passwords or payment details.
10. If the customer seems frustrated or the issue is complex, suggest speaking with a human agent.
11. Keep responses focused and not too long. Use bullet points for lists.
12. You can use emojis sparingly to be friendly.`;
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
      console.error('[widget-ai-chat] Missing required configuration');
      return new Response(
        JSON.stringify({ error: 'AI chat not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body: RequestBody = await req.json();
    const { widgetKey, messages, visitorPhone, visitorEmail, language = 'no' } = body;

    if (!widgetKey || !messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'widgetKey and messages are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Validate widget key and get organization
    const { data: widgetConfig, error: configError } = await supabase
      .from('widget_configs')
      .select('organization_id, is_active')
      .eq('widget_key', widgetKey)
      .eq('is_active', true)
      .single();

    if (configError || !widgetConfig) {
      return new Response(
        JSON.stringify({ error: 'Widget not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { organization_id: organizationId } = widgetConfig;

    // Build the conversation with system prompt
    const systemPrompt = buildSystemPrompt(language);
    const conversationMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    // If visitor provided phone/email, inject it as context
    if (visitorPhone || visitorEmail) {
      const contextParts: string[] = [];
      if (visitorPhone) contextParts.push(`phone: ${visitorPhone}`);
      if (visitorEmail) contextParts.push(`email: ${visitorEmail}`);
      conversationMessages.splice(1, 0, {
        role: 'system' as const,
        content: `The customer has identified themselves with: ${contextParts.join(', ')}. You can use this to look up their account when relevant.`,
      });
    }

    // Call OpenAI with tool-calling (loop until no more tool calls)
    let currentMessages = [...conversationMessages];
    let maxIterations = 5; // Safety limit

    while (maxIterations > 0) {
      maxIterations--;

      const chatResp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: currentMessages,
          tools,
          tool_choice: 'auto',
          temperature: 0.7,
          max_tokens: 1024,
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

      // If no tool calls, return the final text response
      if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
        return new Response(
          JSON.stringify({
            reply: assistantMessage.content || 'I apologize, I was unable to generate a response.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // Execute tool calls
      currentMessages.push(assistantMessage);

      for (const toolCall of assistantMessage.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        let result: string;

        switch (toolCall.function.name) {
          case 'search_knowledge_base':
            result = await executeSearchKnowledge(args.query, organizationId, supabase, OPENAI_API_KEY);
            break;
          case 'lookup_customer':
            result = await executeLookupCustomer(
              args.phone || visitorPhone,
              args.email || visitorEmail,
            );
            break;
          case 'get_booking_details':
            result = await executeGetBookingDetails(args.booking_id);
            break;
          default:
            result = JSON.stringify({ error: `Unknown tool: ${toolCall.function.name}` });
        }

        currentMessages.push({
          role: 'tool' as const,
          content: result,
          tool_call_id: toolCall.id,
        } as any);
      }
    }

    // If we exhausted iterations, return whatever we have
    return new Response(
      JSON.stringify({
        reply: 'I apologize, but I need a moment. Could you please try rephrasing your question?',
      }),
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

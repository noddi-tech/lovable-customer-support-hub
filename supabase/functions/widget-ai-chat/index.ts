import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ========== Shared imports ==========
import { corsHeaders, isRateLimited, saveErrorDetails, type AiMessage, type RequestBody } from '../_shared/chat-utils.ts';
import { callMcpTool, callMcpWithFallback } from '../_shared/mcp-client.ts';
import {
  executeLookupCustomer,
  executeGetBookingDetails,
  executeRescheduleBooking,
  executeCancelBooking,
  executeBookingProxy,
  executeSearchKnowledge,
} from '../_shared/noddi-tools.ts';
import {
  patchBookingSummary,
  patchYesNo,
  patchBookingSummaryTime,
  patchBookingInfo,
  patchActionMenu,
  patchGroupSelect,
  patchBookingConfirmed,
  patchTimeSlotConfirmToEdit,
  patchBookingEdit,
} from '../_shared/post-processors.ts';
import { buildSystemPrompt, buildCustomerMemoryPrompt, type ActionFlow, type GeneralConfig, type CustomerMemory } from '../_shared/prompt-builder.ts';

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
          user_group_id: { type: 'number', description: 'Specific user group ID to use (when customer selected a group from the options)' },
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
  {
    type: 'function' as const,
    function: {
      name: 'update_booking',
      description: 'Update an existing booking. Can change address, cars, sales items, or delivery window. Always confirm changes with the customer first using the [BOOKING_EDIT] marker.',
      parameters: {
        type: 'object',
        properties: {
          booking_id: { type: 'number', description: 'The Noddi booking ID to update' },
          address_id: { type: 'number', description: 'New address ID (from address lookup)' },
          delivery_window_id: { type: 'number', description: 'New delivery window ID' },
          delivery_window_start: { type: 'string', description: 'New delivery window start (ISO 8601)' },
          delivery_window_end: { type: 'string', description: 'New delivery window end (ISO 8601)' },
          cars: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                license_plate: { type: 'object', properties: { number: { type: 'string' }, country_code: { type: 'string' } } },
                selected_sales_item_ids: { type: 'array', items: { type: 'number' } },
              },
            },
            description: 'Updated cars array with license plates and selected sales items',
          },
        },
        required: ['booking_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'lookup_car_by_plate',
      description: 'Look up car details from a license plate number. Returns car ID, make, model, and year.',
      parameters: {
        type: 'object',
        properties: {
          license_plate: { type: 'string', description: 'The license plate number (e.g., EC94156)' },
          country_code: { type: 'string', description: 'ISO-2 country code (default: NO)', default: 'NO' },
        },
        required: ['license_plate'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_available_services',
      description: 'List available service categories for booking at a specific address. Requires address_id. Returns category names and IDs.',
      parameters: {
        type: 'object',
        properties: {
          address_id: { type: 'number', description: 'The address ID from address lookup' },
        },
        required: ['address_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_available_items',
      description: 'Get available sales items for a service category. Returns specific bookable items with prices.',
      parameters: {
        type: 'object',
        properties: {
          address_id: { type: 'number', description: 'The address ID' },
          car_ids: { type: 'array', items: { type: 'number' }, description: 'Array of car IDs' },
          sales_item_category_id: { type: 'number', description: 'The service category ID from list_available_services' },
        },
        required: ['address_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_delivery_windows',
      description: 'Get available delivery time windows for a booking. Returns dates and time slots with prices.',
      parameters: {
        type: 'object',
        properties: {
          address_id: { type: 'number', description: 'The address ID' },
          from_date: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
          to_date: { type: 'string', description: 'End date in YYYY-MM-DD format' },
          selected_sales_item_ids: { type: 'array', items: { type: 'number' }, description: 'Array of selected sales item IDs' },
        },
        required: ['address_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_shopping_cart',
      description: 'Create a booking via the shopping cart. Pass the full booking payload including address, car, items, and delivery window.',
      parameters: {
        type: 'object',
        properties: {
          address_id: { type: 'number', description: 'The address ID' },
          car_id: { type: 'number', description: 'The car ID' },
          sales_item_ids: { type: 'array', items: { type: 'number' }, description: 'Array of sales item IDs to book' },
          delivery_window_id: { type: 'number', description: 'The chosen delivery window ID' },
        },
        required: ['address_id', 'delivery_window_id', 'sales_item_ids'],
      },
    },
  },
];

// ========== Tool executor ==========

async function executeTool(
  toolName: string,
  args: any,
  organizationId: string,
  supabase: any,
  openaiApiKey: string,
  visitorPhone?: string,
  visitorEmail?: string,
  mcpAuthToken?: string,
): Promise<string> {
  switch (toolName) {
    case 'search_knowledge_base':
      return executeSearchKnowledge(args.query, organizationId, supabase, openaiApiKey);
    case 'lookup_customer': {
      let mcpResultObj: any = null;

      // Try MCP customer_lookup if we have an auth_token
      if (mcpAuthToken) {
        try {
          console.log('[executeTool] Using MCP customer_lookup with auth_token');
          const mcpArgs: any = { auth_token: mcpAuthToken };
          if (args.user_group_id) mcpArgs.user_group_id = args.user_group_id;
          const mcpResult = await callMcpTool('customer_lookup', mcpArgs);
          mcpResultObj = typeof mcpResult === 'string' ? JSON.parse(mcpResult) : mcpResult;
          console.log('[executeTool] MCP customer_lookup succeeded');
        } catch (err) {
          console.warn('[executeTool] MCP customer_lookup failed, falling back:', (err as Error).message);
        }
      }

      // Always run legacy lookup to extract stored_addresses/stored_cars from booking history
      const legacyResultStr = await executeLookupCustomer(args.phone || visitorPhone, args.email || visitorEmail, args.user_group_id);

      if (!mcpResultObj) {
        // MCP failed or unavailable, use legacy entirely
        return legacyResultStr;
      }

      // Merge stored_addresses and stored_cars from legacy into MCP result
      try {
        const legacyResult = JSON.parse(legacyResultStr);
        if (!mcpResultObj.stored_addresses && legacyResult.stored_addresses) {
          mcpResultObj.stored_addresses = legacyResult.stored_addresses;
        }
        if (!mcpResultObj.stored_cars && legacyResult.stored_cars) {
          mcpResultObj.stored_cars = legacyResult.stored_cars;
        }
        console.log('[executeTool] Merged stored data into MCP result — addresses:', mcpResultObj.stored_addresses?.length || 0, 'cars:', mcpResultObj.stored_cars?.length || 0);
      } catch (mergeErr) {
        console.warn('[executeTool] Failed to merge legacy data:', (mergeErr as Error).message);
      }

      return JSON.stringify(mcpResultObj);
    }
    case 'get_booking_details': {
      // Intercept placeholder IDs (1, 2, etc.) — AI uses these when it doesn't know the real ID
      const bid = args.booking_id;
      if (!bid || (typeof bid === 'number' && bid <= 10) || bid === '1') {
        console.warn(`[widget-ai-chat] get_booking_details called with placeholder ID ${bid}, redirecting`);
        return JSON.stringify({
          error: 'The booking details are already available in the conversation history above. Do NOT call this tool with a placeholder ID. Use the booking data (address_id, car info, sales items, delivery window) already provided in the conversation to continue the flow.'
        });
      }
      // Try MCP if auth_token available
      if (mcpAuthToken) {
        try {
          console.log('[executeTool] Using MCP booking_details_get for booking_id:', bid);
          const mcpResult = await callMcpTool('booking_details_get', { booking_id: bid, auth_token: mcpAuthToken });
          console.log('[executeTool] MCP booking_details_get succeeded');
          return typeof mcpResult === 'string' ? mcpResult : JSON.stringify(mcpResult);
        } catch (err) {
          console.warn('[executeTool] MCP booking_details_get failed, falling back:', (err as Error).message);
        }
      }
      return executeGetBookingDetails(bid);
    }
    case 'reschedule_booking': {
      // MCP uses booking_update for reschedule
      if (mcpAuthToken) {
        try {
          console.log('[executeTool] Using MCP booking_update for reschedule, booking_id:', args.booking_id);
          const mcpResult = await callMcpTool('booking_update', {
            booking_id: args.booking_id,
            delivery_window_starts_at: args.new_date,
            auth_token: mcpAuthToken,
          });
          console.log('[executeTool] MCP booking_update (reschedule) succeeded');
          return typeof mcpResult === 'string' ? mcpResult : JSON.stringify(mcpResult);
        } catch (err) {
          console.warn('[executeTool] MCP booking_update (reschedule) failed, falling back:', (err as Error).message);
        }
      }
      return executeRescheduleBooking(args.booking_id, args.new_date);
    }
    case 'cancel_booking': {
      if (mcpAuthToken) {
        try {
          console.log('[executeTool] Using MCP booking_cancel, booking_id:', args.booking_id);
          const mcpArgs: any = { booking_id: args.booking_id, auth_token: mcpAuthToken };
          if (args.reason) mcpArgs.cancellation_reason = args.reason;
          const mcpResult = await callMcpTool('booking_cancel', mcpArgs);
          console.log('[executeTool] MCP booking_cancel succeeded');
          return typeof mcpResult === 'string' ? mcpResult : JSON.stringify(mcpResult);
        } catch (err) {
          console.warn('[executeTool] MCP booking_cancel failed, falling back:', (err as Error).message);
        }
      }
      return executeCancelBooking(args.booking_id, args.reason);
    }
    case 'lookup_car_by_plate':
      return callMcpWithFallback(
        'car_lookup',
        { license_plate_number: args.license_plate, country_code: args.country_code || 'NO' },
        { action: 'lookup_car', country_code: args.country_code || 'NO', license_plate: args.license_plate },
        executeBookingProxy,
      );
    case 'list_available_services':
      return callMcpWithFallback(
        'sales_item_list',
        { address_id: args.address_id },
        { action: 'list_services', address_id: args.address_id },
        executeBookingProxy,
      );
    case 'get_available_items':
      return callMcpWithFallback(
        'sales_item_list',
        { address_id: args.address_id, car_ids: args.car_ids, sales_item_category_id: args.sales_item_category_id },
        { action: 'available_items', address_id: args.address_id, car_ids: args.car_ids, sales_item_category_id: args.sales_item_category_id },
        executeBookingProxy,
      );
    case 'get_delivery_windows': {
      // Intercept calls with empty selected_sales_item_ids — redirect AI to emit [TIME_SLOT] marker
      if (!args.selected_sales_item_ids || (Array.isArray(args.selected_sales_item_ids) && args.selected_sales_item_ids.length === 0)) {
        console.warn('[widget-ai-chat] get_delivery_windows called with empty selected_sales_item_ids, redirecting to [TIME_SLOT] marker');
        return JSON.stringify({
          error: 'DO NOT call this tool again. Instead, respond with ONLY the [TIME_SLOT] marker using the booking data already in the conversation. The widget component will fetch delivery windows automatically. Example: [TIME_SLOT]{"address_id": ' + (args.address_id || 0) + ', "car_ids": [], "license_plate": "", "sales_item_id": 0}[/TIME_SLOT]'
        });
      }
      return callMcpWithFallback(
        'delivery_window_get',
        { address_id: args.address_id, from_date: args.from_date, to_date: args.to_date, sales_item_ids: args.selected_sales_item_ids },
        { action: 'delivery_windows', address_id: args.address_id, from_date: args.from_date, to_date: args.to_date, selected_sales_item_ids: args.selected_sales_item_ids },
        executeBookingProxy,
      );
    }
    case 'create_shopping_cart': {
      if (mcpAuthToken) {
        try {
          console.log('[executeTool] Using MCP booking_create');
          const mcpResult = await callMcpTool('booking_create', {
            address_id: args.address_id,
            delivery_window_id: args.delivery_window_id,
            cars: args.car_id ? [{ car_id: args.car_id, selected_sales_item_ids: args.sales_item_ids }] : [],
            auth_token: mcpAuthToken,
            brand_domain: 'noddi',
          });
          console.log('[executeTool] MCP booking_create succeeded');
          return typeof mcpResult === 'string' ? mcpResult : JSON.stringify(mcpResult);
        } catch (err) {
          console.warn('[executeTool] MCP booking_create failed, falling back:', (err as Error).message);
        }
      }
      return executeBookingProxy({ action: 'create_booking', address_id: args.address_id, car_id: args.car_id, sales_item_ids: args.sales_item_ids, delivery_window_id: args.delivery_window_id });
    }
    case 'update_booking': {
      if (mcpAuthToken) {
        try {
          console.log('[executeTool] Using MCP booking_update, booking_id:', args.booking_id);
          const mcpArgs: any = { booking_id: args.booking_id, auth_token: mcpAuthToken };
          if (args.address_id) mcpArgs.address_id = args.address_id;
          if (args.delivery_window_id) mcpArgs.delivery_window_id = args.delivery_window_id;
          if (args.delivery_window_start) mcpArgs.delivery_window_starts_at = args.delivery_window_start;
          if (args.delivery_window_end) mcpArgs.delivery_window_ends_at = args.delivery_window_end;
          if (args.cars) mcpArgs.cars = args.cars;
          const mcpResult = await callMcpTool('booking_update', mcpArgs);
          console.log('[executeTool] MCP booking_update succeeded');
          return typeof mcpResult === 'string' ? mcpResult : JSON.stringify(mcpResult);
        } catch (err) {
          console.warn('[executeTool] MCP booking_update failed, falling back:', (err as Error).message);
        }
      }
      return executeBookingProxy({
        action: 'update_booking',
        booking_id: args.booking_id,
        address_id: args.address_id,
        delivery_window_id: args.delivery_window_id,
        delivery_window_start: args.delivery_window_start,
        delivery_window_end: args.delivery_window_end,
        cars: args.cars,
      });
    }
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
): Promise<string | null> {
  if (!conversationId) return null;
  try {
    const { data } = await supabase.from('widget_ai_messages').insert({
      conversation_id: conversationId,
      role,
      content,
      tools_used: toolsUsed || [],
    }).select('id').single();

    // Update conversation message count and timestamp
    await supabase
      .from('widget_ai_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return data?.id || null;
  } catch { return null; }
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
    const { widgetKey, messages, visitorPhone, visitorEmail, language = 'no', stream = false, test = false, conversationId, isVerified = false } = body;

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
      .select('id, organization_id, is_active, ai_general_config')
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

    // Fetch action flows for this widget
    const { data: actionFlowsData } = await supabase
      .from('ai_action_flows')
      .select('intent_key, label, description, trigger_phrases, requires_verification, flow_steps, is_active')
      .eq('widget_config_id', widgetConfig.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    const actionFlows: ActionFlow[] = actionFlowsData || [];
    const generalConfig: GeneralConfig = (widgetConfig.ai_general_config as GeneralConfig) || {
      tone: 'friendly, concise, helpful',
      max_initial_lines: 4,
      never_dump_history: true,
      language_behavior: 'Match the customer\'s language. Default to Norwegian (bokmål).',
      escalation_threshold: 3,
    };

    // Create/get conversation for persistence
    const dbConversationId = await getOrCreateConversation(
      supabase, conversationId, organizationId, widgetConfig.id,
      visitorPhone, visitorEmail, test,
    );

    // Retrieve MCP auth_token from conversation metadata (set by widget-verify-phone)
    let mcpAuthToken: string | undefined;
    if (dbConversationId) {
      try {
        const { data: convMeta } = await supabase
          .from('widget_ai_conversations')
          .select('metadata')
          .eq('id', dbConversationId)
          .single();
        mcpAuthToken = convMeta?.metadata?.mcp_auth_token || undefined;
        if (mcpAuthToken) console.log('[widget-ai-chat] Found MCP auth_token in conversation metadata');
      } catch { /* best effort */ }
    }

    // Save user message
    const lastUserMsg = messages[messages.length - 1];
    if (lastUserMsg?.role === 'user') {
      await saveMessage(supabase, dbConversationId, 'user', lastUserMsg.content);
    }

    // Fetch customer memory profile if identifier available
    let customerMemoryPrompt = '';
    const memoryIdentifier = visitorPhone || visitorEmail;
    if (memoryIdentifier) {
      try {
        const identifierType = visitorPhone ? 'phone' : 'email';
        const normalizedId = visitorPhone
          ? visitorPhone.replace(/[^\d+]/g, '')
          : visitorEmail!.trim().toLowerCase();

        const { data: summary } = await supabase
          .from('customer_summaries')
          .select('summary_text')
          .eq('organization_id', organizationId)
          .eq('customer_identifier', normalizedId)
          .eq('identifier_type', identifierType)
          .single();

        if (summary?.summary_text) {
          const { data: memories } = await supabase
            .from('customer_memories')
            .select('memory_type, memory_text, confidence')
            .eq('organization_id', organizationId)
            .eq('customer_identifier', normalizedId)
            .eq('is_active', true)
            .order('confidence', { ascending: false })
            .order('updated_at', { ascending: false })
            .limit(10);

          customerMemoryPrompt = buildCustomerMemoryPrompt(
            summary.summary_text,
            (memories || []) as CustomerMemory[],
          );
          console.log(`[widget-ai-chat] Injected customer memory profile for ${identifierType}=${normalizedId} (${(memories || []).length} memories)`);
        }
      } catch (e) {
        console.warn('[widget-ai-chat] Customer memory lookup failed:', e);
      }
    }

    // Build conversation with system prompt
    const systemPrompt = buildSystemPrompt(language, isVerified, actionFlows, generalConfig)
      + (customerMemoryPrompt ? '\n\n' + customerMemoryPrompt : '');
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

    // Map messages, replacing __VERIFIED__ trigger with a context-aware system instruction
    conversationMessages.push(...messages.map((m, idx) => {
      if (m.role === 'user' && m.content === '__VERIFIED__') {
        // Find the user's last real (non-hidden, non-verified) message to carry their intent
        let userIntent = '';
        for (let i = idx - 1; i >= 0; i--) {
          if (messages[i].role === 'user' && messages[i].content !== '__VERIFIED__') {
            userIntent = messages[i].content;
            break;
          }
        }

        // Detect which action flow matches the user's intent
        let matchedFlowHint = '';
        if (userIntent) {
          const intentLower = userIntent.toLowerCase();
          for (const flow of actionFlows) {
            if (!flow.is_active) continue;
            const triggers = (flow.trigger_phrases || []) as string[];
            const matches = triggers.some(
              (p: string) => intentLower.includes(p.toLowerCase())
            );
            if (matches && Array.isArray(flow.flow_steps) && (flow.flow_steps as any[]).length > 0) {
              const firstStep = (flow.flow_steps as any[])[0];
              if (flow.intent_key === 'cancel_booking') {
                matchedFlowHint = ` This matches the "cancel_booking" flow. After lookup, display the booking using [BOOKING_INFO] and ask "Er dette bestillingen du vil kansellere?" wrapped in [YES_NO]. Do NOT call cancel_booking until the customer confirms with "Ja". Do NOT call get_booking_details if lookup_customer already returned the booking data.`;
              } else {
                matchedFlowHint = ` This matches the "${flow.intent_key}" flow. After lookup, proceed DIRECTLY to step 1: ${firstStep.instruction || firstStep.description || 'follow the flow'}. Do NOT call get_booking_details if lookup_customer already returned the booking with address_id, car_ids, sales_item_ids, and license_plate.`;
              }
              break;
            }
          }
        }

        const intentContext = userIntent
          ? ` The customer previously said: "${userIntent}". Continue directly with that intent — do NOT re-ask what they want to do.`
          : '';
        return { role: 'user', content: `I have just verified my phone number. Please look up my account and continue with the next step in the flow. REMEMBER: After lookup, you ALREADY KNOW if I am an existing customer — do NOT ask me. If I belong to multiple user groups, STOP and wait for me to select one — do NOT auto-select a group.${intentContext}${matchedFlowHint}` };
      }
      return { role: m.role, content: m.content };
    }));

    // Tool-calling loop (non-streaming phase — resolve all tool calls first)
    let currentMessages = [...conversationMessages];
    let maxIterations = 8;
    const allToolsUsed: string[] = [];
    const toolCallCounts: Record<string, number> = {};

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
        await saveErrorDetails(supabase, dbConversationId, 'openai_error', `Status ${chatResp.status}: ${errorText.slice(0, 500)}`);
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
        let rawReply = assistantMessage.content || 'I apologize, I was unable to generate a response.';
        // Patch BOOKING_SUMMARY time/date to Oslo timezone before further processing
        rawReply = patchBookingSummaryTime(rawReply);
        let reply = await patchBookingSummary(rawReply, currentMessages, visitorPhone, visitorEmail);
        reply = patchTimeSlotConfirmToEdit(reply, currentMessages);
        reply = await patchBookingEdit(reply, currentMessages, visitorPhone, visitorEmail);
        // === FIX 4: Strip redundant text before BOOKING_EDIT ===
        if (reply.includes('[BOOKING_EDIT]')) {
          reply = reply.replace(/^.*(?:Gammel tid|Ny tid|gamle og nye|for bekreftelse|Bekrefter du|Her er endringene|gammel|ny).*$/gim, '');
          reply = reply.replace(/\n{3,}/g, '\n\n').trim();
        }
        reply = patchBookingConfirmed(reply, currentMessages);
        reply = patchBookingInfo(reply, currentMessages);
        reply = patchGroupSelect(reply, currentMessages);
        reply = patchActionMenu(reply, currentMessages);
        reply = patchYesNo(reply, currentMessages);

        // Save assistant reply & update conversation meta
        const savedMessageId = await saveMessage(supabase, dbConversationId, 'assistant', reply, allToolsUsed);
        await updateConversationMeta(supabase, dbConversationId, allToolsUsed);

        // Detect knowledge gaps: if knowledge search was used but returned no results
        if (allToolsUsed.includes('search_knowledge_base') && !test) {
          try {
            await detectKnowledgeGap(supabase, organizationId, dbConversationId, lastUserMsg?.content || '');
          } catch (e) { console.error('[widget-ai-chat] Gap detection error:', e); }
        }

        // If streaming requested and we have the final text, stream it via SSE
        if (stream) {
          return streamTextResponse(reply, dbConversationId, savedMessageId);
        }

        return new Response(
          JSON.stringify({ reply, conversationId: dbConversationId, messageId: savedMessageId }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // Execute tool calls
      currentMessages.push(assistantMessage);

      // Track tool call counts to prevent infinite loops
      let loopBroken = false;

      // Pre-filter: check circuit breakers and safety for all tool calls
      const eligibleCalls: any[] = [];
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        toolCallCounts[toolName] = (toolCallCounts[toolName] || 0) + 1;

        const maxCallsForTool = toolName === 'get_delivery_windows' ? 2 : 3;
        if (toolCallCounts[toolName] >= maxCallsForTool) {
          console.warn(`[widget-ai-chat] Tool ${toolName} called ${toolCallCounts[toolName]} times, breaking loop`);
          await saveErrorDetails(supabase, dbConversationId, 'loop_break', `Tool ${toolName} called ${toolCallCounts[toolName]} times`);
          loopBroken = true;
          break;
        }

        if (toolName === 'cancel_booking') {
          const hasUserConfirmation = currentMessages.some(
            (m: any) => m.role === 'user' && /\b(ja|yes|bekreft|confirm)\b/i.test(typeof m.content === 'string' ? m.content : '')
          );
          if (!hasUserConfirmation) {
            console.log('[widget-ai-chat] cancel_booking blocked — no user confirmation');
            loopBroken = true;
            break;
          }
        }

        eligibleCalls.push(toolCall);
      }

      if (!loopBroken && eligibleCalls.length > 0) {
        // Execute all eligible tool calls in PARALLEL (Fix 1)
        console.log(`[widget-ai-chat] Executing ${eligibleCalls.length} tool call(s) in parallel, iteration ${8 - maxIterations}`);
        const results = await Promise.all(eligibleCalls.map(async (toolCall: any) => {
          const toolName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);
          console.log(`[widget-ai-chat] Parallel tool call: ${toolName}(${toolCall.function.arguments})`);
          allToolsUsed.push(toolName);

          const result = await executeTool(
            toolName, args, organizationId, supabase, OPENAI_API_KEY,
            visitorPhone, visitorEmail, mcpAuthToken,
          );
          return { toolCall, toolName, result };
        }));

        // Process results (maintain message ordering, check group selection)
        for (const { toolCall, toolName, result } of results) {
          try {
            const parsed = JSON.parse(result);
            if (parsed.error) {
              await saveErrorDetails(supabase, dbConversationId, 'tool_error', `${toolName}: ${parsed.error}`);
            }
          } catch {}

          currentMessages.push({
            role: 'tool',
            content: result,
            tool_call_id: toolCall.id,
          });

          try {
            const parsedResult = JSON.parse(result);
            if (parsedResult.needs_group_selection && parsedResult.user_groups) {
              console.log('[widget-ai-chat] Group selection required, breaking tool loop');
              loopBroken = true;
              break;
            }
          } catch {}
        }
      }
      if (loopBroken) {
        // Pad missing tool responses so OpenAI doesn't reject the message history
        const answeredIds = new Set(
          currentMessages
            .filter((m: any) => m.role === 'tool')
            .map((m: any) => m.tool_call_id)
        );
        for (const tc of assistantMessage.tool_calls) {
          if (!answeredIds.has(tc.id)) {
            currentMessages.push({
              role: 'tool',
              content: JSON.stringify({ error: 'Tool call skipped due to safety limit. Use data already available in the conversation to answer the user. If the user wants to change time, output the [TIME_SLOT] marker.' }),
              tool_call_id: tc.id,
            });
          }
        }
        break;
      }
    }

    // Loop exhausted or broken — give AI one final chance with tool_choice: "none"
    console.log('[widget-ai-chat] Loop exhausted/broken, making final forced-text call with tool_choice: "none"');
    await saveErrorDetails(supabase, dbConversationId, 'loop_exhaustion', 'Max tool rounds exhausted, forcing text response');
    try {
      const finalResp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
         body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: currentMessages,
          tools,
          tool_choice: 'none',
          temperature: 0.7,
          max_tokens: 1024,
          stream: false,
        }),
      });

      if (!finalResp.ok) {
        const errBody = await finalResp.text();
        console.error('[widget-ai-chat] Final forced-text call returned', finalResp.status, errBody);
        await saveErrorDetails(supabase, dbConversationId, 'recovery_call_error', `Status ${finalResp.status}: ${errBody.slice(0, 500)}`);
      } else {
        const finalData = await finalResp.json();
        const finalContent = finalData.choices?.[0]?.message?.content;
        if (finalContent && finalContent.trim().length > 0) {
          console.log('[widget-ai-chat] Final forced-text response obtained, length:', finalContent.length);
          let reply = await patchBookingSummary(finalContent, currentMessages, visitorPhone, visitorEmail);
          reply = await patchBookingEdit(reply, currentMessages, visitorPhone, visitorEmail);
          if (reply.includes('[BOOKING_EDIT]')) {
            reply = reply.replace(/^.*(?:Gammel tid|Ny tid|gamle og nye|for bekreftelse|Bekrefter du|Her er endringene|gammel|ny).*$/gim, '');
            reply = reply.replace(/\n{3,}/g, '\n\n').trim();
          }
          reply = patchBookingConfirmed(reply, currentMessages);
          reply = patchBookingInfo(reply, currentMessages);
          reply = patchGroupSelect(reply, currentMessages);
          reply = patchActionMenu(reply, currentMessages);
          reply = patchYesNo(reply);

          const savedMessageId = await saveMessage(supabase, dbConversationId, 'assistant', reply, allToolsUsed);
          await updateConversationMeta(supabase, dbConversationId, allToolsUsed);

          if (stream) {
            return streamTextResponse(reply, dbConversationId, savedMessageId);
          }

          return new Response(
            JSON.stringify({ reply, conversationId: dbConversationId, messageId: savedMessageId }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      }
    } catch (finalErr) {
      console.error('[widget-ai-chat] Final forced-text call failed:', finalErr);
    }

    // True fallback — final call also failed
    await saveErrorDetails(supabase, dbConversationId, 'fallback_sent', 'All recovery attempts failed, sent fallback message');
    const fallback = language === 'no'
      ? 'Beklager, men jeg trenger et øyeblikk. Kan du prøve å omformulere spørsmålet ditt?'
      : 'I apologize, but I need a moment. Could you please try rephrasing your question?';
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

// ========== Knowledge gap detection ==========

async function detectKnowledgeGap(
  supabase: any,
  organizationId: string,
  conversationId: string | null,
  userQuestion: string,
) {
  if (!userQuestion || userQuestion.length < 10) return;
  const trimmed = userQuestion.slice(0, 500);

  // Check if a similar gap already exists
  const { data: existing } = await supabase
    .from('knowledge_gaps')
    .select('id, frequency')
    .eq('organization_id', organizationId)
    .eq('status', 'open')
    .ilike('question', `%${trimmed.slice(0, 60)}%`)
    .limit(1);

  if (existing && existing.length > 0) {
    // Increment frequency
    await supabase
      .from('knowledge_gaps')
      .update({
        frequency: existing[0].frequency + 1,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing[0].id);
  } else {
    await supabase.from('knowledge_gaps').insert({
      organization_id: organizationId,
      conversation_id: conversationId,
      question: trimmed,
      frequency: 1,
      status: 'open',
    });
  }
}

// Stream the final reply text as SSE events
function streamTextResponse(text: string, conversationId: string | null, messageId: string | null): Response {
  const encoder = new TextEncoder();

  // Fix 5: Detect pure-marker responses and send immediately (no typing delay)
  const markerPattern = /^\s*\[(?:ADDRESS_SEARCH|TIME_SLOT|LICENSE_PLATE|PHONE_VERIFY|SERVICE_SELECT|ACTION_MENU|BOOKING_SUMMARY|BOOKING_EDIT|BOOKING_CONFIRMED|BOOKING_INFO|BOOKING_SELECT|GROUP_SELECT|YES_NO|CONFIRM)\]/;
  const isMarkerOnly = markerPattern.test(text.trim());

  const stream = new ReadableStream({
    start(controller) {
      if (conversationId || messageId) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'meta', conversationId, messageId })}\n\n`));
      }

      if (isMarkerOnly) {
        // Send marker responses instantly — no typing delay needed
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'token', content: text })}\n\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
        controller.close();
        return;
      }

      // Stream text in chunks — faster: 5 words at 10ms intervals (was 3 words at 30ms)
      const words = text.split(/(\s+)/);
      let i = 0;
      const chunkSize = 5;

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
      }, 10);
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

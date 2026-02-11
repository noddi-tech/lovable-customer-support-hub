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
  isVerified?: boolean;
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
    // Use the customer-lookup-support endpoint (same as noddi-customer-lookup)
    const lookupUrl = new URL(`${API_BASE}/v1/users/customer-lookup-support/`);

    if (phone) {
      let cleanPhone = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
      if (cleanPhone.startsWith('0047')) cleanPhone = '+47' + cleanPhone.slice(4);
      else if (cleanPhone.startsWith('+47')) { /* already correct */ }
      else if (cleanPhone.startsWith('47') && cleanPhone.length === 10) cleanPhone = '+' + cleanPhone;
      else if (/^\d{8}$/.test(cleanPhone)) cleanPhone = '+47' + cleanPhone;
      lookupUrl.searchParams.set('phone', cleanPhone);
      console.log(`[lookup] Looking up phone via customer-lookup-support: ${cleanPhone}`);
    }

    if (email) {
      lookupUrl.searchParams.set('email', email);
      console.log(`[lookup] Looking up email via customer-lookup-support: ${email}`);
    }

    const resp = await fetch(lookupUrl.toString(), { headers });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      console.error(`[lookup] customer-lookup-support error: ${resp.status} ${errText}`);

      // Check for user_does_not_exist
      let isNotFound = resp.status === 404;
      if (resp.status === 400) {
        try {
          const errorData = JSON.parse(errText);
          isNotFound = (errorData?.errors || []).some((err: any) =>
            err?.code === 'user_does_not_exist' || err?.detail?.includes('does not exist')
          );
        } catch { /* ignore parse error */ }
      }

      if (isNotFound) {
        return JSON.stringify({ found: false, message: 'No customer found with the provided information.' });
      }
      return JSON.stringify({ error: `Customer lookup failed (${resp.status})` });
    }

    const lookupData = await resp.json();
    const noddihUser = lookupData.user;
    const userGroups = lookupData.user_groups || [];

    if (!noddihUser) {
      return JSON.stringify({ found: false, message: 'No customer found with the provided information.' });
    }

    const userGroupId = userGroups.find((g: any) => g.is_default_user_group)?.id
      || userGroups.find((g: any) => g.is_personal)?.id
      || userGroups[0]?.id;

    let bookings: any[] = [];

    if (userGroupId) {
      const bResp = await fetch(`${API_BASE}/v1/user-groups/${userGroupId}/bookings-for-customer/`, { headers });
      if (bResp.ok) {
        const data = await bResp.json();
        bookings = Array.isArray(data) ? data : (data.results || []);
      } else {
        const errText = await bResp.text().catch(() => '');
        console.error(`[lookup] Bookings error (userGroup ${userGroupId}): ${bResp.status} ${errText}`);
      }
    }

    const name = `${noddihUser.first_name || ''} ${noddihUser.last_name || ''}`.trim()
      || noddihUser.name || '';

    return JSON.stringify({
      found: true,
      customer: {
        name,
        email: noddihUser.email,
        phone: noddihUser.phone,
        userId: noddihUser.id,
        userGroupId,
      },
      bookings: bookings.slice(0, 10).map((b: any) => ({
        id: b.id,
        status: b.status,
        scheduledAt: b.start_time || b.scheduled_at || b.delivery_window_starts_at,
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

interface FlowCondition { check: string; if_true?: string; if_false?: string; }
interface FlowAction { label: string; enabled: boolean; children?: FlowNode[]; }
interface DataField { label: string; field_type: string; required: boolean; validation_hint?: string; }
interface FlowNode { id: string; type?: string; label: string; instruction: string; conditions?: FlowCondition[]; actions?: FlowAction[]; data_fields?: DataField[]; children?: FlowNode[]; yes_children?: FlowNode[]; no_children?: FlowNode[]; goto_target?: string; }
interface FlowConfig { nodes: FlowNode[]; general_rules: { max_initial_lines: number; never_dump_history: boolean; tone: string; language_behavior?: string; escalation_threshold?: number; }; }

function findNodeByIdInTree(nodes: FlowNode[], nodeId: string): FlowNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) return node;
    for (const branch of ['children', 'yes_children', 'no_children'] as const) {
      const found = findNodeByIdInTree((node as any)[branch] || [], nodeId);
      if (found) return found;
    }
    if (node.actions) {
      for (const a of node.actions) {
        if (a.children) {
          const found = findNodeByIdInTree(a.children, nodeId);
          if (found) return found;
        }
      }
    }
  }
  return null;
}

// ========== Block Prompts Map (registry-like for edge function) ==========

const BLOCK_PROMPTS: Record<string, {
  fieldTypes?: string[];
  nodeTypes?: string[];
  instruction: (ctx: { fieldLabel?: string; conditionCheck?: string; validationHint?: string }) => string;
}> = {
  phone_verify: {
    fieldTypes: ['phone', 'tel'],
    instruction: () => `To collect and verify the customer's phone number, include the marker [PHONE_VERIFY] in your response. The widget will render an interactive phone verification form. Do NOT ask for the phone number in text — the form handles it.`,
  },
  email_input: {
    fieldTypes: ['email'],
    instruction: () => `To collect the customer's email, include the marker [EMAIL_INPUT] in your response. The widget will render an email input field with validation. Do NOT ask for the email in text — the form handles it.`,
  },
  text_input: {
    fieldTypes: ['text'],
    instruction: (ctx) => {
      const placeholder = ctx.validationHint || ctx.fieldLabel || 'Enter text';
      return `To collect "${ctx.fieldLabel || 'text'}", include the marker [TEXT_INPUT]${placeholder}[/TEXT_INPUT] in your response. The widget will render a text input field.`;
    },
  },
  yes_no: {
    nodeTypes: ['decision'],
    instruction: (ctx) => `Present this as a YES/NO choice to the customer using the marker: [YES_NO]${ctx.conditionCheck || ''}[/YES_NO]`,
  },
};

function getBlockPromptForFieldType(fieldType: string): typeof BLOCK_PROMPTS[string] | undefined {
  for (const def of Object.values(BLOCK_PROMPTS)) {
    if (def.fieldTypes?.includes(fieldType)) return def;
  }
  return undefined;
}

function buildNodePrompt(node: FlowNode, depth: number, allNodes: FlowNode[]): string {
  const indent = '  '.repeat(depth);
  const lines: string[] = [];
  const nodeType = node.type || 'message';

  // Goto node
  if (nodeType === 'goto') {
    const targetNode = node.goto_target ? findNodeByIdInTree(allNodes, node.goto_target) : null;
    lines.push(`${indent}→ Return to the "${targetNode?.label || 'unknown'}" step.`);
    return lines.join('\n');
  }

  lines.push(`${indent}### ${node.label}`);
  if (node.instruction) {
    lines.push(`${indent}${node.instruction}`);
  }

  // Data collection fields — use BLOCK_PROMPTS map
  if (nodeType === 'data_collection' && node.data_fields && node.data_fields.length > 0) {
    lines.push(`${indent}Required data to collect:`);
    for (const field of node.data_fields) {
      const reqText = field.required ? 'required' : 'optional';
      const hint = field.validation_hint ? `, ${field.validation_hint}` : '';
      lines.push(`${indent}  - ${field.label} (${field.field_type} format, ${reqText}${hint})`);

      const blockPrompt = getBlockPromptForFieldType(field.field_type);
      if (blockPrompt) {
        lines.push(`${indent}${blockPrompt.instruction({ fieldLabel: field.label, validationHint: field.validation_hint })}`);
      }
    }
  }
        lines.push(`${indent}To collect "${field.label}", include the marker [TEXT_INPUT]${placeholder}[/TEXT_INPUT] in your response. The widget will render a text input field.`);
      }
    }
  }

  // Decision conditions with recursive branches
  if (nodeType === 'decision' && node.conditions && node.conditions.length > 0) {
    for (const cond of node.conditions) {
      lines.push(`${indent}- IF ${cond.check}:`);
      lines.push(`${indent}  Present this as a YES/NO choice to the customer using the marker: [YES_NO]${cond.check}[/YES_NO]`);

      if (node.yes_children && node.yes_children.length > 0) {
        lines.push(`${indent}  → YES:`);
        for (const child of node.yes_children) {
          lines.push(buildNodePrompt(child, depth + 2, allNodes));
        }
      } else if (cond.if_true) {
        lines.push(`${indent}  → YES: ${cond.if_true}`);
      }

      if (node.no_children && node.no_children.length > 0) {
        lines.push(`${indent}  → NO:`);
        for (const child of node.no_children) {
          lines.push(buildNodePrompt(child, depth + 2, allNodes));
        }
      } else if (cond.if_false) {
        lines.push(`${indent}  → NO: ${cond.if_false}`);
      }
    }
  }

  // Action menu with branch support
  if (nodeType === 'action_menu' && node.actions && node.actions.length > 0) {
    const enabled = node.actions.filter(a => a.enabled);
    if (enabled.length > 0) {
      lines.push(`${indent}Present these options using the [ACTION_MENU] marker so they render as clickable buttons:`);
      lines.push(`${indent}[ACTION_MENU]`);
      for (const action of enabled) {
        lines.push(`${indent}${action.label}`);
      }
      lines.push(`${indent}[/ACTION_MENU]`);
      // Add branch instructions after the menu
      for (const action of enabled) {
        if (action.children && action.children.length > 0) {
          lines.push(`${indent}If customer chooses "${action.label}", then:`);
          for (const child of action.children) {
            lines.push(buildNodePrompt(child, depth + 1, allNodes));
          }
        }
      }
    }
  }

  // Escalation
  if (nodeType === 'escalation') {
    lines.push(`${indent}ACTION: Escalate to a human agent at this point.`);
  }

  // Sequential children (continuation after this node)
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      lines.push(buildNodePrompt(child, depth, allNodes));
    }
  }

  return lines.join('\n');
}

function buildFlowPrompt(flowConfig: FlowConfig): string {
  const lines: string[] = [];

  for (const node of flowConfig.nodes) {
    lines.push(buildNodePrompt(node, 0, flowConfig.nodes));
  }

  const rules = flowConfig.general_rules;
  lines.push(`\nGENERAL RULES:`);
  lines.push(`- Tone: ${rules.tone}`);
  lines.push(`- Keep the initial response to max ${rules.max_initial_lines} lines before presenting choices.`);
  if (rules.never_dump_history) {
    lines.push(`- NEVER dump full booking/order history unprompted. Summarize briefly and let the customer choose.`);
  }
  if (rules.language_behavior) {
    lines.push(`- Language: ${rules.language_behavior}`);
  }
  if (rules.escalation_threshold) {
    lines.push(`- If the customer seems stuck or frustrated after ${rules.escalation_threshold} unanswered turns, offer to connect them with a human agent.`);
  }

  return lines.join('\n');
}

function buildPreVerificationFlowPrompt(flowConfig: FlowConfig): string | null {
  const lines: string[] = [];
  let foundPhoneVerify = false;

  function walkNodes(nodes: FlowNode[]): boolean {
    for (const node of nodes) {
      const nodeType = node.type || 'message';

      if (nodeType === 'data_collection' && node.data_fields && node.data_fields.length > 0) {
        const hasPhoneField = node.data_fields.some(f =>
          f.field_type === 'phone' || f.field_type === 'tel' || f.label.toLowerCase().includes('phone') || f.label.toLowerCase().includes('telefon')
        );
        if (hasPhoneField) {
          lines.push(`- To verify the customer's identity, include [PHONE_VERIFY] in your response. The widget will show a phone number input and SMS OTP form.`);
          foundPhoneVerify = true;
          return true; // stop traversal — everything after this is post-verification
        }
      }

      if (nodeType === 'message' && node.instruction) {
        lines.push(`- ${node.label}: "${node.instruction}"`);
      }

      if (nodeType === 'action_menu' && node.actions) {
        const enabled = node.actions.filter(a => a.enabled);
        if (enabled.length > 0) {
          lines.push(`- Present these choices using [ACTION_MENU]:`);
          lines.push(`[ACTION_MENU]`);
          for (const a of enabled) lines.push(a.label);
          lines.push(`[/ACTION_MENU]`);
        }
      }

      if (nodeType === 'decision' && node.conditions) {
        for (const cond of node.conditions) {
          lines.push(`- Present this as a YES/NO choice: [YES_NO]${cond.check}[/YES_NO]`);
        }
      }

      if (nodeType === 'data_collection' && node.data_fields) {
        for (const field of node.data_fields) {
          if (field.field_type === 'email') {
            lines.push(`- Collect email using [EMAIL_INPUT]`);
          }
          if (field.field_type === 'text') {
            lines.push(`- Collect "${field.label}" using [TEXT_INPUT]${field.validation_hint || field.label || 'Enter text'}[/TEXT_INPUT]`);
          }
        }
      }

      // Recurse into children
      if (node.children && node.children.length > 0) {
        if (walkNodes(node.children)) return true;
      }
    }
    return false;
  }

  walkNodes(flowConfig.nodes);
  if (!foundPhoneVerify) return null;

  return `VERIFICATION STATUS: The customer has NOT verified their phone.

Follow this conversation flow:
${lines.join('\n')}

Additional rules:
- You can answer general questions using search_knowledge_base while waiting for verification.
- Do NOT look up customer data or share account details without verification.
- Do NOT ask for the phone number in text — the [PHONE_VERIFY] form handles it.`;
}

function buildSystemPrompt(language: string, isVerified: boolean, flowConfig?: FlowConfig | null): string {
  const langInstruction = language === 'no' || language === 'nb' || language === 'nn'
    ? 'Respond in Norwegian (bokmål). Match the customer\'s language.'
    : `Respond in the same language as the customer. The widget is set to language code: ${language}.`;

  let verificationContext: string;

  if (isVerified) {
    if (flowConfig && flowConfig.nodes && flowConfig.nodes.length > 0) {
      // Dynamic flow from config
      verificationContext = `VERIFICATION STATUS: The customer's phone number has been verified via SMS OTP. You can freely access their account data using lookup_customer.

AFTER LOOKING UP THE CUSTOMER, follow this guided flow:
${buildFlowPrompt(flowConfig)}`;
    } else {
      // Hardcoded fallback
      verificationContext = `VERIFICATION STATUS: The customer's phone number has been verified via SMS OTP. You can freely access their account data using lookup_customer.

AFTER LOOKING UP THE CUSTOMER, follow this guided flow:
1. Greet them by name.
2. If they have UPCOMING bookings, mention them briefly (date + service type) and ask if they need help with any of them.
3. If they have multiple VEHICLES in their history, ask which car they want help with before doing anything else.
4. Offer clear action choices (as a short list):
   - "Bestille ny service" (book a new service)
   - "Se mine bestillinger" (view my bookings)
   - "Endre/avbestille en bestilling" (modify or cancel a booking)
   - "Dekkhotell" (wheel storage)
5. If the customer wants to book a new service: reference their most recent completed order and ask "Vil du ha noe lignende?" before proceeding.
6. Do NOT list all previous bookings unless the customer specifically asks for their full booking history.
7. Keep the initial response short and action-oriented — max 3-4 lines before presenting choices.
8. NEVER dump a long list of all past orders unprompted. Summarise briefly and let the customer choose what to explore.`;
    }
  } else {
    // Try to use flow config for pre-verification phase
    const flowPreVerification = flowConfig ? buildPreVerificationFlowPrompt(flowConfig) : null;
    if (flowPreVerification) {
      verificationContext = flowPreVerification;
    } else {
      verificationContext = `VERIFICATION STATUS: The customer has NOT verified their phone via SMS. You can answer general questions about Noddi services using the knowledge base. However, if they ask about their specific bookings, account, or want to make changes, politely tell them they need to verify their phone number first using the phone verification form that will appear. The form will ask for their phone number and send an SMS code. Do NOT try to collect the phone number in the chat — the dedicated form handles this. Do NOT look up customer data without verification.`;
    }
  }

  return `You are Noddi's AI customer assistant. You help customers with questions about Noddi's services (mobile car wash, tire change, tire storage, etc.) and help them look up and manage their bookings.

${langInstruction}

${verificationContext}

INTERACTIVE COMPONENTS:
You can use special markers in your responses that the widget will render as interactive UI elements.

Available markers:
1. ACTION MENU — present choices as clickable pill buttons:
[ACTION_MENU]
Option 1
Option 2
[/ACTION_MENU]

2. PHONE VERIFY — trigger phone number input + SMS OTP verification:
[PHONE_VERIFY]

3. YES/NO — present a binary choice with thumbs up/down buttons:
[YES_NO]Question for the customer?[/YES_NO]

4. EMAIL INPUT — render a validated email input field:
[EMAIL_INPUT]

5. TEXT INPUT — render a text input field with placeholder:
[TEXT_INPUT]Enter your name[/TEXT_INPUT]

6. RATING — render a 5-star rating selector:
[RATING]

7. CONFIRM — render a confirmation card with Confirm/Cancel buttons:
[CONFIRM]Summary of what will happen[/CONFIRM]

RULES FOR MARKERS:
- Do NOT describe these as text — just include the markers and the widget handles the rest.
- Do NOT wrap markers in code blocks, quotes, or backticks. They must appear as plain text.
- Only use one marker type per response when possible for clarity.

CORE RULES:
1. Be friendly, helpful, and concise. Use a warm, professional tone.
2. NEVER invent or fabricate booking data, prices, or service details. Only share information returned by the tools.
3. When a customer asks about their bookings and their phone is verified, use lookup_customer immediately with their verified phone.
4. Use the search_knowledge_base tool to answer general questions about services, pricing, processes, etc.
5. Use the lookup_customer tool when the customer's phone is verified to find their bookings.
6. Use get_booking_details for detailed information about a specific booking.
7. For rescheduling: ALWAYS confirm the new date/time with the customer before calling reschedule_booking. Show them what will change.
8. For cancellations: ALWAYS ask the customer to explicitly confirm they want to cancel. Warn that cancellations may not be reversible.
9. If you cannot answer a question, suggest the customer talk to a human agent or send a message.
10. Format booking information clearly with dates, services, and status.
11. Never ask for sensitive information like passwords or payment details.
12. Keep responses focused and not too long. Use bullet points for lists.
13. You can use emojis sparingly to be friendly.

MULTI-TURN CONTEXT:
- Remember what the customer has already told you in this conversation (name, phone, booking details).
- Don't re-ask for information they've already provided.
- Reference earlier parts of the conversation when relevant ("As we discussed earlier...").
- Track the customer's emotional state — if they repeat themselves or seem frustrated, acknowledge it and offer escalation.

PROACTIVE SUGGESTIONS:
- After answering a question, offer a relevant follow-up. Examples:
  - After showing bookings: "Would you like details on any of these bookings?"
  - After explaining a service: "Would you like me to look up your account to check availability?"
  - After a cancellation: "Is there anything else I can help with, or would you like to rebook?"
- If the customer has upcoming bookings, proactively mention them.
- If the knowledge base search returns no results, acknowledge the gap honestly: "I don't have specific information about that in my knowledge base."

SMART ESCALATION:
- Escalate proactively (suggest human agent) when:
  - The customer asks the same question 3+ times
  - The customer expresses frustration, anger, or dissatisfaction
  - The issue involves billing disputes, refunds, or complaints
  - You've searched the knowledge base and found nothing relevant twice
  - The customer explicitly asks for a human
- When escalating, summarize the conversation context for the human agent.`;
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
      .select('id, organization_id, is_active, ai_flow_config')
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
    const systemPrompt = buildSystemPrompt(language, isVerified, widgetConfig.ai_flow_config as FlowConfig | null);
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
  const stream = new ReadableStream({
    start(controller) {
      // Send conversationId and messageId first
      if (conversationId || messageId) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'meta', conversationId, messageId })}\n\n`));
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

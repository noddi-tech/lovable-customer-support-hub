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

function toOsloTime(utcIso: string): string {
  try {
    const d = new Date(utcIso);
    if (isNaN(d.getTime())) return utcIso;
    return d.toLocaleString('nb-NO', {
      timeZone: 'Europe/Oslo',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
  } catch { return utcIso; }
}

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

/**
 * Post-process AI reply: inject missing user_id, user_group_id, delivery_window_id
 * into BOOKING_SUMMARY JSON. Uses a fresh customer re-lookup when IDs are missing
 * (tool results from earlier requests are not in currentMessages).
 */
async function patchBookingSummary(reply: string, messages: any[], visitorPhone?: string, visitorEmail?: string): Promise<string> {
  const marker = '[BOOKING_SUMMARY]';
  const closingMarker = '[/BOOKING_SUMMARY]';
  const startIdx = reply.indexOf(marker);
  const endIdx = reply.indexOf(closingMarker);
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return reply;

  const jsonStr = reply.slice(startIdx + marker.length, endIdx);
  let summaryData: any;
  try {
    summaryData = JSON.parse(jsonStr);
  } catch {
    console.warn('[patchBookingSummary] Failed to parse BOOKING_SUMMARY JSON, attempting reconstruction from context');
    // Reconstruct from conversation context when AI emits non-JSON
    summaryData = {};
    // Extract IDs from previous user messages (tool results, action selections)
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === 'user' && typeof msg.content === 'string') {
        try {
          const actionData = JSON.parse(msg.content);
          if (actionData.delivery_window_id && !summaryData.delivery_window_id) {
            summaryData.delivery_window_id = actionData.delivery_window_id;
            if (actionData.start_time) summaryData.delivery_window_start = actionData.start_time;
            if (actionData.end_time) summaryData.delivery_window_end = actionData.end_time;
          }
          if (actionData.address_id && !summaryData.address_id) summaryData.address_id = actionData.address_id;
          if (actionData.license_plate && !summaryData.license_plate) summaryData.license_plate = actionData.license_plate;
          if (actionData.sales_item_ids && !summaryData.sales_item_ids) summaryData.sales_item_ids = actionData.sales_item_ids;
          if (actionData.sales_item_id && !summaryData.sales_item_ids) summaryData.sales_item_ids = [actionData.sales_item_id];
        } catch { /* not JSON */ }
      }
    }
    // Try to extract display text from the non-JSON content
    const dateMatch = jsonStr.match(/(\d{1,2}\.\s*\w+\s*\d{4})/);
    if (dateMatch) summaryData.date = dateMatch[1];
    const priceMatch = jsonStr.match(/(\d+)\s*kr/i);
    if (priceMatch) summaryData.price = priceMatch[0];
    const timeMatch = jsonStr.match(/(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})/);
    if (timeMatch) summaryData.time = timeMatch[0];
    console.log('[patchBookingSummary] Reconstructed data:', JSON.stringify(summaryData));
  }

  let patched = false;

  // Extract selected user_group_id from conversation messages (for multi-group users)
  let selectedGroupId: number | undefined;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === 'user' && typeof msg.content === 'string') {
      try {
        const d = JSON.parse(msg.content);
        if (d.action === 'group_selected' && d.user_group_id) {
          selectedGroupId = d.user_group_id;
          break;
        }
      } catch {}
    }
  }

  // ALWAYS re-lookup customer IDs from the API when we have contact info.
  // The AI may emit hallucinated/placeholder IDs — the API lookup is the source of truth.
  if (visitorPhone || visitorEmail) {
    console.log('[patchBookingSummary] Performing fresh customer lookup (always overwrites AI-emitted IDs), selectedGroupId:', selectedGroupId);
    try {
      const lookupResult = JSON.parse(await executeLookupCustomer(visitorPhone, visitorEmail, selectedGroupId));
      if (lookupResult.customer?.userId) {
        summaryData.user_id = lookupResult.customer.userId;
        patched = true;
      }
      if (lookupResult.customer?.userGroupId) {
        summaryData.user_group_id = lookupResult.customer.userGroupId;
        patched = true;
      }
    } catch (e) {
      console.error('[patchBookingSummary] Customer re-lookup failed:', e);
    }
  } else if (!summaryData.user_id || !summaryData.user_group_id) {
    console.warn('[patchBookingSummary] Missing customer IDs but no visitorPhone/visitorEmail available');
  }

  // Extract delivery_window_id from user action messages (time slot selection)
  if (!summaryData.delivery_window_id || summaryData.delivery_window_id === 0) {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === 'user' && typeof msg.content === 'string') {
        try {
          const actionData = JSON.parse(msg.content);
          if (actionData.delivery_window_id) {
            summaryData.delivery_window_id = actionData.delivery_window_id;
            patched = true;
            break;
          }
        } catch { /* not JSON */ }
      }
    }
  }

  if (patched) {
    console.log('[patchBookingSummary] Injected missing fields:', {
      user_id: summaryData.user_id,
      user_group_id: summaryData.user_group_id,
      delivery_window_id: summaryData.delivery_window_id,
    });
    const patchedJson = JSON.stringify(summaryData);
    return reply.slice(0, startIdx) + marker + patchedJson + closingMarker + reply.slice(endIdx + closingMarker.length);
  }

  return reply;
}

/** Post-processor: wrap plain-text yes/no confirmation questions in [YES_NO] markers */
function patchYesNo(reply: string, messages?: any[]): string {
  // If AI already included [YES_NO], clean up: keep ONLY the [YES_NO] block (strip surrounding prose)
  if (reply.includes('[YES_NO]') && reply.includes('[/YES_NO]')) {
    const yesNoMatch = reply.match(/\[YES_NO\]([\s\S]*?)\[\/YES_NO\]/);
    if (yesNoMatch) {
      return `[YES_NO]${yesNoMatch[1]}[/YES_NO]`;
    }
    return reply;
  }
  // Skip if reply already has other interactive markers — YES_NO should only appear alone
  const otherMarkers = ['[ACTION_MENU]', '[TIME_SLOT]', '[BOOKING_EDIT]', '[BOOKING_SUMMARY]', '[SERVICE_SELECT]', '[PHONE_VERIFY]', '[ADDRESS_SEARCH]', '[LICENSE_PLATE]', '[BOOKING_CONFIRMED]', '[CONFIRM]', '[BOOKING_SELECT]'];
  if (otherMarkers.some(m => reply.includes(m))) return reply;

  // Skip if last user message was a time slot selection — we want BOOKING_EDIT not YES_NO
  if (messages) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role !== 'user') continue;
      try { const p = JSON.parse(messages[i].content); if (p.delivery_window_id) return reply; } catch {}
      break;
    }
  }

  // NEW: Skip if the question mentions multiple booking edit options — these are multi-choice, not binary
  if (/(?:tidspunkt|adresse|bil).*(?:tidspunkt|adresse|bil)/is.test(reply)) return reply;

  // Skip if reply contains a numbered list (selection question, not binary)
  if (/\n\s*\d+\.\s/.test(reply)) return reply;

  // Skip if question uses "hvilken/hvilke" (selection, not binary)
  if (/\bhvilke[nt]?\b/i.test(reply)) return reply;

  // Common Norwegian/English confirmation patterns
  const patterns = [
    /Er dette bestillingen du ønsker å endre\??/i,
    /Er dette riktig\??/i,
    /Ønsker du å (bekrefte|endre|avbestille|kansellere)\b.*\??/i,
    /Vil du (bekrefte|endre|avbestille|fortsette)\b.*\??/i,
    /Stemmer dette\??/i,
    /Er det korrekt\??/i,
    /Do you want to (confirm|change|cancel|proceed)\b.*\??/i,
    /Is this correct\??/i,
    /Would you like to (confirm|change|cancel|proceed)\b.*\??/i,
    /Skal vi gå videre\b.*\??/i,
    /(?:Kan|Kunne) du bekrefte\b.*\?/i,
    /(?:Stemmer|Passer) (?:det|dette)\b.*\?/i,
    /Er du sikker\b.*\?/i,
    /Er dette korrekt\??/i,
    /Vil du at vi\b.*\??/i,
  ];

  // Generic fallback: short sentence with confirmation keywords ending with ?
  if (!patterns.some(p => p.test(reply))) {
    const confirmKeywords = /\b(riktig|korrekt|bekrefte|endre|correct|confirm|want to|ønsker|stemmer|passer|sikker)\b/i;
    const shortQuestion = reply.match(/([^\n.]{10,120}\?)\s*$/);
    if (shortQuestion && confirmKeywords.test(shortQuestion[1]) && !/\[/.test(reply)) {
      const question = shortQuestion[1];
      const before = reply.substring(0, shortQuestion.index!).trimEnd();
      const parts = [before, `[YES_NO]${question}[/YES_NO]`].filter(s => s.length > 0);
      return parts.join('\n');
    }
  }

  for (const pattern of patterns) {
    const match = reply.match(pattern);
    if (match) {
      const question = match[0];
      // Replace the plain-text question with a [YES_NO] wrapped version
      const before = reply.substring(0, match.index!).trimEnd();
      const after = reply.substring(match.index! + question.length).trimStart();
      const parts = [before, `[YES_NO]${question}[/YES_NO]`, after].filter(s => s.length > 0);
      return parts.join('\n');
    }
  }
  return reply;
}

// ========== Error logging helper ==========
async function saveErrorDetails(supabase: any, conversationId: string | null, errorType: string, details: string) {
  if (!conversationId) return;
  try {
    // Append to existing error_details (JSON array)
    const { data: existing } = await supabase
      .from('widget_ai_conversations')
      .select('error_details')
      .eq('id', conversationId)
      .single();
    
    let errors: any[] = [];
    if (existing?.error_details) {
      try { errors = JSON.parse(existing.error_details); } catch { errors = []; }
    }
    errors.push({ type: errorType, detail: details, ts: new Date().toISOString() });
    
    await supabase
      .from('widget_ai_conversations')
      .update({ error_details: JSON.stringify(errors) })
      .eq('id', conversationId);
  } catch (e) { console.error('[saveErrorDetails] Failed:', e); }
}

// ========== Post-processor: normalize BOOKING_SUMMARY time/date to Oslo timezone ==========
function patchBookingSummaryTime(reply: string): string {
  const re = /\[BOOKING_SUMMARY\]([\s\S]*?)\[\/BOOKING_SUMMARY\]/;
  const m = reply.match(re);
  if (!m) return reply;
  try {
    const data = JSON.parse(m[1].trim());
    const dwStart = data.delivery_window_start;
    const dwEnd = data.delivery_window_end;
    if (dwStart && dwEnd) {
      const startD = new Date(dwStart);
      const endD = new Date(dwEnd);
      if (!isNaN(startD.getTime()) && !isNaN(endD.getTime())) {
        const fmt = (d: Date) => d.toLocaleString('nb-NO', {
          timeZone: 'Europe/Oslo',
          hour: '2-digit', minute: '2-digit', hour12: false
        });
        data.time = `${fmt(startD)}\u2013${fmt(endD)}`;
      }
    }
    if (dwStart && (!data.date || /^\d{4}-\d{2}-\d{2}/.test(data.date))) {
      const d = new Date(dwStart);
      data.date = d.toLocaleDateString('nb-NO', {
        timeZone: 'Europe/Oslo',
        year: 'numeric', month: '2-digit', day: '2-digit'
      });
    }
    return reply.replace(re, `[BOOKING_SUMMARY]${JSON.stringify(data)}[/BOOKING_SUMMARY]`);
  } catch { return reply; }
}

// ========== Helper: check if cancel_booking succeeded in current turn ==========
function didCancelBookingSucceed(messages: any[]): boolean {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === 'assistant') break; // only check current turn
    if (msg.role === 'tool' && typeof msg.content === 'string') {
      try {
        const r = JSON.parse(msg.content);
        if (r.success && (r.action === 'cancelled' || r.message?.toLowerCase().includes('cancelled') || r.message?.toLowerCase().includes('kansellert'))) return true;
      } catch {}
    }
  }
  return false;
}

// ========== Post-processor: auto-wrap plain-text booking details in [BOOKING_INFO] ==========
function patchBookingInfo(reply: string, messages: any[]): string {
  // If already contains BOOKING_INFO marker, skip
  if (reply.includes('[BOOKING_INFO]')) return reply;
  if (reply.includes('[BOOKING_CONFIRMED]')) return reply;
  // Skip if cancel_booking succeeded — booking is gone, don't show card
  if (didCancelBookingSucceed(messages)) return reply;
  // Skip during active edit sub-flows to prevent cluttered UI
  const activeFlowMarkers = ['[TIME_SLOT]', '[BOOKING_EDIT]', '[ADDRESS_SEARCH]', '[LICENSE_PLATE]', '[SERVICE_SELECT]', '[BOOKING_SUMMARY]'];
  if (activeFlowMarkers.some(m => reply.includes(m))) return reply;
  
  // CONTEXT-BASED: Check if ANY tool result has booking data
  // This fires regardless of what the AI wrote in its reply — no more regex whack-a-mole
  let bookingData: any = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === 'tool' && typeof msg.content === 'string') {
      try {
        const toolResult = JSON.parse(msg.content);
        // Handle multiple bookings: if 2+ bookings, show selection menu
        if (toolResult.bookings && toolResult.bookings.length > 1) {
          const bookingsPayload = toolResult.bookings.map((b: any) => ({
            id: b.id,
            service: Array.isArray(b.services) ? b.services.join(', ') : (b.service || 'Bestilling'),
            date: b.scheduledAt?.split(',')[0] || b.timeSlot || '',
            time: b.timeSlot || '',
            address: b.address || '',
            vehicle: b.vehicle || '',
            license_plate: b.license_plate || '',
          }));
          const marker = `Du har ${toolResult.bookings.length} aktive bestillinger. Velg hvilke(n) det gjelder:\n\n[BOOKING_SELECT]${JSON.stringify(bookingsPayload)}[/BOOKING_SELECT]`;
          console.log('[patchBookingInfo] Multiple bookings detected, showing BOOKING_SELECT carousel');
          return marker;
        }
        
        let candidate: any = null;
        if (toolResult.booking) candidate = toolResult.booking;
        else if (toolResult.bookings?.[0]) candidate = toolResult.bookings[0];
        else if (toolResult.id && toolResult.scheduledAt) candidate = toolResult;
        
        if (candidate) {
          if (!bookingData) bookingData = candidate;
          // Prefer results that have address + vehicle (lookup_customer shape)
          if (candidate.address && candidate.vehicle) {
            bookingData = candidate;
            break; // Found the richest result
          }
          // Also accept address + license_plate as rich enough
          if (candidate.address && (candidate.vehicle || candidate.license_plate)) {
            bookingData = candidate;
            break;
          }
        }
      } catch { /* not JSON */ }
    }
  }
  
  if (!bookingData) return reply;
  console.log('[patchBookingInfo] CONTEXT-BASED trigger: found booking data in tool results, injecting [BOOKING_INFO]');
  console.log('[patchBookingInfo] bookingData keys:', Object.keys(bookingData), 
    'has car:', !!bookingData.car, 'has cars:', !!bookingData.cars,
    'has vehicle:', !!bookingData.vehicle, 'has services:', !!bookingData.services,
    'has order_lines:', !!bookingData.order_lines, 'has items:', !!bookingData.items,
    'has sales_items:', !!bookingData.sales_items);
  
  // bookingData already extracted above
  
  // Build BOOKING_INFO marker from actual data (handle both lookup_customer and get_booking_details field shapes)
  const info: any = {};
  if (bookingData.id) info.booking_id = bookingData.id;
  // Address: lookup_customer returns string, get_booking_details may return object
  if (bookingData.address) {
    info.address = typeof bookingData.address === 'string' ? bookingData.address : (bookingData.address.address || bookingData.address.full_address || '');
  }
  // Date: lookup_customer returns scheduledAt (formatted), get_booking_details returns start_time
  if (bookingData.scheduledAt) {
    // Already formatted by toOsloTime, extract just the date part
    const datePart = bookingData.scheduledAt.split(',')[0] || bookingData.scheduledAt;
    info.date = datePart.trim();
  } else if (bookingData.start_time) {
    try {
      const d = new Date(bookingData.start_time);
      info.date = d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { /* ignore */ }
  }
  // Time: lookup_customer returns timeSlot (pre-formatted range), get_booking_details returns start_time/end_time
  if (bookingData.timeSlot) {
    info.time = bookingData.timeSlot;
  } else if (bookingData.start_time && bookingData.end_time) {
    try {
      const s = new Date(bookingData.start_time);
      const e = new Date(bookingData.end_time);
      info.time = `${s.getHours().toString().padStart(2,'0')}:${s.getMinutes().toString().padStart(2,'0')}–${e.getHours().toString().padStart(2,'0')}:${e.getMinutes().toString().padStart(2,'0')}`;
    } catch { /* ignore */ }
  }
   // Services: lookup_customer returns services[] as strings, get_booking_details returns sales_items/order_lines/items
  const svcSource = bookingData.services || bookingData.order_lines || bookingData.items || bookingData.sales_items || [];
  if (Array.isArray(svcSource) && svcSource.length > 0) {
    const allNames = svcSource
      .map((s: any) => typeof s === 'string' ? s : (s.service_name || s.name || ''))
      .filter(Boolean);
    if (allNames.length > 0) info.service = allNames.join(', ');
  }
  // Vehicle: lookup_customer returns vehicle as string, get_booking_details returns cars[], Noddi raw returns car object
  if (bookingData.vehicle) {
    info.car = typeof bookingData.vehicle === 'string' ? bookingData.vehicle : `${bookingData.vehicle.make || ''} ${bookingData.vehicle.model || ''} (${bookingData.vehicle.licensePlate || ''})`.trim();
  } else if (bookingData.car && typeof bookingData.car === 'object') {
    const c = bookingData.car;
    const plate = extractPlateString(c.license_plate_number || c.license_plate || c.registration);
    info.car = `${c.make || ''} ${c.model || ''} ${plate ? `(${plate})` : ''}`.trim();
  } else if (bookingData.cars?.[0]) {
    const car = bookingData.cars[0];
    const plate = extractPlateString(car.license_plate_number || car.license_plate || car.registration);
    info.car = `${car.make || ''} ${car.model || ''} ${plate ? `(${plate})` : ''}`.trim();
  }
  // Fallback: show license plate if no car name available
  if (!info.car && bookingData.license_plate) {
    info.car = bookingData.license_plate;
  }
  // Handle booking_items_car (raw Noddi shape from update_booking/get_booking_details)
  if (!info.car && Array.isArray(bookingData.booking_items_car) && bookingData.booking_items_car[0]?.car) {
    const bic = bookingData.booking_items_car[0].car;
    const plate = extractPlateString(bic.license_plate_number || bic.license_plate || bic.registration);
    info.car = `${bic.make || ''} ${bic.model || ''} ${plate ? `(${plate})` : ''}`.trim();
  }
  // Handle delivery_window_starts_at/ends_at (raw Noddi shape)
  if (!info.time && bookingData.delivery_window_starts_at && bookingData.delivery_window_ends_at) {
    try {
      const s = new Date(bookingData.delivery_window_starts_at);
      const e = new Date(bookingData.delivery_window_ends_at);
      info.time = `${s.toLocaleTimeString('nb-NO', {hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Europe/Oslo'})}–${e.toLocaleTimeString('nb-NO', {hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Europe/Oslo'})}`;
      if (!info.date) info.date = s.toLocaleDateString('nb-NO', {day:'numeric',month:'short',year:'numeric',timeZone:'Europe/Oslo'});
    } catch {}
  }
  // Handle service_categories (raw Noddi shape) - join ALL names
  if (!info.service && Array.isArray(bookingData.service_categories) && bookingData.service_categories.length > 0) {
    const catNames = bookingData.service_categories.map((sc: any) => sc.name || sc.label || '').filter(Boolean);
    if (catNames.length > 0) info.service = catNames.join(', ');
  }
  // Handle booking_items_car[].sales_items for service names - join ALL names
  if (!info.service && Array.isArray(bookingData.booking_items_car)) {
    const allSiNames: string[] = [];
    for (const bic of bookingData.booking_items_car) {
      if (Array.isArray(bic.sales_items)) {
        for (const si of bic.sales_items) { if (si.name) allSiNames.push(si.name); }
      }
    }
    if (allSiNames.length > 0) info.service = allSiNames.join(', ');
  }
  // Handle raw address object (not already a string or with full_address)
  if (!info.address && bookingData.address && typeof bookingData.address === 'object' && !bookingData.address.full_address && !bookingData.address.address) {
    const a = bookingData.address;
    const addr = `${a.street_name || ''} ${a.street_number || ''}, ${a.zip_code || ''} ${a.city || ''}`.replace(/\s+/g,' ').trim().replace(/^,|,$/g,'').trim();
    if (addr) info.address = addr;
  }
  
  const infoMarker = `[BOOKING_INFO]${JSON.stringify(info)}[/BOOKING_INFO]`;
  
  // Remove the plain-text lines and inject the marker
  let cleaned = reply;
  // Remove lines that look like bullet-point booking details
  cleaned = cleaned.replace(/^[\s-]*(?:📍\s*)?Adresse\s*:.*$/gim, '');
  cleaned = cleaned.replace(/^[\s-]*(?:📅\s*)?Dato\s*:.*$/gim, '');
  cleaned = cleaned.replace(/^[\s-]*(?:🕐\s*)?Tid\s*:.*$/gim, '');
  cleaned = cleaned.replace(/^[\s-]*(?:🛠️?\s*)?Tjeneste\s*:.*$/gim, '');
  cleaned = cleaned.replace(/^[\s-]*(?:🚗\s*)?Bil\s*:.*$/gim, '');
  cleaned = cleaned.replace(/^[\s-]*(?:💰\s*)?Pris\s*:.*$/gim, '');
  // Remove "couldn't access" failure messages
  cleaned = cleaned.replace(/^.*(?:ikke fikk tilgang|couldn't access|ikke finne detalj|kunne ikke hente).*$/gim, '');
  // Remove "Her er din bestilling:" type intro lines
  cleaned = cleaned.replace(/^.*(?:Her er|detaljer).*:?\s*$/gim, '');
  // Remove natural language booking descriptions
  cleaned = cleaned.replace(/^.*(?:planlagt bestilling|har en bestilling|din bestilling|bestilling den).*$/gim, '');
  // Clean up excessive whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  
  // Insert BOOKING_INFO before ACTION_MENU if present, otherwise prepend
  const actionIdx = cleaned.indexOf('[ACTION_MENU]');
  if (actionIdx > -1) {
    cleaned = cleaned.slice(0, actionIdx) + infoMarker + '\n\n' + cleaned.slice(actionIdx);
  } else {
    // No ACTION_MENU — prepend the booking info and add a helpful prompt
    cleaned = infoMarker + '\n\n' + (cleaned || 'Hva ønsker du å gjøre med denne bestillingen?');
  }
  
  console.log('[patchBookingInfo] Auto-wrapped booking details into [BOOKING_INFO]');
  return cleaned;
}

// ========== Post-processor: auto-inject [ACTION_MENU] when booking context is present ==========
function patchActionMenu(reply: string, messages: any[]): string {
  // Skip if BOOKING_SELECT is present (user is choosing which booking)
  if (reply.includes('[BOOKING_SELECT]')) return reply;
  // Skip if cancel_booking succeeded — booking is gone, don't show action menu
  if (didCancelBookingSucceed(messages)) return reply;
  // Only inject if BOOKING_INFO is present (meaning we're in booking context)
  // and there's no ACTION_MENU already
  const hasCompleteActionMenu = reply.includes('[ACTION_MENU]') && reply.includes('[/ACTION_MENU]');
  // If an ACTION_MENU already exists, validate it has cancel option
  if (hasCompleteActionMenu) {
    const menuMatch = reply.match(/\[ACTION_MENU\]([\s\S]*?)\[\/ACTION_MENU\]/);
    const menuContent = menuMatch?.[1] || '';
    const hasCancel = /avbestill|kanseller|cancel/i.test(menuContent);
    if (hasCancel) return reply; // Menu is complete with all options
    // Menu is missing cancel — replace with standard set
    const fullMenu = `[ACTION_MENU]\nEndre tidspunkt\nEndre adresse\nEndre bil\nLegg til tjenester\nAvbestille bestilling\n[/ACTION_MENU]`;
    return reply.replace(/\[ACTION_MENU\][\s\S]*?\[\/ACTION_MENU\]/, fullMenu);
  }
  if (!reply.includes('[BOOKING_INFO]')) return reply;
  if (reply.includes('[BOOKING_CONFIRMED]')) return reply;
  // Skip during active edit sub-flows
  const activeFlowMarkers = ['[TIME_SLOT]', '[BOOKING_EDIT]', '[ADDRESS_SEARCH]', '[LICENSE_PLATE]', '[SERVICE_SELECT]', '[BOOKING_SUMMARY]'];
  if (activeFlowMarkers.some(m => reply.includes(m))) return reply;
  
  // Check that we have booking data in tool results (confirms booking edit context)
  let hasBooking = false;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'tool') {
      try {
        const r = JSON.parse(messages[i].content);
        if (r.bookings?.[0] || r.booking || (r.id && r.scheduledAt)) {
          hasBooking = true; break;
        }
      } catch {}
    }
  }
  if (!hasBooking) return reply;
  
  // Strip any YES_NO block, bare [ACTION_MENU] markers, and plain-text questions about changes
  let cleaned = reply;
  cleaned = cleaned.replace(/\[YES_NO\].*?\[\/YES_NO\]/gs, '');
  // Remove bare/malformed [ACTION_MENU] without proper closing tag
  cleaned = cleaned.replace(/\[ACTION_MENU\](?![\s\S]*?\[\/ACTION_MENU\])/g, '');
  cleaned = cleaned.replace(/^.*(?:Vil du endre|Hva ønsker du|What would you like|What do you want to change|Vil du gjøre endringer|Hva vil du).*$/gim, '');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  
  // Append ACTION_MENU with standard booking edit options
  const menu = `\n\n[ACTION_MENU]\nEndre tidspunkt\nEndre adresse\nEndre bil\nLegg til tjenester\nAvbestille bestilling\n[/ACTION_MENU]`;
  cleaned += menu;
  
  console.log('[patchActionMenu] Injected [ACTION_MENU] after [BOOKING_INFO]');
  return cleaned;
}

// ========== Post-processor: auto-inject [GROUP_SELECT] when needs_group_selection ==========
function patchGroupSelect(reply: string, messages: any[]): string {
  if (reply.includes('[GROUP_SELECT]')) return reply;
  
  // Only check tool results from the CURRENT turn (stop at previous assistant message)
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    // Stop searching when we hit an assistant message — we've gone past current turn
    if (msg.role === 'assistant') break;
    if (msg.role === 'tool') {
      try {
        const parsed = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content;
        if (parsed.needs_group_selection && parsed.user_groups) {
          const customerName = parsed.customer?.name || '';
          const payload = JSON.stringify({ groups: parsed.user_groups });
          // REPLACE the entire AI reply with a proper Norwegian prompt + the group select block
          const greeting = customerName 
            ? `Hei, ${customerName}! Vi ser at du har flere brukergrupper tilknyttet din konto. Hvem vil du representere?`
            : `Vi ser at du har flere brukergrupper tilknyttet din konto. Hvem vil du representere?`;
          console.log('[patchGroupSelect] Replacing reply with group select prompt for', parsed.user_groups.length, 'groups');
          return `${greeting}\n[GROUP_SELECT]${payload}[/GROUP_SELECT]`;
        }
      } catch { /* ignore */ }
    }
  }
  return reply;
}

// ========== Post-processor: fix hallucinated IDs in [BOOKING_CONFIRMED] ==========
function patchBookingConfirmed(reply: string, messages: any[]): string {
  const marker = '[BOOKING_CONFIRMED]';
  const closingMarker = '[/BOOKING_CONFIRMED]';
  const startIdx = reply.indexOf(marker);
  const endIdx = reply.indexOf(closingMarker);
  
  // === FIX 3a: If marker exists, patch its data with real values ===
  if (startIdx !== -1 && endIdx !== -1) {
    const jsonStr = reply.slice(startIdx + marker.length, endIdx);
    let data: any;
    try { data = JSON.parse(jsonStr); } catch { return reply; }

    // Extract real booking data from ALL tool results, merging from multiple sources
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === 'tool' && typeof msg.content === 'string') {
        try {
          const toolResult = JSON.parse(msg.content);
          
          if (toolResult.booking) {
            const b = toolResult.booking;
            if (!data.booking_id && b.id) data.booking_id = b.id;
            if (!data.booking_number && b.reference) data.booking_number = b.reference;
            if (!data.address && b.address) {
              if (typeof b.address === 'string') data.address = b.address;
              else if (b.address && typeof b.address === 'object') {
                const sn = b.address.street_name || '';
                const num = b.address.street_number || '';
                const zip = b.address.zip_code || '';
                const city = b.address.city || '';
                data.address = `${sn} ${num}, ${zip} ${city}`.replace(/\s+/g, ' ').trim().replace(/^,|,$/g, '').trim() || null;
              }
            }
            if (!data.car && b.car && typeof b.car === 'object') {
              const plate = extractPlateString(b.car.license_plate_number || b.car.license_plate || b.car.registration);
              data.car = `${b.car.make || ''} ${b.car.model || ''} ${plate ? `(${plate})` : ''}`.trim();
            }
            if (!data.car && b.cars?.[0]) {
              const c = b.cars[0];
              const plate = extractPlateString(c.license_plate_number || c.license_plate || c.registration);
              data.car = `${c.make || ''} ${c.model || ''} ${plate ? `(${plate})` : ''}`.trim();
            }
          }
          
          const booking = toolResult.bookings?.[0];
          if (booking) {
            if (!data.booking_id && booking.id) data.booking_id = booking.id;
            if (!data.booking_number && booking.reference) data.booking_number = booking.reference;
            if (!data.address && booking.address) {
              data.address = typeof booking.address === 'string' ? booking.address
                : (booking.address.full_address || booking.address.address || null);
            }
            if (!data.car && booking.vehicle) data.car = booking.vehicle;
            if (!data.date && booking.scheduledAt) data.date = (booking.scheduledAt.split(',')[0] || booking.scheduledAt).trim();
            if (!data.time && booking.timeSlot) data.time = booking.timeSlot;
            if (!data.service && booking.services?.[0]) {
              data.service = typeof booking.services[0] === 'string' ? booking.services[0] : (booking.services[0].name || null);
            }
          }
          
          if (!data.booking_id && (toolResult.booking_id || (toolResult.id && !toolResult.scheduledAt))) {
            data.booking_id = toolResult.booking_id || toolResult.id;
            if (!data.booking_number && (toolResult.booking_number || toolResult.reference)) {
              data.booking_number = toolResult.booking_number || toolResult.reference;
            }
          }
        } catch { /* not JSON */ }
      }
    }

    const patched = reply.slice(0, startIdx) + marker + JSON.stringify(data) + reply.slice(endIdx);
    console.log('[patchBookingConfirmed] Overrode booking confirmed data with real values');
    return patched;
  }
  
  // === FIX 3b: Context-based injection — if update_booking was called but AI didn't output the marker ===
  let hasUpdateResult = false;
  const data: any = {};
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== 'tool') continue;
    try {
      const r = JSON.parse(msg.content);
      // Check for update_booking result shape
      if (r.booking && (r.booking.id || r.booking.reference)) {
        hasUpdateResult = true;
        const b = r.booking;
        if (!data.booking_id && b.id) data.booking_id = b.id;
        if (!data.booking_number && b.reference) data.booking_number = b.reference;
        if (!data.address && b.address) {
          if (typeof b.address === 'string') data.address = b.address;
          else if (b.address && typeof b.address === 'object') {
            const sn = b.address.street_name || '';
            const num = b.address.street_number || '';
            const zip = b.address.zip_code || '';
            const city = b.address.city || '';
            data.address = `${sn} ${num}, ${zip} ${city}`.replace(/\s+/g, ' ').trim().replace(/^,|,$/g, '').trim() || null;
          }
        }
        if (!data.car && b.car && typeof b.car === 'object') {
          const plate = extractPlateString(b.car.license_plate_number || b.car.license_plate || b.car.registration);
          data.car = `${b.car.make || ''} ${b.car.model || ''} ${plate ? `(${plate})` : ''}`.trim();
        }
        if (!data.car && b.cars?.[0]) {
          const c = b.cars[0];
          const plate = extractPlateString(c.license_plate_number || c.license_plate || c.registration);
          data.car = `${c.make || ''} ${c.model || ''} ${plate ? `(${plate})` : ''}`.trim();
        }
        // Handle booking_items_car (raw Noddi shape)
        if (!data.car && Array.isArray(b.booking_items_car) && b.booking_items_car[0]?.car) {
          const bic = b.booking_items_car[0].car;
          const plate = extractPlateString(bic.license_plate_number || bic.license_plate || bic.registration);
          data.car = `${bic.make || ''} ${bic.model || ''} ${plate ? `(${plate})` : ''}`.trim();
        }
        if (!data.service && Array.isArray(b.service_categories) && b.service_categories[0]?.name) {
          data.service = b.service_categories[0].name;
        }
        if (!data.service && Array.isArray(b.booking_items_car)) {
          for (const bic of b.booking_items_car) {
            if (Array.isArray(bic.sales_items) && bic.sales_items[0]?.name) {
              data.service = bic.sales_items[0].name;
              break;
            }
          }
        }
        if (!data.time && b.delivery_window_starts_at && b.delivery_window_ends_at) {
          try {
            const s = new Date(b.delivery_window_starts_at);
            const e = new Date(b.delivery_window_ends_at);
            data.time = `${s.toLocaleTimeString('nb-NO', {hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Europe/Oslo'})}–${e.toLocaleTimeString('nb-NO', {hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Europe/Oslo'})}`;
            if (!data.date) data.date = s.toLocaleDateString('nb-NO', {day:'numeric',month:'short',year:'numeric',timeZone:'Europe/Oslo'});
          } catch {}
        }
      }
      // Merge rich data from lookup_customer results
      const booking = r.bookings?.[0];
      if (booking) {
        if (!data.booking_id && booking.id) data.booking_id = booking.id;
        if (!data.booking_number && booking.reference) data.booking_number = booking.reference;
        if (!data.address && booking.address) {
          data.address = typeof booking.address === 'string' ? booking.address : null;
        }
        if (!data.car && booking.vehicle) data.car = booking.vehicle;
        if (!data.date && booking.scheduledAt) data.date = (booking.scheduledAt.split(',')[0] || booking.scheduledAt).trim();
        if (!data.time && booking.timeSlot) data.time = booking.timeSlot;
        if (!data.service && booking.services?.[0]) {
          data.service = typeof booking.services[0] === 'string' ? booking.services[0] : (booking.services[0].name || null);
        }
      }
    } catch {}
  }
  
  if (hasUpdateResult && Object.keys(data).length > 0) {
    console.log('[patchBookingConfirmed] CONTEXT-BASED: update_booking detected, injecting [BOOKING_CONFIRMED]');
    // Strip the AI's plain text summary about the update
    let cleaned = reply;
    cleaned = cleaned.replace(/^.*(?:oppdatert|updated|endret|changed|bekreftet|confirmed).*$/gim, '');
    cleaned = cleaned.replace(/^.*(?:Bestilling|Booking)\s*(?:ID|nummer|#).*$/gim, '');
    cleaned = cleaned.replace(/^.*(?:nye? tid|new time|ny dato|new date).*$/gim, '');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
    return `${marker}${JSON.stringify(data)}${closingMarker}\n\n${cleaned || ''}`.trim();
  }
  
  return reply;
}

// ========== Helper: safely extract license plate string from string, object, or null ==========
function extractPlateString(p: any): string {
  if (!p) return '';
  if (typeof p === 'string') return p;
  if (typeof p === 'object') return p.number || p.license_plate_number || '';
  return '';
}

// ========== Post-processor: auto-inject [BOOKING_EDIT] after time slot selection ==========
function patchTimeSlotConfirmToEdit(reply: string, messages: any[]): string {
  if (reply.includes('[BOOKING_EDIT]')) return reply;
  if (reply.includes('[TIME_SLOT]')) return reply;

  // Check if the user's last message is a time slot selection
  let timeSlotSelection: any = null;
  let bookingData: any = null;

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === 'user' && !timeSlotSelection) {
      try {
        const parsed = JSON.parse(msg.content);
        if (parsed.delivery_window_id) {
          timeSlotSelection = parsed;
        }
      } catch {}
      if (!timeSlotSelection) break; // Last user message wasn't time selection
    }
    if (msg.role === 'tool' && !bookingData) {
      try {
        const r = JSON.parse(msg.content);
        if (r.bookings?.[0]) bookingData = r.bookings[0];
        else if (r.booking) bookingData = r.booking;
      } catch {}
    }
  }

  if (!timeSlotSelection || !bookingData) return reply;

  const fmtOslo = (iso: string) => {
    try { return new Date(iso).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Oslo' }); }
    catch { return iso; }
  };
  const fmtDateOslo = (iso: string) => {
    try { return new Date(iso).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Oslo' }); }
    catch { return iso; }
  };

  const newTime = timeSlotSelection.start_time && timeSlotSelection.end_time
    ? `${fmtOslo(timeSlotSelection.start_time)}\u2013${fmtOslo(timeSlotSelection.end_time)}`
    : '';
  const newDate = timeSlotSelection.start_time ? fmtDateOslo(timeSlotSelection.start_time) : '';

  const editData = {
    booking_id: bookingData.id,
    changes: {
      time: newTime,
      old_time: bookingData.timeSlot || '',
      date: newDate,
      old_date: bookingData.scheduledAt ? (bookingData.scheduledAt.split(',')[0] || '').trim() : '',
      delivery_window_id: timeSlotSelection.delivery_window_id,
      delivery_window_start: timeSlotSelection.start_time,
      delivery_window_end: timeSlotSelection.end_time,
    }
  };

  console.log('[patchTimeSlotConfirmToEdit] Auto-injecting BOOKING_EDIT from time slot selection');
  return `[BOOKING_EDIT]${JSON.stringify(editData)}[/BOOKING_EDIT]`;
}


async function patchBookingEdit(reply: string, messages: any[], visitorPhone?: string, visitorEmail?: string): Promise<string> {
  const marker = '[BOOKING_EDIT]';
  const closingMarker = '[/BOOKING_EDIT]';
  const startIdx = reply.indexOf(marker);
  const endIdx = reply.indexOf(closingMarker);
  if (startIdx === -1 || endIdx === -1) return reply;

  const jsonStr = reply.slice(startIdx + marker.length, endIdx);
  let editData: any;
  try { editData = JSON.parse(jsonStr); } catch { return reply; }

  // Extract the real booking ID from tool results — ONLY trust booking.id and bookings[].id
  let realBookingId: number | null = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === 'tool' && typeof msg.content === 'string') {
      try {
        const toolResult = JSON.parse(msg.content);
        if (toolResult.booking?.id) {
          realBookingId = toolResult.booking.id;
          break;
        }
        if (toolResult.bookings?.length > 0) {
          realBookingId = toolResult.bookings[0].id;
          break;
        }
        // NOTE: removed broad toolResult.id fallback — it matched car/address IDs
      } catch { /* not JSON */ }
    }
  }

  // Fallback: fresh customer lookup if no booking ID found anywhere
  if (!realBookingId) {
    const phone = visitorPhone || '';
    const email = visitorEmail || '';
    if (phone || email) {
      try {
        const lookupResult = JSON.parse(await executeLookupCustomer(phone, email));
        if (lookupResult.bookings?.length > 0) {
          realBookingId = lookupResult.bookings[0].id;
          console.log('[patchBookingEdit] Fresh lookup found booking_id:', realBookingId);
        }
      } catch (e) { console.error('[patchBookingEdit] Fresh lookup failed:', e); }
    }
  }

  // Always override if we found a real ID
  if (realBookingId) {
    console.log('[patchBookingEdit] Setting booking_id to:', realBookingId, '(was:', editData.booking_id, ')');
    editData.booking_id = realBookingId;
  }

  const changes = editData.changes || {};

  // Inject start/end from conversation if missing
  if (changes.delivery_window_id && (!changes.delivery_window_start || !changes.delivery_window_end)) {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role !== 'user' || typeof msg.content !== 'string') continue;
      try {
        const sel = JSON.parse(msg.content);
        if (sel.delivery_window_id == changes.delivery_window_id && sel.start_time && sel.end_time) {
          changes.delivery_window_start = sel.start_time;
          changes.delivery_window_end = sel.end_time;
          console.log('[patchBookingEdit] Injected start/end from conversation:', sel.start_time, sel.end_time);
          break;
        }
      } catch { /* not JSON */ }
    }
  }

  // Always fix the display 'time' field to use Oslo timezone
  const fmtOslo = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Oslo' });
  };
  const fmtDateOslo = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Oslo' });
  };

  if (changes.delivery_window_start && changes.delivery_window_end) {
    changes.time = `${fmtOslo(changes.delivery_window_start)}\u2013${fmtOslo(changes.delivery_window_end)}`;
    // Auto-populate date if missing
    if (!changes.date) {
      changes.date = fmtDateOslo(changes.delivery_window_start);
    }
  }

  // Auto-populate old_date from old delivery window if available in conversation
  if (changes.date && !changes.old_date) {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === 'tool' && typeof msg.content === 'string') {
        try {
          const toolResult = JSON.parse(msg.content);
          const booking = toolResult.booking || toolResult;
          const oldStart = booking.delivery_window_starts_at || booking.start_time || booking.delivery_window?.starts_at;
          if (oldStart) {
            changes.old_date = fmtDateOslo(oldStart);
            console.log('[patchBookingEdit] Injected old_date:', changes.old_date);
            break;
          }
        } catch { /* not JSON */ }
      }
    }
  }

  editData.changes = changes;
  const patched = reply.slice(0, startIdx) + marker + JSON.stringify(editData) + closingMarker + reply.slice(endIdx + closingMarker.length);
  return patched;
}

async function executeLookupCustomer(phone?: string, email?: string, specifiedUserGroupId?: number): Promise<string> {
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
      // Normalize common Norwegian formats but also accept any international prefix
      if (cleanPhone.startsWith('0047')) cleanPhone = '+47' + cleanPhone.slice(4);
      else if (cleanPhone.startsWith('+')) { /* already has international prefix */ }
      else if (/^\d{8}$/.test(cleanPhone)) cleanPhone = '+47' + cleanPhone; // bare 8-digit Norwegian
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

    // If multiple user groups and no specific group requested, ask the user to choose
    if (!specifiedUserGroupId && userGroups.length > 1) {
      const groupOptions = userGroups.map((g: any) => ({
        id: g.id,
        name: g.name || `Gruppe ${g.id}`,
        is_personal: g.is_personal || false,
        is_default: g.is_default_user_group || false,
        total_bookings: g.bookings_summary?.total_bookings || 0,
      }));
      return JSON.stringify({
        found: true,
        needs_group_selection: true,
        customer: {
          name: `${noddihUser.first_name || ''} ${noddihUser.last_name || ''}`.trim() || noddihUser.name || '',
          email: noddihUser.email,
          phone: noddihUser.phone,
          userId: noddihUser.id,
        },
        user_groups: groupOptions,
        message: `Kunden er medlem av ${groupOptions.length} grupper. Be kunden velge hvilken gruppe det gjelder.`,
      });
    }

    const userGroupId = specifiedUserGroupId
      || userGroups.find((g: any) => g.is_default_user_group)?.id
      || userGroups.find((g: any) => g.is_personal)?.id
      || userGroups[0]?.id;

    // Extract bookings directly from the customer-lookup-support response
    // (no second API call — same approach as the inbox's noddi-customer-lookup)
    let bookings: any[] = [];
    const seenBookingIds = new Set<number>();

    // 1. Only collect bookings from the SELECTED user group (not all groups)
    const selectedGroup = userGroups.find((g: any) => g.id === userGroupId);
    if (selectedGroup) {
      const pb = selectedGroup.bookings_summary?.priority_booking;
      if (pb?.id && !seenBookingIds.has(pb.id)) {
        bookings.push(pb);
        seenBookingIds.add(pb.id);
      }
      const upcoming = selectedGroup.bookings_summary?.upcoming_bookings;
      if (Array.isArray(upcoming)) {
        for (const ub of upcoming) {
          if (ub?.id && !seenBookingIds.has(ub.id)) {
            bookings.push(ub);
            seenBookingIds.add(ub.id);
          }
        }
      }
    }

    // 2. Supplement with unpaid_bookings filtered to selected group only
    for (const ub of (lookupData.unpaid_bookings || [])) {
      if (ub?.id && !seenBookingIds.has(ub.id) && (!ub.user_group_id || ub.user_group_id === userGroupId)) {
        bookings.push(ub);
        seenBookingIds.add(ub.id);
      }
    }

    console.log(`[lookup] Extracted ${bookings.length} bookings from customer-lookup-support response`);

    // 3. ALWAYS fetch full booking list from bookings-for-customer
    // (customer-lookup-support only returns priority_booking, not all bookings)
    if (userGroupId) {
      try {
        const bfcResp = await fetch(`${API_BASE}/v1/user-groups/${userGroupId}/bookings-for-customer/?page_size=20`, {
          headers: { 'Authorization': `Token ${noddiToken}`, 'Accept': 'application/json' },
        });
        if (bfcResp.ok) {
          const bfcData = await bfcResp.json();
          const results = Array.isArray(bfcData) ? bfcData : (bfcData.results || []);
          for (const fb of results) {
            if (fb?.id && seenBookingIds.has(fb.id)) {
              // Replace with richer data from this endpoint
              const idx = bookings.findIndex((b: any) => b.id === fb.id);
              if (idx >= 0) bookings[idx] = fb;
            } else if (fb?.id && !seenBookingIds.has(fb.id)) {
              bookings.push(fb);
              seenBookingIds.add(fb.id);
            }
          }
          console.log(`[lookup] Full bookings from bookings-for-customer: ${results.length} results`);
          if (results.length > 0) {
            console.log('[lookup] Sample booking keys:', Object.keys(results[0]));
            console.log('[lookup] Sample booking car fields:', JSON.stringify({
              car: results[0].car,
              cars: results[0].cars,
              booking_items_car: results[0].booking_items_car,
              booking_items: results[0].booking_items,
              address: results[0].address,
              user_group_address: results[0].user_group_address,
            }));
          }
        }
      } catch (e) { console.error('[lookup] bookings-for-customer failed:', e); }
    }

    const name = `${noddihUser.first_name || ''} ${noddihUser.last_name || ''}`.trim()
      || noddihUser.name || '';

    // Extract unique stored addresses and cars
    const storedAddresses = new Map<number, any>();
    const storedCars = new Map<number, any>();

    // Extract cars from the customer's own bookings only (not the group-wide endpoint)
    for (const b of bookings) {
      if (b.address?.id) {
        const streetNum = b.address.street_number || '';
        const streetName = b.address.street_name || '';
        const zip = b.address.zip_code || '';
        const city = b.address.city || '';
        const label = `${streetName} ${streetNum}, ${zip} ${city}`.replace(/\s+/g, ' ').trim().replace(/^,|,$/g, '').trim();
        storedAddresses.set(b.address.id, {
          id: b.address.id,
          full_address: label,
          street: streetName,
          city,
          zip,
        });
      }
      if (b.car?.id) {
        storedCars.set(b.car.id, {
          id: b.car.id,
          make: b.car.make || '',
          model: b.car.model || '',
          license_plate: extractPlateString(b.car.license_plate_number || b.car.license_plate || b.car.registration),
        });
      }
      // Handle cars array (some Noddi bookings use plural)
      if (Array.isArray(b.cars)) {
        for (const car of b.cars) {
          if (car?.id && !storedCars.has(car.id)) {
            storedCars.set(car.id, {
              id: car.id,
              make: car.make || '',
              model: car.model || '',
              license_plate: extractPlateString(car.license_plate_number || car.license_plate || car.registration),
            });
          }
        }
      }
      // Handle booking_items_car (Noddi's rich booking structure)
      if (Array.isArray(b.booking_items_car)) {
        for (const bic of b.booking_items_car) {
          const car = bic.car;
          if (car?.id && !storedCars.has(car.id)) {
            storedCars.set(car.id, {
              id: car.id,
              make: car.make || '',
              model: car.model || '',
              license_plate: extractPlateString(car.license_plate_number || car.license_plate || car.registration),
            });
          }
        }
      }
      // Also check booking_items (alternate field name)
      if (Array.isArray(b.booking_items)) {
        for (const bi of b.booking_items) {
          const car = bi.car;
          if (car?.id && !storedCars.has(car.id)) {
            storedCars.set(car.id, {
              id: car.id,
              make: car.make || '',
              model: car.model || '',
              license_plate: extractPlateString(car.license_plate_number || car.license_plate || car.registration),
            });
          }
        }
      }
    }

    // Also extract addresses from user_groups (broader coverage)
    for (const group of userGroups) {
      if (Array.isArray((group as any).addresses)) {
        for (const addr of (group as any).addresses) {
          if (addr?.id && !storedAddresses.has(addr.id)) {
            const label = `${addr.street_name || ''} ${addr.street_number || ''}, ${addr.zip_code || ''} ${addr.city || ''}`.replace(/\s+/g, ' ').trim().replace(/^,|,$/g, '').trim();
            storedAddresses.set(addr.id, {
              id: addr.id,
              full_address: label,
              street: addr.street_name || '',
              city: addr.city || '',
              zip: addr.zip_code || '',
            });
          }
        }
      }
    }

    return JSON.stringify({
      found: true,
      customer: {
        name,
        email: noddihUser.email,
        phone: noddihUser.phone,
        userId: noddihUser.id,
        userGroupId,
        userGroupName: selectedGroup?.name || '',
        allUserGroups: userGroups.map((g: any) => ({ id: g.id, name: g.name, is_personal: g.is_personal })),
      },
      stored_addresses: Array.from(storedAddresses.values()),
      stored_cars: Array.from(storedCars.values()),
      bookings: (() => {
        const mappedBookings = bookings
        .filter((b: any) => {
          const rawStatus = b.status;
          const STATUS_MAP: Record<number, string> = { 0: 'draft', 1: 'confirmed', 2: 'assigned', 3: 'cancelled', 4: 'completed' };
          const status = (
            typeof rawStatus === 'number' ? (STATUS_MAP[rawStatus] || '')
            : typeof rawStatus === 'string' ? rawStatus
            : typeof rawStatus === 'object' && rawStatus !== null ? (rawStatus.name || rawStatus.slug || STATUS_MAP[rawStatus.id ?? rawStatus.value] || rawStatus.label || String(rawStatus.id ?? rawStatus.value ?? ''))
            : ''
          ).toLowerCase();
          if (['completed', 'cancelled', 'canceled', 'no_show', 'expired', 'draft'].includes(status)) {
            return false;
          }
          const endTime = b.end_time || b.delivery_window_ends_at || b.delivery_window?.ends_at || b.deliveryWindowEndsAt;
          if (endTime && new Date(endTime) < new Date()) {
            return false;
          }
          return true;
        })
        .slice(0, 10).map((b: any) => {
        const rawSt = b.status;
        const STATUS_MAP: Record<number, string> = { 0: 'draft', 1: 'confirmed', 2: 'assigned', 3: 'cancelled', 4: 'completed' };
        const statusStr = typeof rawSt === 'number' ? (STATUS_MAP[rawSt] || String(rawSt))
          : typeof rawSt === 'string' ? rawSt
          : typeof rawSt === 'object' && rawSt !== null ? (rawSt.name || rawSt.slug || STATUS_MAP[rawSt.id ?? rawSt.value] || rawSt.label || '') : '';
        const startFull = toOsloTime(b.start_time || b.scheduled_at || b.delivery_window_starts_at || b.delivery_window?.starts_at || b.deliveryWindowStartsAt || '');
        const endFull = toOsloTime(b.end_time || b.delivery_window_ends_at || b.delivery_window?.ends_at || b.deliveryWindowEndsAt || '');
        const startHM = startFull.split(', ')[1] || startFull;
        const endHM = endFull.split(', ')[1] || endFull;
        return {
          id: b.id,
          status: statusStr,
          scheduledAt: startFull,
          endTime: endFull,
          timeSlot: `${startHM}\u2013${endHM}`,
          // === FIX 1: Add address field ===
          address: (() => {
            const addrObj = b.address || b.delivery_address || b.order?.delivery_address;
            if (!addrObj) return null;
            if (typeof addrObj === 'string') return addrObj;
            const sn = addrObj.street_name || '';
            const num = addrObj.street_number || '';
            const zip = addrObj.zip_code || '';
            const city = addrObj.city || '';
            return `${sn} ${num}, ${zip} ${city}`.replace(/\s+/g, ' ').trim().replace(/^,|,$/g, '').trim() || null;
          })(),
          address_id: b.address?.id || b.user_group_address?.id || null,
          services: (() => {
            const lines = b.order_lines || b.items || b.sales_items || b.services || [];
            if (Array.isArray(lines) && lines.length > 0) {
              return lines.map((ol: any) => typeof ol === 'string' ? ol : (ol.service_name || ol.name || '')).filter(Boolean);
            }
            // Check service_categories (priority_booking shape)
            if (Array.isArray(b.service_categories) && b.service_categories.length > 0) {
              return b.service_categories.map((sc: any) => sc.name || sc.label || '').filter(Boolean);
            }
            // Check booking_items_car[].sales_items
            if (Array.isArray(b.booking_items_car)) {
              const names: string[] = [];
              for (const bic of b.booking_items_car) {
                if (Array.isArray(bic.sales_items)) {
                  for (const si of bic.sales_items) { if (si.name) names.push(si.name); }
                }
              }
              if (names.length > 0) return names;
            }
            // Check order.lines (priority_booking shape)
            if (b.order?.lines && Array.isArray(b.order.lines) && b.order.lines.length > 0) {
              return b.order.lines.map((ol: any) => ol.name || ol.title || '').filter(Boolean);
            }
            // Fallback: service.name or service_name
            if (b.service?.name) return [b.service.name];
            if (b.service_name) return [b.service_name];
            return [];
          })(),
          sales_item_ids: (() => {
            const lines = b.order_lines || b.items || b.sales_items || [];
            if (Array.isArray(lines)) {
              return lines.map((ol: any) => ol.sales_item_id || ol.id).filter(Boolean);
            }
            return [];
          })(),
          // === FIX 2: Vehicle with booking_items_car + storedCars fallback ===
          vehicle: (() => {
            const c = b.car || (Array.isArray(b.cars) && b.cars[0]) || null;
            if (c) {
              const plate = extractPlateString(c.license_plate_number || c.license_plate || c.registration);
              return `${c.make || ''} ${c.model || ''} ${plate ? `(${plate})` : ''}`.trim() || null;
            }
            // Check booking_items_car (Noddi's actual structure from priority_booking)
            if (Array.isArray(b.booking_items_car) && b.booking_items_car[0]?.car) {
              const bic = b.booking_items_car[0].car;
              const plate = extractPlateString(bic.license_plate_number || bic.license_plate || bic.registration);
              return `${bic.make || ''} ${bic.model || ''} ${plate ? `(${plate})` : ''}`.trim() || null;
            }
            // Check booking_items (alternate field name)
            if (Array.isArray(b.booking_items) && b.booking_items[0]?.car) {
              const bic = b.booking_items[0].car;
              const plate = extractPlateString(bic.license_plate_number || bic.license_plate || bic.registration);
              return `${bic.make || ''} ${bic.model || ''} ${plate ? `(${plate})` : ''}`.trim() || null;
            }
            // Fallback: look up from storedCars using car_id
            const carId = b.car?.id || (Array.isArray(b.cars) && b.cars[0]?.id) || null;
            if (carId && storedCars.has(carId)) {
              const sc = storedCars.get(carId);
              return `${sc.make} ${sc.model} ${sc.license_plate ? `(${sc.license_plate})` : ''}`.trim() || null;
            }
            // Last resort: if there's only one car in storedCars, use it
            if (storedCars.size === 1) {
              const sc = Array.from(storedCars.values())[0];
              return `${sc.make} ${sc.model} ${sc.license_plate ? `(${sc.license_plate})` : ''}`.trim() || null;
            }
            return null;
          })(),
          car_id: b.car?.id || (Array.isArray(b.cars) && b.cars[0]?.id) || null,
          car_ids: Array.isArray(b.cars) ? b.cars.map((c: any) => c.id).filter(Boolean) : (b.car?.id ? [b.car.id] : []),
          license_plate: extractPlateString(b.car?.license_plate_number || b.car?.license_plate || b.car?.registration) || (Array.isArray(b.cars) && b.cars[0] ? extractPlateString(b.cars[0].license_plate_number || b.cars[0].license_plate || b.cars[0].registration) : ''),
        };
      });
        // Diagnostic: log mapped booking sample
        if (mappedBookings.length > 0) {
          console.log('[lookup] Mapped sample:', JSON.stringify(
            mappedBookings.slice(0, 2).map((b: any) => ({
              id: b.id, vehicle: b.vehicle, license_plate: b.license_plate, services: b.services
            }))
          ));
        }
        return mappedBookings;
      })(),
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
      console.error(`[executeGetBookingDetails] Failed for booking_id=${bookingId}: status=${resp.status}`);
      return JSON.stringify({ error: resp.status === 404 ? 'Booking not found' : `Booking lookup failed (${resp.status})` });
    }

    const booking = await resp.json();
    const rawSt2 = booking.status;
    const statusStr2 = typeof rawSt2 === 'string' ? rawSt2
      : typeof rawSt2 === 'object' && rawSt2 !== null ? (rawSt2.name || rawSt2.slug || '') : '';
    const startFull2 = toOsloTime(booking.start_time || booking.scheduled_at || '');
    const endFull2 = toOsloTime(booking.end_time || '');
    const startHM2 = startFull2.split(', ')[1] || startFull2;
    const endHM2 = endFull2.split(', ')[1] || endFull2;
    return JSON.stringify({
      id: booking.id,
      status: statusStr2,
      scheduledAt: startFull2,
      endTime: endFull2,
      timeSlot: `${startHM2}\u2013${endHM2}`,
      services: booking.order_lines?.map((ol: any) => ({ name: ol.service_name || ol.name, price: ol.price })) || [],
      sales_item_ids: booking.order_lines?.map((ol: any) => ol.sales_item_id || ol.id).filter(Boolean) || [],
      address: booking.address?.full_address || booking.address || null,
      address_id: booking.address?.id || booking.user_group_address?.id || null,
      vehicle: booking.car ? { make: booking.car.make, model: booking.car.model, licensePlate: booking.car.license_plate, year: booking.car.year } : null,
      car_id: booking.car?.id || null,
      car_ids: Array.isArray(booking.cars) ? booking.cars.map((c: any) => c.id).filter(Boolean) : (booking.car?.id ? [booking.car.id] : []),
      license_plate: booking.car?.license_plate_number || booking.car?.license_plate || '',
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
    const resp = await fetch(`${API_BASE}/v1/bookings/${bookingId}/cancel/`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Token ${noddiToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        booking_id: bookingId,
        notify_customer: true,
      }),
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

// ========== Booking proxy helper ==========

async function executeBookingProxy(payload: Record<string, any>): Promise<string> {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/noddi-booking-proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await resp.json();
    if (!resp.ok) return JSON.stringify({ error: data.error || 'Booking proxy call failed' });
    return JSON.stringify(data);
  } catch (err) {
    console.error('[widget-ai-chat] Booking proxy error:', err);
    return JSON.stringify({ error: 'Booking proxy call failed' });
  }
}

// ========== Action Flow Prompt Builder ==========

interface ActionFlow {
  intent_key: string;
  label: string;
  description: string | null;
  trigger_phrases: string[];
  requires_verification: boolean;
  flow_steps: any[];
  is_active: boolean;
}

interface GeneralConfig {
  tone?: string;
  max_initial_lines?: number;
  never_dump_history?: boolean;
  language_behavior?: string;
  escalation_threshold?: number;
}

// Block prompt instructions keyed by marker type
const BLOCK_PROMPTS: Record<string, string> = {
  PHONE_VERIFY: `Include the marker [PHONE_VERIFY] in your response. The widget will render a phone verification form. Do NOT ask for the phone number in text.`,
  EMAIL_INPUT: `Include the marker [EMAIL_INPUT] in your response. The widget will render an email input field.`,
  TEXT_INPUT: `Include the marker [TEXT_INPUT]placeholder text[/TEXT_INPUT] in your response.`,
  YES_NO: `Include the marker [YES_NO]Question?[/YES_NO] in your response.`,
  ADDRESS_SEARCH: `Your ENTIRE response must be ONLY the [ADDRESS_SEARCH] marker. No text before or after.
If the customer has stored_addresses from lookup_customer, pass them as JSON:
[ADDRESS_SEARCH]{"stored": [{"id": 2860, "label": "Holtet 45, Oslo", "zip_code": "1169", "city": "Oslo"}]}[/ADDRESS_SEARCH]
If no stored addresses: [ADDRESS_SEARCH][/ADDRESS_SEARCH]`,
  LICENSE_PLATE: `Your ENTIRE response must be ONLY the [LICENSE_PLATE] marker. No text before or after.
If the customer has stored_cars from lookup_customer, pass them as JSON:
[LICENSE_PLATE]{"stored": [{"id": 13888, "make": "Tesla", "model": "Model Y", "plate": "EC94156"}]}[/LICENSE_PLATE]
If no stored cars: [LICENSE_PLATE][/LICENSE_PLATE]
The closing tag MUST be [/LICENSE_PLATE] (with forward slash).`,
  SERVICE_SELECT: `Include the marker with address_id AND license_plate:
[SERVICE_SELECT]{"address_id": <number>, "license_plate": "<string>"}[/SERVICE_SELECT]
Extract the numeric address_id and license_plate from previous conversation steps. The widget fetches and displays available services automatically.`,
  TIME_SLOT: `Your ENTIRE response must be ONLY the [TIME_SLOT] marker. No text before or after.
[TIME_SLOT]{"address_id": <number>, "car_ids": [<number>], "license_plate": "<string>", "sales_item_id": <number>}[/TIME_SLOT]
Extract all IDs from previous steps (booking details, service selection, etc.).
DO NOT call get_delivery_windows — the widget component fetches and displays time slots automatically.
NEVER list delivery windows as text. The interactive component handles everything.`,
  BOOKING_SUMMARY: `Your ENTIRE response must be ONLY the [BOOKING_SUMMARY] marker. No text before or after. The component displays all details visually.
Include ALL booking data as valid JSON (NEVER human-readable text):
[BOOKING_SUMMARY]{"address":"...","address_id":...,"car":"...","license_plate":"...","country_code":"NO","user_id":"<FROM_LOOKUP>","user_group_id":"<FROM_LOOKUP>","service":"...","sales_item_ids":[...],"date":"...","time":"...","price":"...","delivery_window_id":...,"delivery_window_start":"...","delivery_window_end":"..."}[/BOOKING_SUMMARY]
⚠️ For user_id and user_group_id, use the EXACT values from the customer lookup tool result. NEVER invent or guess these values.
⚠️ NEVER omit user_id, user_group_id, or delivery_window_id — the booking WILL FAIL without them.
⚠️ Content between tags MUST be valid JSON. Never use bullet points or prose.`,
  BOOKING_EDIT: `Your ENTIRE response must be ONLY the [BOOKING_EDIT] marker. No text before or after.
[BOOKING_EDIT]{"booking_id": <REAL_ID_FROM_get_booking_details>, "changes": {"time": "14:00–17:00", "old_time": "08:00–11:00", "date": "17. feb 2026", "old_date": "16. feb 2026", "delivery_window_id": 99999, "delivery_window_start": "2026-02-16T13:00:00Z", "delivery_window_end": "2026-02-16T16:00:00Z"}}[/BOOKING_EDIT]
⚠️ CRITICAL: Use the EXACT booking_id from get_booking_details tool results. NEVER use example values like 12345 or 99999.
⚠️ ALWAYS include date and old_date fields when changing time slots.
Include only the fields being changed with old and new values.
IMPORTANT: When showing [BOOKING_EDIT] for time changes, you MUST include delivery_window_id, delivery_window_start (ISO), and delivery_window_end (ISO) from the customer's [TIME_SLOT] selection.`,
  BOOKING_CONFIRMED: `Your ENTIRE response must be ONLY the [BOOKING_CONFIRMED] marker. No text before or after. Do NOT list booking details as text.
[BOOKING_CONFIRMED]{"booking_id": <REAL_ID>, "booking_number": "<REAL_REF>", "service": "<service>", "address": "<address>", "car": "<car>", "date": "<date>", "time": "<time>", "price": "<price>"}[/BOOKING_CONFIRMED]
⚠️ CRITICAL: Use the EXACT booking_id and booking_number from the tool result. NEVER use example values like 12345 or B-12345.
Use this marker AFTER a booking has been successfully created/confirmed. The component displays a read-only success card.`,
  ACTION_MENU: `Present choices as clickable buttons using:
[ACTION_MENU]
Option 1
Option 2
[/ACTION_MENU]`,
  RATING: `Include the marker [RATING] to show a 5-star rating selector.`,
  CONFIRM: `Include the marker [CONFIRM]Summary text[/CONFIRM] for a confirmation card.`,
};

function buildActionFlowsPrompt(flows: ActionFlow[], isVerified: boolean): string {
  const activeFlows = flows.filter(f => f.is_active);
  if (activeFlows.length === 0) return '';

  const lines: string[] = [];
  lines.push('AVAILABLE ACTION FLOWS:');
  lines.push('When the customer expresses intent matching one of these actions, follow the corresponding step-by-step flow.\n');

  for (const flow of activeFlows) {
    lines.push(`--- ${flow.label} (intent: "${flow.intent_key}") ---`);
    if (flow.description) lines.push(`When: ${flow.description}`);
    if (flow.trigger_phrases.length > 0) {
      lines.push(`Example triggers: ${flow.trigger_phrases.map(p => `"${p}"`).join(', ')}`);
    }
    if (flow.requires_verification && !isVerified) {
      lines.push(`⚠️ Requires phone verification first. Prompt [PHONE_VERIFY] before starting this flow.`);
    }

    if (flow.flow_steps.length > 0) {
      lines.push('Steps:');
      for (let i = 0; i < flow.flow_steps.length; i++) {
        const step = flow.flow_steps[i];
        const num = i + 1;
        lines.push(`  ${num}. ${step.instruction || step.field || step.type}`);
        if (step.marker && BLOCK_PROMPTS[step.marker]) {
          lines.push(`     → ${BLOCK_PROMPTS[step.marker]}`);
        }
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

function buildGeneralRulesPrompt(config: GeneralConfig): string {
  const lines: string[] = ['GENERAL RULES:'];
  if (config.tone) lines.push(`- Tone: ${config.tone}`);
  if (config.max_initial_lines) lines.push(`- Keep the initial response to max ${config.max_initial_lines} lines before presenting choices.`);
  if (config.never_dump_history) lines.push(`- NEVER dump full booking/order history unprompted. Summarize briefly and let the customer choose.`);
  if (config.language_behavior) lines.push(`- Language: ${config.language_behavior}`);
  if (config.escalation_threshold) lines.push(`- If the customer seems stuck after ${config.escalation_threshold} unanswered turns, offer to connect them with a human agent.`);
  return lines.join('\n');
}

function buildSystemPrompt(language: string, isVerified: boolean, actionFlows: ActionFlow[], generalConfig: GeneralConfig): string {
  const langInstruction = language === 'no' || language === 'nb' || language === 'nn'
    ? 'Respond in Norwegian (bokmål). Match the customer\'s language.'
    : `Respond in the same language as the customer. The widget is set to language code: ${language}.`;

  // Determine if any flow requires verification
  const hasVerificationFlows = actionFlows.some(f => f.requires_verification && f.is_active);

  let verificationContext: string;
  if (isVerified) {
     verificationContext = `VERIFICATION STATUS: The customer's phone number has been verified via SMS OTP. You can freely access their account data using lookup_customer.

After looking up the customer:
- Greet them by name.
- Check which action flow matches their stated intent.
- If a flow is matched (e.g., new_booking), proceed DIRECTLY to its first step. Do NOT mention or reference existing bookings unless the flow requires a booking lookup step.
CRITICAL: For the "new_booking" flow, NEVER show existing bookings or a [BOOKING_SELECT] block. Go directly to address selection ([ADDRESS_SEARCH]). Only show [BOOKING_SELECT] for flows that explicitly require selecting an existing booking (e.g., change_time, change_address, cancel_booking).
- For cancel_booking with multiple bookings: show [BOOKING_SELECT] so the customer can pick which booking(s) to cancel. NEVER list bookings as a numbered text list with a question.
- If NO flow is matched and the customer hasn't stated an intent, briefly mention if they have upcoming bookings, then ask what they'd like help with.
- NEVER list stored addresses or vehicles as a text list. The interactive blocks ([ADDRESS_SEARCH], [LICENSE_PLATE]) already display them as selectable options.
- When it's time to collect an address, output ONLY the [ADDRESS_SEARCH] marker with stored addresses in JSON — no introductory text.
- When it's time to collect a car, output ONLY the [LICENSE_PLATE] marker with stored cars in JSON — no introductory text.
- IMPORTANT: You ALREADY KNOW whether this is an existing customer from the lookup result. NEVER ask "have you ordered before?".
- If the customer has stored_addresses or stored_cars, you MUST pass them inside the ADDRESS_SEARCH / LICENSE_PLATE markers as JSON.`;
  } else if (hasVerificationFlows) {
    verificationContext = `VERIFICATION STATUS: The customer has NOT verified their phone via SMS.

MODE 1 — GENERAL CONVERSATION (default, no verification needed):
- Answer questions about services, pricing, hours, etc. using search_knowledge_base.
- Be helpful and conversational. No phone verification is needed for general questions.

MODE 2 — ACTION FLOWS (require verification):
- If the customer wants to perform an action (book, change, cancel, view bookings), they must verify their phone first.
- Acknowledge their intent briefly, then prompt [PHONE_VERIFY].
- Do NOT ask for the phone number in text — the form handles it.
- Do NOT look up customer data or share account details without verification.`;
  } else {
    verificationContext = `VERIFICATION STATUS: The customer has NOT verified their phone. You can answer general questions using search_knowledge_base. For account-specific actions, ask them to verify first using [PHONE_VERIFY].`;
  }

  const actionFlowsPrompt = buildActionFlowsPrompt(actionFlows, isVerified);
  const generalRules = buildGeneralRulesPrompt(generalConfig);

  return `You are an AI customer assistant. You help customers with questions about services and help them manage their bookings.

${langInstruction}

${verificationContext}

${actionFlowsPrompt}

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

8. ADDRESS SEARCH — render an interactive address picker:
Output ONLY this marker and NOTHING else in the message.
CORRECT: [ADDRESS_SEARCH]{"stored": [{"id": 2860, "label": "Holtet 45, 1368 Oslo", "zip_code": "1368", "city": "Oslo"}]}[/ADDRESS_SEARCH]
Without stored addresses: [ADDRESS_SEARCH][/ADDRESS_SEARCH]

9. LICENSE PLATE — render a license plate input with car lookup:
Output ONLY the marker. The closing tag MUST be [/LICENSE_PLATE] (with forward slash /).
CORRECT: [LICENSE_PLATE]{"stored": [{"id": 13888, "make": "Tesla", "model": "Model Y", "plate": "EC94156"}]}[/LICENSE_PLATE]
Without stored cars: [LICENSE_PLATE][/LICENSE_PLATE]

10. SERVICE SELECT — fetch and display available sales items with prices:
[SERVICE_SELECT]{"address_id": 2860, "license_plate": "EC94156"}[/SERVICE_SELECT]
NEVER list services as plain text. ALWAYS use this marker.

11. TIME SLOT — show available time slots:
Output ONLY this marker and NOTHING else in the message. The component fetches delivery windows automatically.
[TIME_SLOT]{"address_id": 2860, "car_ids": [555], "license_plate": "EC94156", "sales_item_id": 60282}[/TIME_SLOT]
Extract sales_item_id from the customer's service selection message.
DO NOT call get_delivery_windows yourself. NEVER list time slots as plain text.

12. BOOKING SUMMARY — show a booking summary card with confirm/cancel. After time slot selection, go DIRECTLY to this marker.
CRITICAL: Your ENTIRE response must be ONLY the [BOOKING_SUMMARY] marker with valid JSON. Do NOT write any introductory text, recap, or description before or after the marker. The component itself displays all the booking details visually.
⚠️ ABSOLUTE RULE — NEVER write text before or after the [BOOKING_SUMMARY] marker. No recap, no bullet list, no "Her er en oppsummering:", no "Her er detaljene:". The component renders everything.
⚠️ CRITICAL — The content between [BOOKING_SUMMARY] and [/BOOKING_SUMMARY] MUST be valid JSON. NEVER output human-readable text, bullet points, or prose inside these tags.
⚠️ CRITICAL — NEVER OMIT user_id, user_group_id, delivery_window_id (booking WILL FAIL without them).
⚠️ CRITICAL — For user_id and user_group_id, use the EXACT values returned by the customer lookup tool. NEVER invent or guess these values.
❌ WRONG: "Her er oppsummeringen:\n- Tjeneste: Dekkskift\n- Adresse: Holtet 45\n[BOOKING_SUMMARY]..."
❌ WRONG: Any text before [BOOKING_SUMMARY] or after [/BOOKING_SUMMARY]
✅ CORRECT: [BOOKING_SUMMARY]{"address":"Holtet 45","address_id":2860,"car":"Tesla Model Y","license_plate":"EC94156","country_code":"NO","user_id":"<FROM_LOOKUP>","user_group_id":"<FROM_LOOKUP>","service":"Dekkskift","sales_item_ids":[60282],"date":"16. feb 2026","time":"08:00–11:00","price":"699 kr","delivery_window_id":98765,"delivery_window_start":"2026-02-16T08:00:00Z","delivery_window_end":"2026-02-16T11:00:00Z"}[/BOOKING_SUMMARY]
❌ WRONG: [BOOKING_SUMMARY]Adresse: Holtet 45\nDato: 16. feb 2026\nPris: 699 kr[/BOOKING_SUMMARY]

13. BOOKING EDIT — show a confirmation card for EDITING an existing booking:
Your ENTIRE response must be ONLY the [BOOKING_EDIT] marker. No text before or after.
[BOOKING_EDIT]{"booking_id": <REAL_BOOKING_ID>, "changes": {"time": "14:00–17:00", "old_time": "08:00–11:00", "date": "17. feb 2026", "old_date": "16. feb 2026", "delivery_window_id": 99999, "delivery_window_start": "2026-02-16T13:00:00Z", "delivery_window_end": "2026-02-16T16:00:00Z"}}[/BOOKING_EDIT]
⚠️ CRITICAL: Use the EXACT booking_id from the lookup_customer result. NEVER use placeholder values like 12345 or 56789.
⚠️ ALWAYS include date/old_date when changing time slots.
IMPORTANT: When showing [BOOKING_EDIT] for time changes, you MUST include delivery_window_id, delivery_window_start (ISO), and delivery_window_end (ISO) from the customer's [TIME_SLOT] selection.

14. BOOKING CONFIRMED — show a read-only success card after a booking is confirmed:
After a booking is successfully created (via [BOOKING_SUMMARY] confirm), output ONLY this marker with the booking details. Do NOT list details as a bullet list.
[BOOKING_CONFIRMED]{"booking_id": <REAL_ID>, "booking_number": "<REAL_REF>", "service": "<service>", "address": "<address>", "car": "<car>", "date": "<date>", "time": "<time>", "price": "<price>"}[/BOOKING_CONFIRMED]
⚠️ CRITICAL: Use the EXACT booking_id and booking_number from the create_booking tool result. NEVER use example values like 12345 or B-12345.

15. BOOKING INFO — show a read-only info card for current booking details:
When presenting the customer's current booking details before asking what they want to change, use this marker instead of bullet points or plain text lists.
[BOOKING_INFO]{"booking_id": <REAL_ID>, "address": "<address>", "date": "<date>", "time": "<timeSlot>", "service": "<service>", "car": "<car>"}[/BOOKING_INFO]
⚠️ NEVER list booking details as plain text bullet points. ALWAYS use [BOOKING_INFO] when showing a customer their current booking.

BOOKING EDIT FLOW:
When a customer wants to modify an existing booking:
1. The booking details are ALREADY available from the lookup_customer result in this conversation. Do NOT call get_booking_details — the data (id, address, date, timeSlot, services, vehicle) is already present. Use it directly.
2. If the customer has only ONE active booking, present its details using [BOOKING_INFO]{"booking_id": <id>, "address": "<addr>", "date": "<date>", "time": "<time>", "service": "<service>", "car": "<car>"}[/BOOKING_INFO] then ask what they want to change using [ACTION_MENU].
   ⚠️ ABSOLUTE RULE: Your response MUST contain the [BOOKING_INFO] marker. NEVER list address/date/time as plain text bullet points (Adresse:, Dato:, Tid:, Tjeneste:, Bil:). The [BOOKING_INFO] component renders a styled card.
3. If multiple bookings, ask which one using [ACTION_MENU] with booking options.
    4. ⚠️ ABSOLUTE RULE: NEVER ask plain text yes/no questions. When asking "Do you want to change X?", "Ønsker du å endre X?", "Er dette bestillingen du ønsker å endre?", or ANY binary question, you MUST use [YES_NO] marker. NEVER write these as plain text.
    Example — WRONG: "Er dette bestillingen du ønsker å endre?"
    Example — CORRECT: [YES_NO]Er dette bestillingen du ønsker å endre?[/YES_NO]
    This applies to ALL confirmation/yes-no questions in ANY language.

⚠️ CRITICAL — ACTION MENU SELECTIONS:
When the customer selects an option from [ACTION_MENU] (e.g., "Endre tid", "Endre adresse"), you ALREADY have the booking details from the earlier lookup_customer or get_booking_details call in this conversation. Do NOT call get_booking_details again. Use the data already in the conversation context.

For "Endre tid" / time change selection:
- Extract address_id, car_ids, license_plate, and sales_item_id from the booking data ALREADY in the conversation.
- Emit the [TIME_SLOT] marker immediately. Do NOT call get_delivery_windows.
- If you truly cannot find the required IDs in the conversation, call get_booking_details ONCE, then emit [TIME_SLOT].
- NEVER call get_booking_details more than once per conversation.

5. For TIME changes: you MUST emit the [TIME_SLOT] marker with the booking's address_id, car_ids, license_plate, and first sales_item_id:
   [TIME_SLOT]{"address_id": <booking_address_id>, "car_ids": [<booking_car_ids>], "license_plate": "<booking_license_plate>", "sales_item_id": <first_sales_item_id>}[/TIME_SLOT]
   Output ONLY the marker, nothing else.
   ⚠️ ABSOLUTE RULE: After the customer selects a new time from [TIME_SLOT], your ENTIRE next response must be ONLY the [BOOKING_EDIT] marker. NEVER ask "Er dette tidspunktet du ønsker?" or any YES_NO confirmation. Go DIRECTLY to [BOOKING_EDIT] with the old and new values. The [BOOKING_EDIT] component itself has Confirm/Cancel buttons.
6. For ADDRESS changes: emit [ADDRESS_SEARCH]
7. For SERVICE changes: emit [SERVICE_SELECT]
8. After collecting the new value, your ENTIRE next response must be ONLY the [BOOKING_EDIT] marker with old and new values as JSON. No text before or after.
9. In the [BOOKING_EDIT] JSON, use the REAL booking_id from step 1. NEVER use example values.

RULES FOR MARKERS:
- NEVER wrap markers in markdown code blocks.
- Markers must be on a single continuous line (no line breaks inside).
- For ADDRESS_SEARCH and LICENSE_PLATE, your ENTIRE message must be ONLY the marker.
- For SERVICE_SELECT, extract real IDs from the conversation — never use made-up numbers.
- The customer is interacting via a widget, not a terminal. Use markers for interactive elements.

KNOWLEDGE BASE:
- Use search_knowledge_base to answer general questions about services, pricing, policies, etc.
- This is your PRIMARY source for answering questions. Always search before saying "I don't know."
- If no results found, be honest: "I don't have specific information about that."

BOOKING TIME DISPLAY:
- ALWAYS present booking times as a full time range (e.g., "07:00–12:00"), NEVER as a single time (e.g., "07:00").
- Use the 'timeSlot' field from booking data which contains the pre-formatted range.
- When mentioning a booking, say "planlagt den 16. februar 2026 kl. 07:00–12:00" NOT "kl. 07:00".

USER GROUP SELECTION FLOW:
When lookup_customer returns needs_group_selection: true, a [GROUP_SELECT] dropdown is automatically shown to the user.
When the user selects a group, you will receive a hidden message containing JSON with "user_group_id", "name", and "action": "group_selected".
You MUST then call lookup_customer again with the user_group_id parameter to fetch that group's bookings.
Do NOT say "no bookings" or "ingen bestillinger" before the user has selected a group.
Do NOT output any booking-related information until a group has been selected and re-lookup completed.

MULTI-TURN CONTEXT:
- Remember all data shared in the conversation (phone, addresses, cars, bookings).
- Do NOT re-ask for information already provided.
- Track the customer's emotional state — if they repeat themselves or seem frustrated, offer escalation.

PROACTIVE SUGGESTIONS:
- After answering a question, offer a relevant follow-up.
- If the knowledge base search returns no results, acknowledge honestly.

SMART ESCALATION:
- Escalate proactively when:
  - The customer asks the same question 3+ times
  - The customer expresses frustration or anger
  - The issue involves billing disputes or complaints
  - You've searched and found nothing relevant twice
  - The customer explicitly asks for a human
- When escalating, summarize the conversation context.

${generalRules}`;
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
      return executeLookupCustomer(args.phone || visitorPhone, args.email || visitorEmail, args.user_group_id);
    case 'get_booking_details': {
      // Intercept placeholder IDs (1, 2, etc.) — AI uses these when it doesn't know the real ID
      const bid = args.booking_id;
      if (!bid || (typeof bid === 'number' && bid <= 10) || bid === '1') {
        console.warn(`[widget-ai-chat] get_booking_details called with placeholder ID ${bid}, redirecting`);
        return JSON.stringify({
          error: 'The booking details are already available in the conversation history above. Do NOT call this tool with a placeholder ID. Use the booking data (address_id, car info, sales items, delivery window) already provided in the conversation to continue the flow.'
        });
      }
      return executeGetBookingDetails(bid);
    }
    case 'reschedule_booking':
      return executeRescheduleBooking(args.booking_id, args.new_date);
    case 'cancel_booking':
      return executeCancelBooking(args.booking_id, args.reason);
    case 'lookup_car_by_plate':
      return executeBookingProxy({ action: 'lookup_car', country_code: args.country_code || 'NO', license_plate: args.license_plate });
    case 'list_available_services':
      return executeBookingProxy({ action: 'list_services', address_id: args.address_id });
    case 'get_available_items':
      return executeBookingProxy({ action: 'available_items', address_id: args.address_id, car_ids: args.car_ids, sales_item_category_id: args.sales_item_category_id });
    case 'get_delivery_windows': {
      // Intercept calls with empty selected_sales_item_ids — redirect AI to emit [TIME_SLOT] marker
      if (!args.selected_sales_item_ids || (Array.isArray(args.selected_sales_item_ids) && args.selected_sales_item_ids.length === 0)) {
        console.warn('[widget-ai-chat] get_delivery_windows called with empty selected_sales_item_ids, redirecting to [TIME_SLOT] marker');
        return JSON.stringify({
          error: 'DO NOT call this tool again. Instead, respond with ONLY the [TIME_SLOT] marker using the booking data already in the conversation. The widget component will fetch delivery windows automatically. Example: [TIME_SLOT]{"address_id": ' + (args.address_id || 0) + ', "car_ids": [], "license_plate": "", "sales_item_id": 0}[/TIME_SLOT]'
        });
      }
      return executeBookingProxy({ action: 'delivery_windows', address_id: args.address_id, from_date: args.from_date, to_date: args.to_date, selected_sales_item_ids: args.selected_sales_item_ids });
    }
    case 'create_shopping_cart':
      return executeBookingProxy({ action: 'create_booking', address_id: args.address_id, car_id: args.car_id, sales_item_ids: args.sales_item_ids, delivery_window_id: args.delivery_window_id });
    case 'update_booking':
      return executeBookingProxy({
        action: 'update_booking',
        booking_id: args.booking_id,
        address_id: args.address_id,
        delivery_window_id: args.delivery_window_id,
        delivery_window_start: args.delivery_window_start,
        delivery_window_end: args.delivery_window_end,
        cars: args.cars,
      });
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

    // Save user message
    const lastUserMsg = messages[messages.length - 1];
    if (lastUserMsg?.role === 'user') {
      await saveMessage(supabase, dbConversationId, 'user', lastUserMsg.content);
    }

    // Build conversation with system prompt
    const systemPrompt = buildSystemPrompt(language, isVerified, actionFlows, generalConfig);
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
              matchedFlowHint = ` This matches the "${flow.intent_key}" flow. After lookup, proceed DIRECTLY to step 1: ${firstStep.instruction || firstStep.description || 'follow the flow'}. Do NOT call get_booking_details if lookup_customer already returned the booking with address_id, car_ids, sales_item_ids, and license_plate.`;
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
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        toolCallCounts[toolName] = (toolCallCounts[toolName] || 0) + 1;

        console.log(`[widget-ai-chat] Tool iteration ${8 - maxIterations}, calling: ${toolName}(${toolCall.function.arguments})`);

        const maxCallsForTool = toolName === 'get_delivery_windows' ? 2 : 3;
        if (toolCallCounts[toolName] >= maxCallsForTool) {
          console.warn(`[widget-ai-chat] Tool ${toolName} called ${toolCallCounts[toolName]} times, breaking loop to prevent infinite cycling`);
          await saveErrorDetails(supabase, dbConversationId, 'loop_break', `Tool ${toolName} called ${toolCallCounts[toolName]} times — loop broken`);
          loopBroken = true;
          break;
        }

        const args = JSON.parse(toolCall.function.arguments);
        allToolsUsed.push(toolName);

        const result = await executeTool(
          toolName, args, organizationId, supabase, OPENAI_API_KEY,
          visitorPhone, visitorEmail,
        );

        // Log tool errors to error_details for the Error Traces dashboard
        try {
          const parsed = JSON.parse(result);
          if (parsed.error) {
            await saveErrorDetails(supabase, dbConversationId, 'tool_error',
              `${toolName}: ${parsed.error}`);
          }
        } catch {}

        currentMessages.push({
          role: 'tool',
          content: result,
          tool_call_id: toolCall.id,
        });

        // Force-break if group selection is needed — do NOT let AI auto-resolve
        try {
          const parsedResult = JSON.parse(result);
          if (parsedResult.needs_group_selection && parsedResult.user_groups) {
            console.log('[widget-ai-chat] Group selection required, breaking tool loop');
            loopBroken = true;
            break;
          }
        } catch {}
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

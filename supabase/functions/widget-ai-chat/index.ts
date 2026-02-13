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

  // ALWAYS re-lookup customer IDs from the API when we have contact info.
  // The AI may emit hallucinated/placeholder IDs — the API lookup is the source of truth.
  if (visitorPhone || visitorEmail) {
    console.log('[patchBookingSummary] Performing fresh customer lookup (always overwrites AI-emitted IDs)...');
    try {
      const lookupResult = JSON.parse(await executeLookupCustomer(visitorPhone, visitorEmail));
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
          license_plate: b.car.license_plate_number || b.car.license_plate || '',
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
              license_plate: car.license_plate_number || car.license_plate || '',
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
      },
      stored_addresses: Array.from(storedAddresses.values()),
      stored_cars: Array.from(storedCars.values()),
      bookings: bookings.slice(0, 10).map((b: any) => ({
        id: b.id,
        status: b.status,
        scheduledAt: b.start_time || b.scheduled_at || b.delivery_window_starts_at,
        services: b.order_lines?.map((ol: any) => ol.service_name || ol.name).filter(Boolean) || [],
        sales_item_ids: b.order_lines?.map((ol: any) => ol.sales_item_id || ol.id).filter(Boolean) || [],
        address: b.address?.full_address || b.address || null,
        address_id: b.address?.id || null,
        vehicle: b.car ? `${b.car.make || ''} ${b.car.model || ''} (${b.car.license_plate || ''})`.trim() : null,
        car_id: b.car?.id || null,
        car_ids: Array.isArray(b.cars) ? b.cars.map((c: any) => c.id).filter(Boolean) : (b.car?.id ? [b.car.id] : []),
        license_plate: b.car?.license_plate_number || b.car?.license_plate || (Array.isArray(b.cars) && b.cars[0] ? (b.cars[0].license_plate_number || b.cars[0].license_plate || '') : ''),
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
      sales_item_ids: booking.order_lines?.map((ol: any) => ol.sales_item_id || ol.id).filter(Boolean) || [],
      address: booking.address?.full_address || booking.address || null,
      address_id: booking.address?.id || null,
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
  BOOKING_EDIT: `Include the marker for editing existing bookings:
[BOOKING_EDIT]{"booking_id": 12345, "changes": {"time": "14:00–17:00", "old_time": "08:00–11:00", "delivery_window_id": 99999}}[/BOOKING_EDIT]
Include only the fields being changed with old and new values.`,
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
- If they have UPCOMING bookings, mention them briefly.
- NEVER list stored addresses or vehicles as a text list. The interactive blocks ([ADDRESS_SEARCH], [LICENSE_PLATE]) already display them as selectable options.
- When it's time to collect an address, output ONLY the [ADDRESS_SEARCH] marker with stored addresses in JSON — no introductory text.
- When it's time to collect a car, output ONLY the [LICENSE_PLATE] marker with stored cars in JSON — no introductory text.
- If the customer already stated what they want, proceed with the matching action flow.
- If not, offer available actions naturally in conversation (do NOT force a menu).
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
⚠️ CRITICAL — The content between [BOOKING_SUMMARY] and [/BOOKING_SUMMARY] MUST be valid JSON. NEVER output human-readable text, bullet points, or prose inside these tags.
⚠️ CRITICAL — NEVER OMIT user_id, user_group_id, delivery_window_id (booking WILL FAIL without them).
⚠️ CRITICAL — For user_id and user_group_id, use the EXACT values returned by the customer lookup tool. NEVER invent or guess these values.
✅ CORRECT: [BOOKING_SUMMARY]{"address":"Holtet 45","address_id":2860,"car":"Tesla Model Y","license_plate":"EC94156","country_code":"NO","user_id":"<FROM_LOOKUP>","user_group_id":"<FROM_LOOKUP>","service":"Dekkskift","sales_item_ids":[60282],"date":"16. feb 2026","time":"08:00–11:00","price":"699 kr","delivery_window_id":98765,"delivery_window_start":"2026-02-16T08:00:00Z","delivery_window_end":"2026-02-16T11:00:00Z"}[/BOOKING_SUMMARY]
❌ WRONG: [BOOKING_SUMMARY]Adresse: Holtet 45\nDato: 16. feb 2026\nPris: 699 kr[/BOOKING_SUMMARY]

13. BOOKING EDIT — show a confirmation card for EDITING an existing booking:
[BOOKING_EDIT]{"booking_id": 12345, "changes": {"time": "14:00–17:00", "old_time": "08:00–11:00", "delivery_window_id": 99999}}[/BOOKING_EDIT]

BOOKING EDIT FLOW:
When a customer wants to modify an existing booking:
1. Use get_booking_details to fetch the current booking
2. Detect what they want to change and show the appropriate marker
3. After collecting the new value, show [BOOKING_EDIT] with old and new values

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
      return executeLookupCustomer(args.phone || visitorPhone, args.email || visitorEmail);
    case 'get_booking_details':
      return executeGetBookingDetails(args.booking_id);
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
    case 'get_delivery_windows':
      return executeBookingProxy({ action: 'delivery_windows', address_id: args.address_id, from_date: args.from_date, to_date: args.to_date, selected_sales_item_ids: args.selected_sales_item_ids });
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
        const intentContext = userIntent
          ? ` The customer previously said: "${userIntent}". Continue directly with that intent — do NOT re-ask what they want to do.`
          : '';
        return { role: 'user', content: `I have just verified my phone number. Please look up my account and continue with the next step in the flow. REMEMBER: After lookup, you ALREADY KNOW if I am an existing customer — do NOT ask me.${intentContext}` };
      }
      return { role: m.role, content: m.content };
    }));

    // Tool-calling loop (non-streaming phase — resolve all tool calls first)
    let currentMessages = [...conversationMessages];
    let maxIterations = 8;
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
        const rawReply = assistantMessage.content || 'I apologize, I was unable to generate a response.';
        const reply = await patchBookingSummary(rawReply, currentMessages, visitorPhone, visitorEmail);

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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Unified response type
export type NoddiLookupResponse = {
  ok: boolean;
  source: "cache" | "live";
  ttl_seconds: number;
  data: {
    found: boolean;
    email: string;
    noddi_user_id: number | null;
    user_group_id: number | null;
    user: any;
    priority_booking_type: "upcoming" | "completed" | null;
    priority_booking: any;
    unpaid_count: number;
    unpaid_bookings: any[];
    ui_meta: {
      display_name: string;
      user_group_badge: number | null;
      unpaid_count: number;
      status_label: string | null;
      booking_date_iso: string | null;
      match_mode: "phone" | "email";
      conflict: boolean;
      vehicle_label?: string | null;
      service_title?: string | null;
      order_summary?: {
        currency: string;
        lines: Array<{
          kind: "discount" | "line";
          name: string;
          quantity: number;
          unit_amount: number;
          subtotal: number;
        }>;
        vat: number;
        total: number;
      } | null;
      order_tags?: string[];
      partner_urls?: {
        customer_url: string | null;
        booking_url: string | null;
        booking_id: number | null;
      };
      timezone?: string;
      version: string;
      source: "cache" | "live";
    };
  };
};

interface NoddihCustomerLookupRequest {
  email?: string;
  phone?: string;
  customerId?: string;
  organizationId?: string;
  forceRefresh?: boolean;
}

interface NoddihUser {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  language?: string;
  phoneVerified?: boolean;
  registrationDate?: string;
}

interface NoddihUserGroup {
  id: number;
  isDefaultUserGroup?: boolean;
  isPersonal?: boolean;
  name?: string;
}

interface NoddihBooking {
  id: number;
  status: string;
  deliveryWindowStartsAt?: string;
  deliveryWindowEndsAt?: string;
  completedAt?: string;
  services?: any[];
  totalAmount?: number;
  paymentStatus?: string;
}

// Configuration
const CACHE_TTL_SECONDS = 30 * 60; // 30 minutes
const NEGATIVE_CACHE_TTL_SECONDS = 5 * 60; // 5 minutes for not-found
const PARTNER_BASE_URL = Deno.env.get("PARTNER_BASE_URL")?.replace(/\/+$/, "") || "https://partner.noddi.co";

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (data: any, status = 200) => 
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' }
  });

// --- Helper Functions (Top Level) ---

function resolveDisplayName({ user, email, userGroup, priorityBooking }: {
  user?: any; email?: string; userGroup?: any; priorityBooking?: any;
}) {
  const fromUserName = (user?.name ?? "").trim();
  if (fromUserName) return fromUserName;

  const fn = (user?.first_name ?? user?.firstName ?? "").trim();
  const ln = (user?.last_name ?? user?.lastName ?? "").trim();
  const parts = [fn, ln].filter(Boolean).join(" ").trim();
  if (parts) return parts;

  const fromGroup = (userGroup?.name ?? "").trim();
  if (fromGroup) return fromGroup;

  const fromPB = (priorityBooking?.customer?.name ?? priorityBooking?.user?.name ?? "").trim();
  if (fromPB) return fromPB;

  const prefix = (email || "").split("@")[0];
  return prefix || "Unknown Name";
}

function statusLabel(status: any): string {
  if (status?.label) return String(status.label);
  const v = status?.value ?? status?.id ?? status;
  if (typeof v === "string") return v;
  if (typeof v === "number") {
    const map: Record<number,string> = {1:"Draft",2:"Pending",3:"Scheduled",4:"Completed",5:"Cancelled"};
    return map[v] || `Status ${v}`;
  }
  return "Unknown";
}

function pick(obj:any, ...keys:string[]) {
  for (const k of keys) if (obj && obj[k] != null) return obj[k];
  return undefined;
}

function primaryBookingDateIso(booking:any, type:"upcoming"|"completed"|null|undefined): string|null {
  if (!booking) return null;
  // Upcoming → window start first; Completed → completed_at first
  if (type === "upcoming") {
    return (
      pick(booking, "delivery_window_starts_at","window_starts_at","date","starts_at","scheduled_at") || null
    );
  }
  if (type === "completed") {
    return (
      pick(booking, "completed_at","finished_at","date","updated_at","created_at") || null
    );
  }
  return (
    pick(booking, "delivery_window_starts_at","window_starts_at","completed_at","date","updated_at","created_at") || null
  );
}

function norm(s: any): string {
  return String(s ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")   // strip punctuation
    .replace(/\s+/g, " ")
    .trim();
}

function isReallyUnpaid(x: any): boolean {
  const label = norm(x?.status?.label) || norm(x?.payment_status) || norm(x?.payment?.status);
  
  const unpaidLabels = new Set([
    "unpaid", "pending", "requires payment", "requires_payment", "overdue"
  ]);
  
  const hasUnpaidLabel = unpaidLabels.has(label);
  const booleanUnpaid = x?.is_paid === false || x?.paid === false;
  const amountUnpaid = (Number(x?.amount_due) || 0) > 0 || (Number(x?.balance) || 0) > 0;
  
  const cancelled = norm(x?.status?.label) === "cancelled" || 
                   norm(x?.state) === "cancelled" || 
                   x?.cancelled === true;
  
  return !cancelled && (hasUnpaidLabel || booleanUnpaid || amountUnpaid);
}

function extractGroupId(x: any): number | null {
  return (
    (x?.user_group_id != null ? Number(x.user_group_id) : null) ??
    (x?.user_group?.id != null ? Number(x.user_group.id) : null) ??
    (x?.booking?.user_group_id != null ? Number(x.booking.user_group_id) : null) ??
    (x?.booking?.user_group?.id != null ? Number(x.booking.user_group.id) : null) ??
    null
  );
}

function extractBookingId(x: any): number | null {
  const id = (x?.id != null ? Number(x.id) : null) ??
            (x?.booking_id != null ? Number(x.booking_id) : null) ??
            (x?.booking?.id != null ? Number(x.booking.id) : null) ??
            null;
  return (id != null && Number.isFinite(id)) ? id : null;
}

function extractVehicleLabel(b: any): string | null {
  const plate = b?.car?.registration ?? b?.car?.plate ?? b?.vehicle?.plate ?? 
                b?.vehicle?.registration ?? b?.car_registration ?? b?.license_plate ?? null;
  const model = b?.car?.model ?? b?.vehicle?.model ?? b?.car_model ?? b?.vehicle_model ?? null;
  const make = b?.car?.make ?? b?.vehicle?.make ?? b?.car_make ?? b?.vehicle_make ?? null;
  
  const composed = [make, model].filter(Boolean).join(" ");
  if (composed && plate) return `${composed} (${plate})`;
  if (composed) return composed;
  if (plate) return plate;
  return null;
}

function extractServiceTitle(b: any): string | null {
  const direct = b?.service?.name ?? b?.service_name ?? b?.title ?? b?.name ?? null;
  if (direct) return String(direct);
  
  const lines = b?.order?.lines ?? b?.order_lines ?? b?.lines ?? b?.items ?? b?.booking_lines ?? [];
  const firstNonDiscount = (Array.isArray(lines) ? lines : []).find(
    (l: any) => !/discount/i.test(String(l?.type ?? l?.name ?? ""))
  ) || null;
  
  const ln = firstNonDiscount?.name ?? firstNonDiscount?.title ?? null;
  return ln ? String(ln) : null;
}

function extractCurrency(b: any): string {
  return b?.currency || b?.order?.currency || "NOK";
}

function pickAmount(...vals: any[]): number {
  for (const v of vals) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function extractOrderSummary(b: any) {
  const linesRaw = b?.order?.lines ?? b?.order_lines ?? b?.lines ?? 
                   b?.items ?? b?.booking_lines ?? [];
  const lines = Array.isArray(linesRaw) ? linesRaw : [];

  // Only return order summary when we have real line items
  if (lines.length === 0) return null;

  // Normalize line items with PII cleanup and discount handling
  const normLines = lines.map((l: any) => {
    const isDiscount = /discount/i.test(String(l?.type ?? l?.name ?? ""));
    const subtotal = pickAmount(l?.subtotal, l?.amount, l?.total);
    const unitAmount = pickAmount(l?.unit_amount, l?.unit_price, l?.price);
    const quantity = pickAmount(l?.quantity, l?.qty, 1);
    
    return {
      kind: isDiscount ? ("discount" as const) : ("line" as const),
      name: String(l?.name ?? l?.title ?? "Item"), // Only safe display fields
      quantity,
      unit_amount: unitAmount,
      subtotal: isDiscount ? -Math.abs(subtotal || unitAmount * quantity) : (subtotal || unitAmount * quantity), // Make discounts negative
    };
  });

  const vat = pickAmount(b?.vat_amount, b?.order?.vat_amount, b?.tax, b?.tax_total);
  const total = pickAmount(b?.total_amount, b?.order?.total_amount, b?.grand_total, b?.amount_total, b?.total);

  return {
    currency: extractCurrency(b),
    lines: normLines,
    vat,
    total,
  };
}

// --- Order tag extraction (NB keywords + common synonyms) ---
const TAG_RULES: Array<{label: string; rx: RegExp[]}> = [
  { label: "Dekkhotell", rx: [/\bdekkhotell\b/, /\boppbevaring\b/, /\btire\s*hotel\b/, /\bfornyelse\b/] },
  { label: "Dekkskift", rx: [/\bdekkskift\b/, /\bhjulskift\b/, /\bskifte\s*dekk\b/, /\btire\s*(change|swap)\b/] },
  { label: "Hjemlevert dekkskift", rx: [/\bhjemlever\w*\b/, /\bhjem.*dekkskift\b/, /\bhome.*(change|swap)\b/] },
  { label: "Henting/Levering", rx: [/\bhenting\b/, /\blevering\b/, /\bpick\s*up\b/, /\bdelivery\b/] },
  { label: "Hjelp til å bære dekk", rx: [/\bb(æ|a)re\s*dekk\b/, /\bb(æ|a)rehjelp\b/, /\bcarry\b.*\bti?res?\b/] },
  { label: "Felgvask", rx: [/\bfelgvask\b/, /\brim\s*wash\b/] },
  { label: "Balansering", rx: [/\bbalanser\w*\b/, /\bbalance\b/] },
  { label: "TPMS/Ventil", rx: [/\btpms\b/, /\bventil\w*\b/, /\bvalve\b/] },
];

function textFromBooking(b:any): string {
  const parts:string[] = [];
  const push = (v:any) => v && parts.push(String(v));
  
  // common fields
  push(b?.service?.name); push(b?.service_name); push(b?.title); push(b?.name); push(b?.description);
  
  // vehicle/notes often carry service hints
  push(b?.vehicle_label); push(b?.vehicle?.label); push(b?.vehicle?.name);
  push(b?.car?.label); push(b?.car?.make); push(b?.car?.model); push(b?.car?.notes);
  
  // references / metadata
  push(b?.booking_reference); push(b?.metadata?.summary); push(b?.notes);
  
  // lines across various shapes
  const lines = b?.order?.lines ?? b?.order_lines ?? b?.lines ?? b?.items ?? b?.services ?? [];
  for (const l of (Array.isArray(lines) ? lines : [])) {
    push(l?.name); push(l?.title); push(l?.description); push(l?.type); push(l?.sku);
  }
  
  return norm(parts.join(" • "));
}

function extractOrderTags(b:any): string[] {
  const hay = textFromBooking(b);
  const tags = new Set<string>();
  for (const rule of TAG_RULES) if (rule.rx.some(r => r.test(hay))) tags.add(rule.label);
  // fallback to service title only if still empty
  if (!tags.size) {
    const svc = norm(b?.service?.name ?? b?.service_name ?? b?.title ?? b?.name ?? "");
    for (const rule of TAG_RULES) if (rule.rx.some(r => r.test(svc))) tags.add(rule.label);
  }
  return [...tags];
}

function buildPartnerUrls(userGroupId: number | null, booking: any) {
  const bookingId = extractBookingId(booking);
  return {
    customer_url: (userGroupId != null && Number.isFinite(userGroupId)) ? `${PARTNER_BASE_URL}/customers/${userGroupId}` : null,
    booking_url: (bookingId != null && Number.isFinite(bookingId)) ? `${PARTNER_BASE_URL}/bookings/${bookingId}` : null,
    booking_id: bookingId,
  };
}

function filterUnpaidForGroup(unpaid: any[], ugid: number): any[] {
  const seen = new Set<number>();
  const result: any[] = [];

  for (const item of unpaid || []) {
    const gid = extractGroupId(item);
    if (gid !== Number(ugid)) continue;
    if (!isReallyUnpaid(item)) continue;

    const bid = extractBookingId(item) ?? -1;
    if (bid >= 0 && seen.has(bid)) continue;
    if (bid >= 0) seen.add(bid);

    result.push(item);
  }
  return result;
}

async function getUserByEmail(email: string) {
  const encodedEmail = encodeURIComponent(email);
  const noddihApiKey = Deno.env.get('NODDI_API_KEY');
  const response = await fetch(`https://api.noddi.no/v1/users/get-by-email/?email=${encodedEmail}`, {
    headers: {
      'Authorization': `Api-Key ${noddihApiKey}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });
  
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Email lookup failed: ${response.status}`);
  return await response.json();
}

function sanitizePhone(raw?: string): string | null {
  if (!raw) return null;
  // keep digits and a leading '+'
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d+]/g, "");
  return hasPlus ? digits : digits; // server parses it; prefer E.164 (+47...)
}

async function getUserByPhone(phone: string) {
  const encodedPhone = encodeURIComponent(phone);
  const noddihApiKey = Deno.env.get('NODDI_API_KEY');
  const response = await fetch(`https://api.noddi.no/v1/users/get-by-phone-number/?phone_number=${encodedPhone}`, {
    headers: {
      'Authorization': `Api-Key ${noddihApiKey}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });
  
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Phone lookup failed: ${response.status}`);
  return await response.json();
}

// Enrichment function - fetch booking details if tags are empty
async function enrichBookingIfNeeded(pb: any, ugid: number | null, noddihApiKey: string) {
  let tags = extractOrderTags(pb);
  if (tags.length > 0 || !pb?.id) return { tags, bookingForCache: pb };

  try {
    console.log(`[noddi] Enriching booking ${pb.id} - initial tags empty`);
    const detailResponse = await fetch(`https://api.noddi.no/v1/bookings/${pb.id}/`, {
      headers: {
        'Authorization': `Api-Key ${noddihApiKey}`,
        'Accept': 'application/json'
      }
    });
    
    if (detailResponse.ok) {
      const detail = await detailResponse.json();
      tags = extractOrderTags(detail);
      console.log(`[noddi] Enriched tags:`, tags);
      return { tags, bookingForCache: detail };
    }
  } catch (error) {
    console.log(`[noddi] Enrichment failed:`, error);
  }
  
  return { tags, bookingForCache: pb };
}

function buildResponse(params: {
  source: "cache" | "live";
  ttl_seconds: number;
  found: boolean;
  email: string;
  noddi_user_id?: number | null;
  user_group_id?: number | null;
  user?: any;
  priority_booking_type?: "upcoming" | "completed" | null;
  priority_booking?: any;
  unpaid_count?: number;
  unpaid_bookings?: any[];
  display_name?: string;
  userGroup?: any;
  enriched_order_tags?: string[]; // Add this parameter
}): NoddiLookupResponse {
  const {
    source,
    ttl_seconds,
    found,
    email,
    noddi_user_id = null,
    user_group_id = null,
    user = null,
    priority_booking_type = null,
    priority_booking = null,
    unpaid_count = 0,
    unpaid_bookings = [],
    display_name,
    userGroup,
    enriched_order_tags
  } = params;

  // Guard values
  const safeUserGroupId = user_group_id != null ? Number(user_group_id) : null;
  const safePriorityBookingType = ["upcoming", "completed"].includes(priority_booking_type as string) 
    ? priority_booking_type as "upcoming" | "completed" 
    : null;
  const safeUnpaidCount = Math.max(0, Number(unpaid_count || 0));

  const finalDisplayName = display_name || resolveDisplayName({
    user,
    email,
    userGroup,
    priorityBooking: priority_booking
  });

  // Compute canonical fields
  const booking_date_iso = primaryBookingDateIso(priority_booking, safePriorityBookingType);
  const status_label_computed = priority_booking ? statusLabel(priority_booking.status ?? priority_booking.booking_status) : null;
  
  // Compute enhanced fields
  const vehicle_label = extractVehicleLabel(priority_booking);
  const service_title = extractServiceTitle(priority_booking);
  const order_summary = extractOrderSummary(priority_booking);
  const order_tags = enriched_order_tags || extractOrderTags(priority_booking); // Use enriched tags if provided
  const hasLines = Array.isArray(order_summary?.lines) && order_summary.lines.length > 0;
  const partner_urls = buildPartnerUrls(safeUserGroupId, priority_booking);

  return {
    ok: true,
    source,
    ttl_seconds,
    data: {
      found,
      email,
      noddi_user_id,
      user_group_id: safeUserGroupId,
      user,
      priority_booking_type: safePriorityBookingType,
      priority_booking,
      unpaid_count: safeUnpaidCount,
      unpaid_bookings,
      ui_meta: {
        display_name: finalDisplayName,
        user_group_badge: safeUserGroupId,
        unpaid_count: safeUnpaidCount,
        status_label: status_label_computed,
        booking_date_iso,
        match_mode: "email" as "phone" | "email",
        conflict: false,
        vehicle_label,
        service_title,
        order_summary: hasLines ? order_summary : undefined, // Only include if has lines
        order_tags,
        partner_urls,
        timezone: "Europe/Oslo",
        version: "noddi-edge-1.4",
        source
      }
    }
  };
}

function mapCacheRowToUnified(cacheRow: any, email: string, remainingTtl: number): NoddiLookupResponse {
  const user = cacheRow.cached_customer_data || {};
  const priorityBooking = cacheRow.cached_priority_booking || null;
  const userGroup = { id: cacheRow.user_group_id, name: null };
  
  // Compute canonical fields for cache path too
  const booking_date_iso = primaryBookingDateIso(priorityBooking, cacheRow?.priority_booking_type ?? null);
  const status_label_computed = priorityBooking ? statusLabel(priorityBooking.status ?? priorityBooking.booking_status) : null;
  
  // Compute enhanced fields for cache consistency
  const vehicle_label = extractVehicleLabel(priorityBooking);
  const service_title = extractServiceTitle(priorityBooking);
  const order_summary = extractOrderSummary(priorityBooking);
  const order_tags = Array.isArray(cacheRow.cached_order_tags) ? cacheRow.cached_order_tags : extractOrderTags(priorityBooking);
  const hasLines = Array.isArray(order_summary?.lines) && order_summary.lines.length > 0;
  const partner_urls = buildPartnerUrls(cacheRow.user_group_id, priorityBooking);
  
  return {
    ok: true,
    source: "cache",
    ttl_seconds: remainingTtl,
    data: {
      found: cacheRow.noddi_user_id !== -1,
      email,
      noddi_user_id: cacheRow.noddi_user_id === -1 ? null : cacheRow.noddi_user_id,
      user_group_id: cacheRow.user_group_id,
      user,
      priority_booking_type: cacheRow.priority_booking_type,
      priority_booking: priorityBooking,
      unpaid_count: cacheRow.pending_bookings_count || 0,
      unpaid_bookings: cacheRow.cached_pending_bookings || [],
        ui_meta: {
          display_name: resolveDisplayName({
            user, 
            email, 
            userGroup: { id: cacheRow.user_group_id, name: cacheRow?.customer_group_name }, 
            priorityBooking
          }),
          user_group_badge: cacheRow.user_group_id,
          unpaid_count: Number(cacheRow?.pending_bookings_count ?? 0),
          status_label: status_label_computed,
          booking_date_iso,
          match_mode: cacheRow?.phone ? "phone" as const : "email" as const,
          conflict: false,
          vehicle_label,
          service_title,
          order_summary: hasLines ? order_summary : undefined, // Only include if has lines
          order_tags,
          partner_urls,
          timezone: "Europe/Oslo",
          version: "noddi-edge-1.4",
          source: "cache" as const,
        }
    }
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  try {
    const body = await req.json() as NoddihCustomerLookupRequest;
    
    const phone = sanitizePhone(body.phone);
    const email = (body.email || "").trim().toLowerCase();
    
    if (!phone && !email) {
      console.error('Missing required fields:', { email: !!email, phone: !!phone, organizationId: !!body.organizationId });
      return json({ error: 'Either email or phone number is required' }, 400);
    }
    
    if (!body.organizationId) {
      console.error('Missing organization ID');
      return json({ error: 'Organization ID is required' }, 400);
    }

    const noddihApiKey = Deno.env.get('NODDI_API_KEY');
    if (!noddihApiKey) {
      console.error('NODDI_API_KEY not found in environment');
      return json({ error: 'Noddi API key not configured' }, 500);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting Noddi lookup for:', { email, phone });

    // Step 1: Check cache first unless force refresh is requested
    if (!body.forceRefresh) {
      const cacheExpiry = new Date(Date.now() - CACHE_TTL_SECONDS * 1000).toISOString();
      
      let cacheQuery = supabase
        .from('noddi_customer_cache')
        .select('*')
        .eq('organization_id', body.organizationId)
        .gte('last_refreshed_at', cacheExpiry);
      
      if (phone) {
        cacheQuery = cacheQuery.eq('phone', phone);
      } else if (email) {
        cacheQuery = cacheQuery.eq('email', email);
      }
      
      try {
        const { data: cachedData } = await cacheQuery.maybeSingle();

        if (cachedData) {
          console.log('Returning cached Noddi data');
          
          const cacheAge = Math.floor((Date.now() - new Date(cachedData.last_refreshed_at).getTime()) / 1000);
          const remainingTtl = Math.max(0, CACHE_TTL_SECONDS - cacheAge);
          
          return json(mapCacheRowToUnified(cachedData, email || phone || '', remainingTtl));
        }
      } catch (error) {
        console.log('Cache table not available, proceeding with API call');
      }
    } else {
      console.log('Force refresh requested, skipping cache');
    }

    // Step 2: Lookup user (phone first, email fallback)
    console.log('Fetching user from Noddi API');
    let user: any | null = null;
    let lookupKeyForCache: string | null = null;
    let lookupMode: "phone" | "email" = "email";
    let conflict = false;

    if (phone) {
      try {
        user = await getUserByPhone(phone);
        lookupMode = "phone";
        lookupKeyForCache = phone;
        console.log('Phone lookup result:', user ? 'found' : 'not found');
      } catch (error) {
        console.log('Phone lookup failed:', error);
      }
    }
    
    if (!user && email) {
      try {
        user = await getUserByEmail(email);
        if (user && phone) {
          // Check if this is a different user than phone lookup would have found
          lookupMode = "email";
          // Could implement conflict detection here if needed
        } else if (user) {
          lookupMode = "email";
        }
        if (!lookupKeyForCache) lookupKeyForCache = email;
        console.log('Email lookup result:', user ? 'found' : 'not found');
      } catch (error) {
        console.log('Email lookup failed:', error);
      }
    }
    
    if (!user) {
      console.log('No user found for:', { email, phone });
      
      // Store negative cache entry
      try {
        await supabase
          .from('noddi_customer_cache')
          .upsert({
            organization_id: body.organizationId,
            customer_id: body.customerId,
            email: email || null,
            phone: phone || null,
            noddi_user_id: -1,
            user_group_id: null,
            last_refreshed_at: new Date().toISOString(),
            priority_booking_id: null,
            priority_booking_type: null,
            pending_bookings_count: 0,
            cached_customer_data: {},
            cached_priority_booking: null,
            cached_pending_bookings: []
          }, {
            onConflict: phone ? 'phone' : 'email'
          });
      } catch {}

      return json({
        ok: false,
        source: "live",
        ttl_seconds: NEGATIVE_CACHE_TTL_SECONDS,
        data: {
          found: false,
          email: email || "",
          noddi_user_id: null,
          user_group_id: null,
          user: null,
          priority_booking_type: null,
          priority_booking: null,
          unpaid_count: 0,
          unpaid_bookings: [],
          ui_meta: {
            display_name: email ? email.split("@")[0] : "Unknown Name",
            user_group_badge: null,
            unpaid_count: 0,
            status_label: null,
            booking_date_iso: null,
            match_mode: lookupMode,
            conflict: false,
            version: "noddi-edge-1.2",
            source: "live"
          }
        },
        notFound: true
      });
    }

    const noddihUser = user;
    console.log(`Found Noddi user: ${noddihUser.id}`);

    // Step 3: Get user groups
    const groupsResponse = await fetch(`https://api.noddi.no/v1/user-groups/?user_ids=${noddihUser.id}`, {
      headers: {
        'Authorization': `Api-Key ${noddihApiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!groupsResponse.ok) {
      throw new Error(`Failed to fetch user groups: ${groupsResponse.status}`);
    }

    const userGroups: NoddihUserGroup[] = await groupsResponse.json();
    console.log(`Found ${userGroups.length} user groups`);

    // Step 4: Select priority group
    let selectedGroup = userGroups.find(g => g.isDefaultUserGroup) || 
                       userGroups.find(g => g.isPersonal) || 
                       userGroups[0];

    if (!selectedGroup) {
      return json({ error: 'No user groups found for customer' }, 404);
    }

    console.log(`Using user group: ${selectedGroup.id}`);

    // Step 5: Get bookings (upcoming first, then completed)
    let priorityBooking: NoddihBooking | null = null;
    let priorityBookingType: 'upcoming' | 'completed' | null = null;

    // Try upcoming bookings first
    console.log('Fetching upcoming bookings');
    const upcomingResponse = await fetch(
      `https://api.noddi.no/v1/user-groups/${selectedGroup.id}/bookings-for-customer/?is_upcoming=true`,
      {
        headers: {
          'Authorization': `Api-Key ${noddihApiKey}`,
          'Accept': 'application/json'
        }
      }
    );

    if (upcomingResponse.ok) {
      const upcomingBookings: NoddihBooking[] = await upcomingResponse.json();
      if (upcomingBookings.length > 0) {
        priorityBooking = upcomingBookings.sort((a, b) => 
          new Date(a.deliveryWindowStartsAt || '').getTime() - new Date(b.deliveryWindowStartsAt || '').getTime()
        )[0];
        priorityBookingType = 'upcoming';
        console.log(`Found ${upcomingBookings.length} upcoming bookings, using booking ${priorityBooking.id}`);
      }
    }

    // If no upcoming bookings, get most recent completed
    if (!priorityBooking) {
      console.log('No upcoming bookings, fetching completed bookings');
      const completedResponse = await fetch(
        `https://api.noddi.no/v1/user-groups/${selectedGroup.id}/bookings-for-customer/?is_completed=true`,
        {
          headers: {
            'Authorization': `Api-Key ${noddihApiKey}`,
            'Accept': 'application/json'
          }
        }
      );

      if (completedResponse.ok) {
        const completedBookings: NoddihBooking[] = await completedResponse.json();
        if (completedBookings.length > 0) {
          priorityBooking = completedBookings.sort((a, b) => 
            new Date(b.completedAt || b.deliveryWindowStartsAt || '').getTime() - 
            new Date(a.completedAt || a.deliveryWindowStartsAt || '').getTime()
          )[0];
          priorityBookingType = 'completed';
          console.log(`Found ${completedBookings.length} completed bookings, using booking ${priorityBooking.id}`);
        }
      }
    }
    
    // Debug logging for priority booking
    const pb = priorityBooking;
    console.log("[noddi] pb.id", pb?.id, "has order?", !!(pb as any)?.order, "keys", Object.keys(pb ?? {}));
    console.log("[noddi] pb textFromBooking:", textFromBooking(pb));

    // Step 6: Check for unpaid bookings with strict filtering
    console.log('Checking for unpaid bookings');
    let pendingBookings: NoddihBooking[] = [];
    
    const unpaidResponse = await fetch('https://api.noddi.no/v1/bookings/unpaid/', {
      headers: {
        'Authorization': `Api-Key ${noddihApiKey}`,
        'Accept': 'application/json'
      }
    });

    if (unpaidResponse.ok) {
      const allUnpaidBookings: NoddihBooking[] = await unpaidResponse.json();
      pendingBookings = filterUnpaidForGroup(allUnpaidBookings, selectedGroup.id);
      console.log(`Found ${pendingBookings.length} truly unpaid bookings for group ${selectedGroup.id}`);
    }

    // Step 7: Build unified response with enrichment
    const { tags: order_tags, bookingForCache } = await enrichBookingIfNeeded(priorityBooking, selectedGroup.id, noddihApiKey);
    
    const liveResponse = buildResponse({
      source: "live",
      ttl_seconds: CACHE_TTL_SECONDS,
      found: true,
      email,
      noddi_user_id: noddihUser.id,
      user_group_id: selectedGroup.id,
      user: noddihUser,
      priority_booking_type: priorityBookingType,
      priority_booking: bookingForCache, // Use enriched booking
      unpaid_count: pendingBookings.length,
      unpaid_bookings: pendingBookings,
      userGroup: selectedGroup,
      enriched_order_tags: order_tags // Pass tags separately
    });

    // Step 8: Update cache (if table exists)
    try {
      await supabase
        .from('noddi_customer_cache')
        .upsert({
          organization_id: body.organizationId,
          customer_id: body.customerId,
          noddi_user_id: noddihUser.id,
          user_group_id: selectedGroup.id,
          email: email,
          last_refreshed_at: new Date().toISOString(),
          priority_booking_id: priorityBooking?.id || null,
          priority_booking_type: priorityBookingType,
          pending_bookings_count: pendingBookings.length,
          cached_customer_data: noddihUser,
          cached_priority_booking: bookingForCache || null, // Use enriched booking
          cached_pending_bookings: pendingBookings,
          cached_order_tags: order_tags // Cache the enriched tags
        }, {
          onConflict: 'email'
        });
      
      console.log('Cache updated successfully');
    } catch (cacheError) {
      console.log('Could not update cache, but continuing:', cacheError);
    }

    return json(liveResponse);

  } catch (error) {
    console.error('Error in noddi-customer-lookup:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return json({ 
      error: 'Internal server error', 
      details: errorMessage
    }, 500);
  }
});
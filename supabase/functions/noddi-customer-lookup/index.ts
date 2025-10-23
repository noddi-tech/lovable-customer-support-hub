import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Configuration constants
const API_BASE = (Deno.env.get("NODDI_API_BASE") || "https://api.noddi.co").replace(/\/+$/, "");
const CACHE_TTL_SECONDS = Number(Deno.env.get("NODDI_CACHE_TTL_SECONDS") || 900);
const DEBUG = (Deno.env.get("LOG_NODDI_DEBUG") || "false").toLowerCase() === "true";

const noddiApiKey = Deno.env.get("NODDI_API_KEY") || "";
function noddiAuthHeaders(): HeadersInit {
  return {
    "Authorization": `Api-Key ${noddiApiKey}`,
    "Accept": "application/json",
    "Content-Type": "application/json",
  };
}

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
    all_user_groups?: Array<{
      id: number;
      name: string | null;
      is_default: boolean;
      is_personal: boolean;
    }>;
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
      order_lines?: Array<{
        name: string;
        quantity: number;
        amount_gross: number;
        currency: string;
        is_discount?: boolean;
        is_fee?: boolean;
      }>;
      money?: {
        currency: string;
        gross: number;
        net: number;
        vat: number;
        paid: number;
        outstanding: number;
        paid_state: 'paid' | 'partially_paid' | 'unpaid' | 'unknown';
      };
      unable_to_complete?: boolean;
      unable_label?: string | null;
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
  userGroupId?: number;
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

// Legacy config for compatibility
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
    .replace(/\p{M}/gu, "")               // strip diacritics
    .replace(/[^\p{L}\p{N}\s]/gu, " ")    // drop punctuation, keep letters & digits
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

// New helper functions for v1.6
function n(v: any) { 
  const x = Number(v); 
  return Number.isFinite(x) ? x : 0; 
}

function isUnableToComplete(b: any) {
  return Boolean(
    b?.is_unable_to_complete === true ||
    b?.is_fully_unable_to_complete === true ||
    b?.is_partially_unable_to_complete === true ||
    b?.order?.is_unable_to_complete === true
  );
}

function unableLabel(b: any) {
  if (b?.is_fully_unable_to_complete) return 'Unable to complete';
  if (b?.is_partially_unable_to_complete) return 'Partially completed';
  if (b?.is_unable_to_complete) return 'Unable to complete';
  return null;
}

function pickCurrency(b: any) {
  return b?.order?.currency ?? b?.order?.amount_gross?.currency ?? 'NOK';
}

function extractLineItems(b: any) {
  const lines = Array.isArray(b?.order?.order_lines) ? b.order.order_lines : [];
  return lines.map((l: any) => ({
    name: String(l?.description ?? l?.name ?? l?.title ?? 'Item'),
    quantity: n(l?.quantity ?? 1),
    amount_gross: n(l?.amount_gross?.amount ?? l?.amount ?? 0),
    currency: l?.currency ?? b?.order?.currency ?? 'NOK',
    // convenience
    is_discount: Boolean(l?.is_discount === true || l?.is_coupon_discount === true),
    is_fee: Boolean(l?.is_delivery_fee === true)
  }));
}

function extractMoney(b: any) {
  const cur = pickCurrency(b);
  const gross = n(b?.order?.amount_gross?.amount);
  const net = n(b?.order?.amount_net?.amount);
  const vat = n(b?.order?.amount_vat?.amount);
  const paid = n(b?.order?.amount_paid?.amount);
  const outst = n(b?.order?.amount_outstanding?.amount);

  const paid_state: 'paid' | 'partially_paid' | 'unpaid' | 'unknown' =
    b?.order?.is_fully_paid ? 'paid' :
    b?.order?.is_partially_paid ? 'partially_paid' :
    (outst > 0 ? 'unpaid' : 'unknown');

  return { currency: cur, gross, net, vat, paid, outstanding: outst, paid_state };
}

function extractOrderSummary(b: any) {
  const raw = b?.order?.order_lines ?? b?.order?.lines ?? b?.order_lines ?? [];
  const lines = Array.isArray(raw) ? raw : [];
  if (lines.length === 0) return null;

  const normLines = lines.map((l: any) => {
    const isDiscount = /discount/i.test(String(l?.type ?? l?.name ?? ""));
    const subtotal = pickAmount(l?.subtotal, l?.amount, l?.total);
    const unitAmount = pickAmount(l?.unit_amount, l?.unit_price, l?.price);
    const quantity = pickAmount(l?.quantity, l?.qty, 1);
    
    return {
      kind: isDiscount ? ("discount" as const) : ("line" as const),
      name: String(l?.name ?? l?.title ?? "Item"),
      quantity,
      unit_amount: unitAmount,
      subtotal: isDiscount ? -Math.abs(subtotal || unitAmount * quantity) : (subtotal || unitAmount * quantity),
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

const TAG_RULES: Array<[string, RegExp]> = [
  ["Dekkhotell", /\b(dekkhotell|tire\s*(hotel|storage)|renew(al)?\s+av\s+dekkhotell)\b/u],
  ["Dekkskift", /\b(dekkskift|hjulskift|tire\s*(change|swap))\b/u],
  ["Hjemlevering", /\b(hjemlever(t|ing)|home\s*(delivery|service))\b/u],
  ["Henting/Levering", /\b(henting|levering|pickup|delivery)\b/u],
  ["Bærehjelp", /\b(b(æ|ae)re(hjelp| hjelp)|carry(ing)?\s*tires?)\b/u],
  ["Felgvask", /\b(felgvask|rim\s*wash)\b/u],
  ["Balansering", /\b(balanser(ing)?|wheel\s*balanc(ing|e))\b/u],
  ["TPMS/Ventil", /\b(tpms|ventil|sensor)\b/u],
  ["Punktering", /\b(punkter(ing)?|puncture|repair|reparasjon)\b/u]
];

function textFromBooking(b: any): string {
  const p: string[] = [];
  const push = (v: any) => { if (v != null && v !== "") p.push(String(v)); };

  // common
  push(b?.service?.name); push(b?.service_name); push(b?.title); push(b?.name); push(b?.description);

  // vehicle/notes
  push(b?.vehicle_label); push(b?.vehicle?.label); push(b?.vehicle?.name);
  push(b?.car?.label); push(b?.car?.make); push(b?.car?.model); push(b?.car?.notes);
  push(b?.booking_reference); push(b?.metadata?.summary); push(b?.notes);

  // lines
  const lines = b?.order?.order_lines ?? b?.order?.lines ?? b?.order_lines ?? b?.lines ?? b?.items ?? b?.services ?? [];
  for (const l of (Array.isArray(lines) ? lines : [])) {
    push(l?.name); push(l?.title); push(l?.description); push(l?.type); push(l?.sku);
  }

  // categories
  for (const c of (Array.isArray(b?.service_categories) ? b?.service_categories : [])) {
    push(c?.name); push(c?.type); push(c?.title);
  }

  return norm(p.join(" • "));
}

function extractOrderTags(b: any): string[] {
  const h = textFromBooking(b);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const [label, re] of TAG_RULES) {
    if (re.test(h) && !seen.has(label)) { 
      seen.add(label); 
      out.push(label); 
    }
  }
  return out;
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
  const response = await fetch(`${API_BASE}/v1/users/get-by-email/?email=${encodedEmail}`, {
    headers: noddiAuthHeaders()
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
  const response = await fetch(`${API_BASE}/v1/users/get-by-phone-number/?phone_number=${encodedPhone}`, {
    headers: noddiAuthHeaders()
  });
  
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Phone lookup failed: ${response.status}`);
  return await response.json();
}

async function enrichTagsIfEmpty(pb: any): Promise<{tags: string[]; bookingForCache: any}> {
  let tags = extractOrderTags(pb);
  if (tags.length > 0 || !pb?.id) return { tags, bookingForCache: pb };

  try {
    if (DEBUG) console.log(`[noddi] Enriching booking ${pb.id} (initially no tags)`);
    const r = await fetch(`${API_BASE}/v1/bookings/${pb.id}/`, { headers: noddiAuthHeaders() });
    if (r.ok) {
      const detail = await r.json();
      tags = extractOrderTags(detail);
      if (DEBUG) console.log(`[noddi] Enriched tags:`, tags);
      return { tags, bookingForCache: detail };
    }
  } catch (e) {
    if (DEBUG) console.log(`[noddi] Enrichment failed:`, e);
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
  all_user_groups?: any[];
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
    all_user_groups = [],
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

  // NEW money + unable fields for v1.6
  const unable_to_complete = isUnableToComplete(priority_booking);
  const unable_label = unableLabel(priority_booking);
  const order_lines = extractLineItems(priority_booking); // array (can be empty)
  const money = extractMoney(priority_booking);           // {currency,gross,net,vat,paid,outstanding,paid_state}

  return {
    ok: true,
    source,
    ttl_seconds,
    data: {
      found,
      email,
      noddi_user_id,
      user_group_id: safeUserGroupId,
      all_user_groups,
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
        order_lines,
        money,
        unable_to_complete,
        unable_label,
        partner_urls,
        timezone: "Europe/Oslo",
        version: "noddi-edge-1.6",
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

  // NEW money + unable fields for cache path v1.6
  const unable_to_complete = isUnableToComplete(priorityBooking);
  const unable_label = unableLabel(priorityBooking);
  const order_lines = extractLineItems(priorityBooking);
  const money = extractMoney(priorityBooking);
  
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
          order_lines,
          money,
          unable_to_complete,
          unable_label,
          partner_urls,
          timezone: "Europe/Oslo",
          version: "noddi-edge-1.6",
          source: "cache" as const,
        }
    }
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  try {
    const body = await req.json() as NoddihCustomerLookupRequest;
    
    const phone = sanitizePhone(body.phone);
    let email = (body.email || "").trim().toLowerCase();
    
    if (!phone && !email) {
      console.error('Missing required fields:', { email: !!email, phone: !!phone, organizationId: !!body.organizationId });
      return json({ error: 'Either email or phone number is required' }, 400);
    }
    
    if (!body.organizationId) {
      console.error('Missing organization ID');
      return json({ error: 'Organization ID is required' }, 400);
    }

    if (!noddiApiKey) {
      console.error('NODDI_API_KEY not found in environment');
      return json({ error: 'Noddi API key not configured' }, 500);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build list of emails to try (primary + alternatives from metadata)
    const emailsToTry: string[] = [];
    if (email) {
      emailsToTry.push(email);
    }

    // If we have a customerId, fetch alternative emails from customer metadata
    if (body.customerId) {
      try {
        const { data: customer } = await supabase
          .from('customers')
          .select('metadata')
          .eq('id', body.customerId)
          .single();

        if (customer?.metadata?.alternative_emails) {
          const altEmails = customer.metadata.alternative_emails as string[];
          // Add alternative emails that aren't already in the list
          altEmails.forEach((altEmail: string) => {
            if (altEmail && !emailsToTry.includes(altEmail)) {
              emailsToTry.push(altEmail);
            }
          });
          console.log('📧 Alternative emails loaded:', altEmails.length);
        }
      } catch (err) {
        console.error('Failed to load alternative emails:', err);
        // Continue without alternatives
      }
    }

    console.log('Starting Noddi lookup for:', { emails: emailsToTry.length, phone });

    // Step 1: Check cache first unless force refresh - try all emails
    if (!body.forceRefresh) {
      const cacheExpiry = new Date(Date.now() - CACHE_TTL_SECONDS * 1000).toISOString();
      
      // Try to find cached data for any of the emails
      for (const emailToCheck of emailsToTry) {
        try {
          const { data: cachedData } = await supabase
            .from('noddi_customer_cache')
            .select('*')
            .eq('organization_id', body.organizationId)
            .eq('email', emailToCheck)
            .gte('last_refreshed_at', cacheExpiry)
            .maybeSingle();

          if (cachedData) {
            console.log('✅ Returning cached data (matched email):', emailToCheck.substring(0, 3) + '***');
            
            const cacheAge = Math.floor((Date.now() - new Date(cachedData.last_refreshed_at).getTime()) / 1000);
            const remainingTtl = Math.max(0, CACHE_TTL_SECONDS - cacheAge);
            
            return json(mapCacheRowToUnified(cachedData, emailToCheck, remainingTtl));
          }
        } catch (error) {
          console.log('Cache check failed for email:', emailToCheck.substring(0, 3) + '***');
        }
      }

      // Also try phone cache if provided
      if (phone) {
        try {
          const { data: cachedData } = await supabase
            .from('noddi_customer_cache')
            .select('*')
            .eq('organization_id', body.organizationId)
            .eq('phone', phone)
            .gte('last_refreshed_at', cacheExpiry)
            .maybeSingle();

          if (cachedData) {
            console.log('✅ Returning cached data (phone match)');
            
            const cacheAge = Math.floor((Date.now() - new Date(cachedData.last_refreshed_at).getTime()) / 1000);
            const remainingTtl = Math.max(0, CACHE_TTL_SECONDS - cacheAge);
            
            return json(mapCacheRowToUnified(cachedData, email || phone, remainingTtl));
          }
        } catch (error) {
          console.log('Cache table not available for phone, proceeding with API call');
        }
      }
    } else {
      console.log('Force refresh requested, skipping cache');
    }

    // Step 2: Lookup user - try each email until we find a match
    console.log('Fetching user from Noddi API');
    let user: any | null = null;
    let successfulEmail: string | null = null;
    let lookupKeyForCache: string | null = null;
    let lookupMode: "phone" | "email" = "email";
    let conflict = false;

    // Try phone first if available
    if (phone) {
      try {
        user = await getUserByPhone(phone);
        if (user) {
          lookupMode = "phone";
          lookupKeyForCache = phone;
          successfulEmail = user.email || null;
          console.log('✅ Phone lookup successful');
        }
      } catch (error) {
        console.log('Phone lookup failed:', error);
      }
    }
    
    // If no user found via phone, try each email
    if (!user) {
      for (const emailToTry of emailsToTry) {
        try {
          console.log('🔍 Trying email:', emailToTry.substring(0, 3) + '***');
          user = await getUserByEmail(emailToTry);
          if (user) {
            console.log('✅ Email lookup successful:', emailToTry.substring(0, 3) + '***');
            lookupMode = "email";
            successfulEmail = emailToTry;
            lookupKeyForCache = emailToTry;
            break; // Stop trying more emails
          }
        } catch (error) {
          console.log('Email lookup failed for:', emailToTry.substring(0, 3) + '***');
        }
      }
    }
    
    if (!user) {
      console.log('No user found for:', { emails: emailsToTry.length, phone });
      
      // Store negative cache entry (use first email or phone)
      try {
        await supabase
          .from('noddi_customer_cache')
          .upsert({
            organization_id: body.organizationId,
            customer_id: body.customerId,
            email: emailsToTry[0] || null,
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
          email: emailsToTry[0] || "",
          noddi_user_id: null,
          user_group_id: null,
          user: null,
          priority_booking_type: null,
          priority_booking: null,
          unpaid_count: 0,
          unpaid_bookings: [],
          ui_meta: {
            display_name: emailsToTry[0] ? emailsToTry[0].split("@")[0] : "Unknown Name",
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
    console.log(`Found Noddi user: ${noddihUser.id}, email: ${successfulEmail?.substring(0, 3)}***`);

    // Step 3: Get user groups
    const groupsResponse = await fetch(`${API_BASE}/v1/user-groups/?user_ids=${noddihUser.id}`, {
      headers: noddiAuthHeaders()
    });

    if (!groupsResponse.ok) {
      throw new Error(`Failed to fetch user groups: ${groupsResponse.status}`);
    }

    const userGroups: NoddihUserGroup[] = await groupsResponse.json();
    console.log(`Found ${userGroups.length} user groups`);

    // Format all user groups for response
    const allUserGroupsFormatted = userGroups.map(g => ({
      id: g.id,
      name: g.name || null,
      is_default: g.isDefaultUserGroup || false,
      is_personal: g.isPersonal || false
    }));

    // Step 4: Fetch ALL bookings for ALL user groups in parallel (no filters)
    console.log(`Fetching all bookings for ${userGroups.length} user groups in parallel`);
    
    type BookingWithGroup = NoddihBooking & { user_group_id: number };
    
    const allBookingsPromises = userGroups.map(group => 
      fetch(`${API_BASE}/v1/user-groups/${group.id}/bookings-for-customer/`, {
        headers: noddiAuthHeaders()
      })
        .then(r => r.ok ? r.json() : [])
        .then(bookings => bookings.map((b: NoddihBooking) => ({ ...b, user_group_id: group.id })))
        .catch(err => {
          console.error(`Error fetching bookings for group ${group.id}:`, err);
          return [];
        })
    );
    
    const allBookingsResults = await Promise.all(allBookingsPromises);
    const allBookings: BookingWithGroup[] = allBookingsResults.flat();
    console.log(`Found ${allBookings.length} total bookings across all groups`);
    
    // Categorize all bookings
    const upcomingBookings = allBookings.filter(b => 
      b.deliveryWindowStartsAt && new Date(b.deliveryWindowStartsAt) > new Date()
    );
    const startedBookings = allBookings.filter(b => 
      b.startedAt && !b.completedAt
    );
    const completedBookings = allBookings.filter(b => 
      b.completedAt
    );
    
    console.log(`Categorized: ${upcomingBookings.length} upcoming, ${startedBookings.length} started, ${completedBookings.length} completed`);
    
    // Determine priority booking and group
    let priorityBooking: NoddihBooking | null = null;
    let priorityBookingType: 'upcoming' | 'completed' | null = null;
    let priorityGroupId: number | null = null;
    
    // Priority: upcoming > started > completed (most recent in each category)
    if (upcomingBookings.length > 0) {
      const sorted = upcomingBookings.sort((a, b) => 
        new Date(a.deliveryWindowStartsAt || '').getTime() - 
        new Date(b.deliveryWindowStartsAt || '').getTime()
      );
      priorityBooking = sorted[0];
      priorityBookingType = 'upcoming';
      priorityGroupId = sorted[0].user_group_id;
      console.log(`Priority: Soonest upcoming booking ${priorityBooking.id} from group ${priorityGroupId} (${priorityBooking.deliveryWindowStartsAt})`);
    } else if (startedBookings.length > 0) {
      const sorted = startedBookings.sort((a, b) => 
        new Date(b.startedAt || '').getTime() - 
        new Date(a.startedAt || '').getTime()
      );
      priorityBooking = sorted[0];
      priorityBookingType = 'completed';
      priorityGroupId = sorted[0].user_group_id;
      console.log(`Priority: Most recent started booking ${priorityBooking.id} from group ${priorityGroupId} (${priorityBooking.startedAt})`);
    } else if (completedBookings.length > 0) {
      const sorted = completedBookings.sort((a, b) => 
        new Date(b.completedAt || '').getTime() - 
        new Date(a.completedAt || '').getTime()
      );
      priorityBooking = sorted[0];
      priorityBookingType = 'completed';
      priorityGroupId = sorted[0].user_group_id;
      console.log(`Priority: Most recent completed booking ${priorityBooking.id} from group ${priorityGroupId} (${priorityBooking.completedAt})`);
    }
    
    // Group bookings by user_group_id for frontend switching
    const bookingsByGroup = userGroups.map(group => {
      const groupBookings = allBookings.filter(b => b.user_group_id === group.id);
      
      // Find most recent booking for this group
      let mostRecentBooking: NoddihBooking | null = null;
      let bookingType: 'upcoming' | 'completed' | null = null;
      
      const groupUpcoming = groupBookings.filter(b => 
        b.deliveryWindowStartsAt && new Date(b.deliveryWindowStartsAt) > new Date()
      );
      const groupStarted = groupBookings.filter(b => 
        b.startedAt && !b.completedAt
      );
      const groupCompleted = groupBookings.filter(b => 
        b.completedAt
      );
      
      if (groupUpcoming.length > 0) {
        mostRecentBooking = groupUpcoming.sort((a, b) => 
          new Date(a.deliveryWindowStartsAt || '').getTime() - 
          new Date(b.deliveryWindowStartsAt || '').getTime()
        )[0];
        bookingType = 'upcoming';
      } else if (groupStarted.length > 0) {
        mostRecentBooking = groupStarted.sort((a, b) => 
          new Date(b.startedAt || '').getTime() - 
          new Date(a.startedAt || '').getTime()
        )[0];
        bookingType = 'completed';
      } else if (groupCompleted.length > 0) {
        mostRecentBooking = groupCompleted.sort((a, b) => 
          new Date(b.completedAt || '').getTime() - 
          new Date(a.completedAt || '').getTime()
        )[0];
        bookingType = 'completed';
      }
      
      return {
        id: group.id,
        name: group.name,
        is_personal: group.isPersonal,
        is_default: group.isDefaultUserGroup,
        booking: mostRecentBooking,
        booking_type: bookingType,
        total_bookings: groupBookings.length
      };
    });

    // Step 5: Select the user group (either explicitly requested or found via booking)
    let selectedGroup: NoddihUserGroup;
    
    if (body.userGroupId) {
      selectedGroup = userGroups.find(g => g.id === body.userGroupId)!;
    } else if (priorityGroupId) {
      selectedGroup = userGroups.find(g => g.id === priorityGroupId) || userGroups[0];
      console.log(`Selected group ${selectedGroup.id} based on priority booking`);
    } else {
      // Fallback to default/personal if no bookings found
      selectedGroup = userGroups.find(g => g.isDefaultUserGroup) || 
                     userGroups.find(g => g.isPersonal) || 
                     userGroups[0];
      console.log(`No bookings found, using fallback group: ${selectedGroup.id}`);
    }

    if (!selectedGroup) {
      return json({ error: 'No user groups found for customer' }, 404);
    }
    
    // Debug logging for priority booking
    const pb = priorityBooking;
    console.log("[noddi] pb.id", pb?.id, "has order?", !!(pb as any)?.order, "keys", Object.keys(pb ?? {}));
    console.log("[noddi] pb textFromBooking:", textFromBooking(pb));

    // Step 6: Check for unpaid bookings with strict filtering
    console.log('Checking for unpaid bookings');
    let pendingBookings: NoddihBooking[] = [];
    
    const unpaidResponse = await fetch(`${API_BASE}/v1/bookings/unpaid/`, {
      headers: noddiAuthHeaders()
    });

    if (unpaidResponse.ok) {
      const allUnpaidBookings: NoddihBooking[] = await unpaidResponse.json();
      pendingBookings = filterUnpaidForGroup(allUnpaidBookings, selectedGroup.id);
      console.log(`Found ${pendingBookings.length} truly unpaid bookings for group ${selectedGroup.id}`);
    }

    // Step 7: Build unified response with enrichment (use successful email for response)
    const { tags: order_tags, bookingForCache } = await enrichTagsIfEmpty(priorityBooking);
    
    const unified = buildResponse(
      noddihUser,
      selectedGroup,
      pendingBookings,
      bookingForCache || priorityBooking,
      priorityBookingType,
      successfulEmail || emailsToTry[0] || "",
      phone,
      lookupMode,
      conflict,
      order_tags
    );
    
    const liveResponse = {
      ok: true,
      source: "live" as const,
      ttl_seconds: CACHE_TTL_SECONDS,
      data: {
        found: true,
        email: successfulEmail || emailsToTry[0] || "",
        noddi_user_id: noddihUser.id,
        user_group_id: selectedGroup.id,
        all_user_groups: bookingsByGroup, // Include all groups with their bookings
        most_recent_group_id: priorityGroupId,
        user: noddihUser,
        priority_booking_type: priorityBookingType,
        priority_booking: bookingForCache || priorityBooking,
        unpaid_count: pendingBookings.length,
        unpaid_bookings: pendingBookings,
        ui_meta: {
          display_name: resolveDisplayName(noddihUser, bookingForCache || priorityBooking),
          user_group_badge: selectedGroup.id,
          unpaid_count: pendingBookings.length,
          status_label: statusLabel((bookingForCache || priorityBooking)?.status),
          booking_date_iso: isoFromBooking(bookingForCache || priorityBooking, priorityBookingType),
          match_mode: lookupMode,
          conflict,
          vehicle_label: extractVehicleLabel(bookingForCache || priorityBooking),
          service_title: extractServiceTitle(bookingForCache || priorityBooking),
          order_summary: extractOrderSummary(bookingForCache || priorityBooking),
          order_tags,
          order_lines: extractOrderLines(bookingForCache || priorityBooking),
          money: extractMoney(bookingForCache || priorityBooking),
          unable_to_complete: !!(bookingForCache || priorityBooking)?.unableToComplete,
          unable_label: extractUnableLabel(bookingForCache || priorityBooking),
          partner_urls: {
            customer_url: buildCustomerUrl(noddihUser.id),
            booking_url: buildBookingUrl((bookingForCache || priorityBooking)?.id),
            booking_id: (bookingForCache || priorityBooking)?.id
          },
          version: VERSION,
          source: "live" as const
        }
      }
    };

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
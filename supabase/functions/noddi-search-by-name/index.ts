import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const API_BASE = (Deno.env.get("NODDI_API_BASE") || "https://api.noddi.co").replace(/\/+$/, "");
const noddiApiKey = Deno.env.get("NODDI_API_KEY") || "";

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function noddiAuthHeaders(): HeadersInit {
  return {
    "Authorization": `Api-Key ${noddiApiKey}`,
    "Accept": "application/json",
    "Content-Type": "application/json",
  };
}

const json = (data: any, status = 200) => 
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' }
  });

function isReallyUnpaid(booking: any): boolean {
  const status = booking?.payment_status || booking?.order?.payment_status || '';
  const unpaidLabels = ['unpaid', 'pending', 'requires payment', 'overdue'];
  return unpaidLabels.some(label => status.toLowerCase().includes(label));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing authorization header' }, 401);
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const { firstName, lastName, organizationId } = await req.json();

    if (!firstName && !lastName) {
      return json({ error: 'firstName or lastName required' }, 400);
    }

    if (!organizationId) {
      return json({ error: 'organizationId required' }, 400);
    }

    // Verify user belongs to the organization
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (profile?.organization_id !== organizationId) {
      return json({ error: 'Organization mismatch' }, 403);
    }

    console.log(`[noddi-search-by-name] Searching - firstName: "${firstName}", lastName: "${lastName || 'not provided'}"`);

    // Call Noddi search API using filter parameters
    const searchParams = new URLSearchParams();
    if (firstName) searchParams.append('first_name', firstName);
    if (lastName) searchParams.append('last_name', lastName);

    const searchUrl = `${API_BASE}/v1/users/?${searchParams}`;
    console.log(`[noddi-search-by-name] Request URL: ${searchUrl}`);
    console.log(`[noddi-search-by-name] API Base: ${API_BASE}`);
    console.log(`[noddi-search-by-name] Has API Key: ${noddiApiKey ? 'Yes' : 'No'}`);

    const searchResponse = await fetch(searchUrl, {
      headers: noddiAuthHeaders()
    });

    // Detailed response logging
    console.log(`[noddi-search-by-name] Response status: ${searchResponse.status} ${searchResponse.statusText}`);
    console.log(`[noddi-search-by-name] Response headers:`, JSON.stringify(Object.fromEntries(searchResponse.headers.entries())));

    if (!searchResponse.ok) {
      const errorBody = await searchResponse.text();
      console.error(`[noddi-search-by-name] Search failed: ${searchResponse.status}`);
      console.error(`[noddi-search-by-name] Request URL: ${searchUrl}`);
      console.error(`[noddi-search-by-name] Response body: ${errorBody}`);
      return json({ 
        error: 'Noddi search failed', 
        status: searchResponse.status,
        details: errorBody,
        requestUrl: searchUrl 
      }, 500);
    }

    const searchData = await searchResponse.json();

    // Detailed API response logging
    console.log(`[noddi-search-by-name] ===== FULL API RESPONSE =====`);
    console.log(`[noddi-search-by-name] Response structure:`, JSON.stringify(searchData, null, 2));
    console.log(`[noddi-search-by-name] Response keys:`, Object.keys(searchData));
    
    if (searchData.results) {
      console.log(`[noddi-search-by-name] Results array length: ${searchData.results.length}`);
      if (searchData.results.length > 0) {
        console.log(`[noddi-search-by-name] First result sample:`, JSON.stringify(searchData.results[0], null, 2));
      }
    }
    
    // Log pagination info if available
    if (searchData.count !== undefined) {
      console.log(`[noddi-search-by-name] Total count: ${searchData.count}`);
    }
    if (searchData.next) {
      console.log(`[noddi-search-by-name] Has next page: ${searchData.next}`);
    }
    if (searchData.previous) {
      console.log(`[noddi-search-by-name] Has previous page: ${searchData.previous}`);
    }
    
    console.log(`[noddi-search-by-name] ===== END API RESPONSE =====`);

    const users = Array.isArray(searchData) ? searchData : (searchData.results || []);
    console.log(`[noddi-search-by-name] Extracted ${users.length} users from results`);

    // ============= Helper Functions (from noddi-customer-lookup) =============

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
        .replace(/\p{M}/gu, "")
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
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

      push(b?.service?.name); push(b?.service_name); push(b?.title); push(b?.name); push(b?.description);
      push(b?.vehicle_label); push(b?.vehicle?.label); push(b?.vehicle?.name);
      push(b?.car?.label); push(b?.car?.make); push(b?.car?.model); push(b?.car?.notes);
      push(b?.booking_reference); push(b?.metadata?.summary); push(b?.notes);

      const lines = b?.order?.order_lines ?? b?.order?.lines ?? b?.order_lines ?? b?.lines ?? b?.items ?? b?.services ?? [];
      for (const l of (Array.isArray(lines) ? lines : [])) {
        push(l?.name); push(l?.title); push(l?.description); push(l?.type); push(l?.sku);
      }

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
        customer_url: (userGroupId != null && Number.isFinite(userGroupId)) ? `https://admin.noddi.co/customers/${userGroupId}` : null,
        booking_url: (bookingId != null && Number.isFinite(bookingId)) ? `https://admin.noddi.co/bookings/${bookingId}` : null,
        booking_id: bookingId,
      };
    }

    function buildUiMeta(
      priority_booking: any, 
      user_group_id: number | null, 
      unpaid_count: number, 
      safePriorityBookingType: "upcoming" | "completed" | null, 
      finalDisplayName: string
    ) {
      const booking_date_iso = primaryBookingDateIso(priority_booking, safePriorityBookingType);
      const status_label_computed = priority_booking ? statusLabel(priority_booking.status ?? priority_booking.booking_status) : null;
      const vehicle_label = extractVehicleLabel(priority_booking);
      const service_title = extractServiceTitle(priority_booking);
      const order_summary = extractOrderSummary(priority_booking);
      const order_tags = extractOrderTags(priority_booking);
      const hasLines = Array.isArray(order_summary?.lines) && order_summary.lines.length > 0;
      const partner_urls = buildPartnerUrls(user_group_id, priority_booking);
      const unable_to_complete = isUnableToComplete(priority_booking);
      const unable_label_text = unableLabel(priority_booking);
      const order_lines = extractLineItems(priority_booking);
      const money = extractMoney(priority_booking);

      return {
        display_name: finalDisplayName,
        user_group_badge: user_group_id,
        unpaid_count,
        status_label: status_label_computed,
        booking_date_iso,
        match_mode: "name_search" as const,
        conflict: false,
        vehicle_label,
        service_title,
        order_summary: hasLines ? order_summary : undefined,
        order_tags,
        order_lines,
        money,
        unable_to_complete,
        unable_label: unable_label_text,
        partner_urls,
        timezone: "Europe/Oslo",
        version: "noddi-edge-1.6",
        source: "live" as const
      };
    }

    // Enrich each user with booking data
    const enrichedResults = await Promise.all(
      users.map(async (user: any) => {
        try {
          const userGroup = user.user_groups?.[0] || null;
          const userGroupId = userGroup?.id ? Number(userGroup.id) : null;

          // Fetch user's bookings
          const bookingsResponse = await fetch(`${API_BASE}/v1/users/${user.id}/bookings/`, {
            headers: noddiAuthHeaders()
          });

          let bookings = [];
          let unpaidBookings = [];
          let priorityBooking = null;
          let priorityBookingType: "upcoming" | "completed" | null = null;

          if (bookingsResponse.ok) {
            const bookingsData = await bookingsResponse.json();
            // Handle both array and object responses
            bookings = Array.isArray(bookingsData) ? bookingsData : (bookingsData.results || []);

            // Find priority booking (upcoming or most recent completed)
            const upcoming = bookings.find((b: any) => 
              b.status === 'scheduled' || b.status === 'pending'
            );
            const completed = bookings
              .filter((b: any) => b.status === 'completed')
              .sort((a: any, b: any) => 
                new Date(b.completed_at || b.updated_at).getTime() - 
                new Date(a.completed_at || a.updated_at).getTime()
              )[0];
            
            priorityBooking = upcoming || completed || null;
            priorityBookingType = upcoming ? "upcoming" : (completed ? "completed" : null);

            // Find unpaid bookings using the proper helper
            unpaidBookings = bookings.filter(isReallyUnpaid);
          }

          // Check if customer exists locally
          const { data: localCustomer } = await supabaseClient
            .from('customers')
            .select('id')
            .eq('organization_id', organizationId)
            .or(`email.eq.${user.email},phone.eq.${user.phone || ''}`)
            .limit(1)
            .maybeSingle();

          // Build display name using the comprehensive resolver
          const finalDisplayName = resolveDisplayName({
            user,
            email: user.email,
            userGroup,
            priorityBooking
          });

          // Build UI meta using all helper functions
          const uiMeta = buildUiMeta(
            priorityBooking,
            userGroupId,
            unpaidBookings.length,
            priorityBookingType,
            finalDisplayName
          );

          return {
            noddi_user: user,
            noddi_user_group: userGroup,
            local_customer_id: localCustomer?.id || null,
            bookings_summary: {
              priority_booking: priorityBooking,
              priority_booking_type: priorityBookingType,
              unpaid_count: unpaidBookings.length,
              unpaid_bookings: unpaidBookings,
              total_bookings: bookings.length
            },
            ui_meta: uiMeta
          };
        } catch (error) {
          console.error(`[noddi-search-by-name] Error enriching user ${user.id}:`, error);
          return {
            noddi_user: user,
            noddi_user_group: null,
            local_customer_id: null,
            bookings_summary: {
              priority_booking: null,
              priority_booking_type: null,
              unpaid_count: 0,
              unpaid_bookings: [],
              total_bookings: 0
            },
            ui_meta: {}
          };
        }
      })
    );

    return json({ results: enrichedResults });

  } catch (error) {
    console.error('[noddi-search-by-name] Error:', error);
    return json({ error: error.message }, 500);
  }
});

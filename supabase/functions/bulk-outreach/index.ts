import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const API_BASE = (Deno.env.get("NODDI_API_BASE") || "https://api.noddi.co").replace(/\/+$/, "");
const NODDI_TOKEN = Deno.env.get("NODDI_API_TOKEN") || "";

function noddiHeaders(): HeadersInit {
  return {
    Authorization: `Token ${NODDI_TOKEN}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Resolve a single license plate to customer info
async function resolvePlate(plate: string, supabase: any, organizationId: string): Promise<{
  plate: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  matched: boolean;
  reason?: string;
  source?: string;
}> {
  const cleanPlate = plate.replace(/[\s-]/g, "").toUpperCase();

  // === Strategy 1: Local cache lookup (fast, no API calls) ===
  const cacheResult = await lookupFromCache(supabase, organizationId, cleanPlate);
  if (cacheResult?.matched) {
    console.log(`[bulk-outreach] ✅ Cache hit for plate ${cleanPlate}: ${cacheResult.email}`);
    return { ...cacheResult, source: "cache" };
  }

  // === Strategy 2: Noddi API — car lookup ===
  let carId: number | null = null;
  let carData: any = null;

  try {
    const carUrl = `${API_BASE}/v1/cars/from-license-plate-number/?brand_domains=noddi&country_code=NO&number=${encodeURIComponent(cleanPlate)}`;
    const carRes = await fetch(carUrl, { headers: noddiHeaders() });

    if (carRes.ok) {
      carData = await carRes.json();
      carId = carData?.id || null;
      console.log(`[bulk-outreach] 🚗 Car found for ${cleanPlate}: id=${carId}`);

      // Try direct user on car
      const directUser = carData?.user || carData?.owner;
      if (directUser?.email) {
        const name = [directUser.first_name, directUser.last_name].filter(Boolean).join(" ") || directUser.name || null;
        console.log(`[bulk-outreach] ✅ Direct user on car for ${cleanPlate}: ${directUser.email}`);
        return { plate: cleanPlate, name, email: directUser.email, phone: directUser.phone_number || directUser.phone || null, matched: true, source: "car_user" };
      }

      // Try user_group.users[] directly from car response (OpenAPI: CarFromLicensePlateRecord → user_group → UserGroupRecordList → users[])
      const ugOnCar = carData?.user_group;
      if (ugOnCar && typeof ugOnCar === "object") {
        const ugUsers = ugOnCar.users || ugOnCar.members || [];
        for (const u of ugUsers) {
          const uObj = u?.user || u; // members[] may have { user: {...} } shape
          if (uObj?.email) {
            const name = [uObj.first_name, uObj.last_name].filter(Boolean).join(" ") || uObj.name || null;
            console.log(`[bulk-outreach] ✅ Car user_group.users[] match for ${cleanPlate}: ${uObj.email}`);
            return { plate: cleanPlate, name, email: uObj.email, phone: uObj.phone_number || uObj.phone || null, matched: true, source: "car_user_group" };
          }
        }
      }

      // Try owners_current[].user_group.users[] (OpenAPI: CarFromLicensePlateRecord → owners_current[] → CarOwnerRecord → user_group → users[])
      const ownersCurrent = carData?.owners_current || [];
      for (const owner of ownersCurrent) {
        const ownerUg = owner?.user_group;
        if (ownerUg && typeof ownerUg === "object") {
          const ownerUsers = ownerUg.users || ownerUg.members || [];
          for (const u of ownerUsers) {
            const uObj = u?.user || u;
            if (uObj?.email) {
              const name = [uObj.first_name, uObj.last_name].filter(Boolean).join(" ") || uObj.name || null;
              console.log(`[bulk-outreach] ✅ Car owners_current user match for ${cleanPlate}: ${uObj.email}`);
              return { plate: cleanPlate, name, email: uObj.email, phone: uObj.phone_number || uObj.phone || null, matched: true, source: "car_user_group" };
            }
          }
        }
      }

      // Try user_group ID-based lookup (fetch full user group for members)
      const ugIds = extractUserGroupIds(carData);
      for (const ugId of ugIds) {
        const contact = await resolveFromUserGroup(ugId, cleanPlate);
        if (contact) return { ...contact, source: "car_user_group" };
      }
    } else {
      console.log(`[bulk-outreach] ⚠️ Car lookup failed for ${cleanPlate}: HTTP ${carRes.status}`);
      await carRes.text(); // consume body
    }
  } catch (err) {
    console.error(`[bulk-outreach] Car lookup error for ${cleanPlate}:`, err);
  }

  // === Strategy 3: Booking search by car_id (primary fallback) ===
  if (carId) {
    console.log(`[bulk-outreach] 🔍 Searching bookings by car_id=${carId} for plate ${cleanPlate}`);
    const contact = await resolveFromBookingSearch(cleanPlate, { car_ids: String(carId) });
    if (contact) return { ...contact, source: "booking_by_car_id" };
  }

  // === Strategy 4: Booking search by plate text ===
  console.log(`[bulk-outreach] 🔍 Searching bookings by search=${cleanPlate}`);
  const searchContact = await resolveFromBookingSearch(cleanPlate, { search: cleanPlate });
  if (searchContact) return { ...searchContact, source: "booking_by_search" };

  // === Strategy 5: Local customers table metadata ===
  if (carId) {
    const localContact = await resolveFromLocalCustomers(supabase, organizationId, cleanPlate, carId);
    if (localContact) return { ...localContact, source: "local_customers" };
  }

  console.log(`[bulk-outreach] ❌ All strategies exhausted for plate ${cleanPlate}`);
  const reason = carId ? "car_found_no_contact" : "no_car_found";
  return { plate: cleanPlate, name: null, email: null, phone: null, matched: false, reason };
}

// Extract user_group IDs from car data (handles multiple shapes)
function extractUserGroupIds(carData: any): number[] {
  const ids: number[] = [];
  const ug = carData?.user_group;
  if (typeof ug === "number" && ug > 0) ids.push(ug);
  else if (typeof ug === "object" && ug?.id) ids.push(ug.id);
  if (carData?.user_group_id && !ids.includes(carData.user_group_id)) ids.push(carData.user_group_id);
  if (Array.isArray(carData?.user_groups)) {
    for (const g of carData.user_groups) {
      const gid = typeof g === "number" ? g : g?.id;
      if (gid && !ids.includes(gid)) ids.push(gid);
    }
  }
  return ids;
}

// Resolve contact from user_group bookings
async function resolveFromUserGroup(ugId: number, plate: string): Promise<{
  plate: string; name: string | null; email: string | null; phone: string | null; matched: boolean;
} | null> {
  try {
    console.log(`[bulk-outreach] 👥 Fetching bookings for user group ${ugId}`);
    const ugUrl = `${API_BASE}/v1/user-groups/${ugId}/bookings-for-customer/?page_size=5`;
    const ugRes = await fetch(ugUrl, { headers: noddiHeaders() });
    if (!ugRes.ok) {
      console.log(`[bulk-outreach] ⚠️ UG ${ugId} bookings failed: HTTP ${ugRes.status}`);
      await ugRes.text();
      return null;
    }
    const ugData = await ugRes.json();
    const bookings = ugData?.results || (Array.isArray(ugData) ? ugData : []);
    for (const booking of bookings) {
      const contact = extractContactFromBooking(booking, plate);
      if (contact) return contact;
    }
    // Check members
    const members = ugData?.members || [];
    if (members[0]?.email) {
      const m = members[0];
      return { plate, name: [m.first_name, m.last_name].filter(Boolean).join(" ") || m.name || null, email: m.email, phone: m.phone_number || m.phone || null, matched: true };
    }
    return null;
  } catch (e) {
    console.error(`[bulk-outreach] UG ${ugId} error:`, e);
    return null;
  }
}

// Search bookings via GET /v1/bookings/ with given query params
async function resolveFromBookingSearch(plate: string, params: Record<string, string>): Promise<{
  plate: string; name: string | null; email: string | null; phone: string | null; matched: boolean;
} | null> {
  try {
    const qs = new URLSearchParams({ ...params, page_size: "10", ordering: "-created_at" });
    const url = `${API_BASE}/v1/bookings/?${qs.toString()}`;
    const res = await fetch(url, { headers: noddiHeaders() });
    if (!res.ok) {
      console.log(`[bulk-outreach] ⚠️ Booking search failed: HTTP ${res.status}`);
      await res.text();
      return null;
    }
    const data = await res.json();
    const bookings = data?.results || (Array.isArray(data) ? data : []);
    console.log(`[bulk-outreach] 📦 Booking search returned ${bookings.length} results for plate ${plate}`);

    for (const booking of bookings) {
      // Try direct extraction first
      const contact = extractContactFromBooking(booking, plate);
      if (contact) {
        console.log(`[bulk-outreach] ✅ Found contact via booking search: ${contact.email}`);
        return contact;
      }

      // Second-hop: /v1/bookings/ returns UserGroupRecordListMinimal (no contacts).
      // Extract user_group.id and fetch full user group for member contacts.
      const ugId = booking?.user_group?.id || booking?.user_group_id;
      if (ugId) {
        console.log(`[bulk-outreach] 🔗 Second-hop: fetching user group ${ugId} from booking ${booking.id}`);
        try {
          const ugUrl = `${API_BASE}/v1/user-groups/${ugId}/`;
          const ugRes = await fetch(ugUrl, { headers: noddiHeaders() });
          if (ugRes.ok) {
            const ugData = await ugRes.json();
            const members = ugData?.members || ugData?.users || [];
            for (const m of members) {
              const mUser = m?.user || m;
              if (mUser?.email) {
                const name = [mUser.first_name, mUser.last_name].filter(Boolean).join(" ") || mUser.name || null;
                console.log(`[bulk-outreach] ✅ Second-hop user group ${ugId} resolved: ${mUser.email}`);
                return { plate, name, email: mUser.email, phone: mUser.phone_number || mUser.phone || null, matched: true };
              }
            }
          } else {
            console.log(`[bulk-outreach] ⚠️ Second-hop UG ${ugId} fetch failed: HTTP ${ugRes.status}`);
            await ugRes.text();
          }
        } catch (e2) {
          console.error(`[bulk-outreach] Second-hop UG ${ugId} error:`, e2);
        }
      }
    }
    return null;
  } catch (e) {
    console.error(`[bulk-outreach] Booking search error:`, e);
    return null;
  }
}

// Extract contact info from a booking object
function extractContactFromBooking(booking: any, plate: string): {
  plate: string; name: string | null; email: string | null; phone: string | null; matched: boolean;
} | null {
  const user = booking?.user;
  if (user?.email) {
    return {
      plate,
      name: [user.first_name, user.last_name].filter(Boolean).join(" ") || null,
      email: user.email,
      phone: user.phone_number || user.phone || null,
      matched: true,
    };
  }
  // Try user_group on booking
  const ugUser = booking?.user_group?.members?.[0];
  if (ugUser?.email) {
    return {
      plate,
      name: [ugUser.first_name, ugUser.last_name].filter(Boolean).join(" ") || ugUser.name || null,
      email: ugUser.email,
      phone: ugUser.phone_number || ugUser.phone || null,
      matched: true,
    };
  }
  return null;
}

// Search local customers table
async function resolveFromLocalCustomers(supabase: any, organizationId: string, plate: string, carId: number): Promise<{
  plate: string; name: string | null; email: string | null; phone: string | null; matched: boolean;
} | null> {
  try {
    const { data: localCustomers } = await supabase
      .from("customers")
      .select("id, full_name, email, phone, metadata")
      .eq("organization_id", organizationId)
      .not("metadata", "is", null);

    if (localCustomers) {
      for (const c of localCustomers) {
        const meta = c.metadata || {};
        const metaCars = meta.cars || meta.stored_cars || [];
        if (Array.isArray(metaCars)) {
          for (const mc of metaCars) {
            const mcPlate = (mc?.license_plate || mc?.plate || "").replace(/[\s-]/g, "").toUpperCase();
            if (mc?.id === carId || mcPlate === plate) {
              if (c.email) {
                console.log(`[bulk-outreach] ✅ Local customer match for ${plate}: ${c.email}`);
                return { plate, name: c.full_name, email: c.email, phone: c.phone, matched: true };
              }
            }
          }
        }
      }
    }
    return null;
  } catch (e) {
    console.error("[bulk-outreach] Local lookup error:", e);
    return null;
  }
}

// Search the noddi_customer_cache for a plate match
async function lookupFromCache(
  supabase: any,
  organizationId: string,
  plate: string,
): Promise<{ plate: string; name: string | null; email: string | null; phone: string | null; matched: boolean } | null> {
  try {
    const { data: cacheRows, error } = await supabase
      .from("noddi_customer_cache")
      .select("email, phone, cached_priority_booking, cached_pending_bookings, cached_customer_data")
      .eq("organization_id", organizationId)
      .not("cached_priority_booking", "eq", "{}");

    if (error || !cacheRows || cacheRows.length === 0) return null;

    for (const row of cacheRows) {
      const priorityBooking = row.cached_priority_booking;
      if (priorityBooking && plateMatchesBooking(priorityBooking, plate)) {
        const name = extractNameFromBooking(priorityBooking);
        const email = row.email || extractEmailFromBooking(priorityBooking);
        if (email) return { plate, name, email, phone: row.phone || null, matched: true };
      }
      const pendingBookings = row.cached_pending_bookings;
      if (Array.isArray(pendingBookings)) {
        for (const booking of pendingBookings) {
          if (plateMatchesBooking(booking, plate)) {
            const name = extractNameFromBooking(booking);
            const email = row.email || extractEmailFromBooking(booking);
            if (email) return { plate, name, email, phone: row.phone || null, matched: true };
          }
        }
      }
    }
    return null;
  } catch (e) {
    console.error("[bulk-outreach] Cache lookup error:", e);
    return null;
  }
}

function plateMatchesBooking(booking: any, plate: string): boolean {
  const cars = booking?.booking_items_car || [];
  for (const car of cars) {
    const plateNum = (car?.license_plate?.number || "").replace(/[\s-]/g, "").toUpperCase();
    if (plateNum === plate) return true;
  }
  const items = booking?.booking_items || [];
  for (const item of items) {
    const car = item?.car;
    if (car) {
      const plateNum = (car?.license_plate?.number || car?.license_plate_number || "").replace(/[\s-]/g, "").toUpperCase();
      if (plateNum === plate) return true;
    }
  }
  return false;
}

function extractNameFromBooking(booking: any): string | null {
  const user = booking?.user;
  if (user) {
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
    if (fullName) return fullName;
  }
  return booking?.user_group?.name || null;
}

function extractEmailFromBooking(booking: any): string | null {
  return booking?.user?.email || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "resolve_plates": {
        const { plates, organization_id } = body;
        if (!Array.isArray(plates) || plates.length === 0) {
          return jsonResponse({ error: "plates array required" }, 400);
        }
        if (plates.length > 50) {
          return jsonResponse({ error: "Maximum 50 plates per request" }, 400);
        }
        if (!organization_id) {
          return jsonResponse({ error: "organization_id required" }, 400);
        }

        const results = await Promise.all(plates.map((p: string) => resolvePlate(p, supabase, organization_id)));
        return jsonResponse({ results });
      }

      case "list_route_bookings": {
        const { date, organization_id } = body;
        if (!date) {
          return jsonResponse({ error: "date required (YYYY-MM-DD)" }, 400);
        }

        // Use documented API params: delivery_window_starts_at_gte/lte
        const fromDate = `${date}T00:00:00Z`;
        const toDate = `${date}T23:59:59Z`;
        const bookingsUrl = `${API_BASE}/v1/bookings/?delivery_window_starts_at_gte=${encodeURIComponent(fromDate)}&delivery_window_starts_at_lte=${encodeURIComponent(toDate)}&page_size=100&ordering=-created_at`;
        const bookingsRes = await fetch(bookingsUrl, { headers: noddiHeaders() });
        
        if (!bookingsRes.ok) {
          const text = await bookingsRes.text();
          console.error(`[bulk-outreach] Bookings fetch failed: ${bookingsRes.status}`, text);
          return jsonResponse({ error: "Failed to fetch bookings" }, 502);
        }

        const bookingsData = await bookingsRes.json();
        const bookings = bookingsData?.results || (Array.isArray(bookingsData) ? bookingsData : []);

        const customers = [];
        for (const booking of bookings) {
          const car = booking.car || {};
          const bookingUser = booking.user || {};
          const userGroup = booking.user_group || {};
          const members = userGroup.members || [];
          const primary = members[0] || {};
          
          // Extract plate from various shapes
          const plateValue = car.license_plate_number || car.license_plate?.number || car.number || "Unknown";
          const email = bookingUser.email || primary.email || null;
          const name = [bookingUser.first_name, bookingUser.last_name].filter(Boolean).join(" ") || primary.name || userGroup.name || "Unknown";
          const phone = bookingUser.phone_number || primary.phone_number || null;

          customers.push({
            plate: plateValue,
            name,
            email,
            phone,
            booking_id: booking.id,
            service_type: booking.service_type || null,
            address: booking.address?.street_address || null,
            matched: !!email,
            reason: email ? undefined : "no_email_on_booking",
          });
        }

        return jsonResponse({ bookings: customers, total: customers.length });
      }

      case "send_bulk": {
        const { recipients, subject, message_template, inbox_id, organization_id } = body;
        
        if (!Array.isArray(recipients) || recipients.length === 0) {
          return jsonResponse({ error: "recipients array required" }, 400);
        }
        if (!subject || !message_template || !organization_id) {
          return jsonResponse({ error: "subject, message_template, and organization_id required" }, 400);
        }

        const { data: job, error: jobError } = await supabase
          .from("bulk_outreach_jobs")
          .insert({
            organization_id,
            created_by: user.id,
            subject,
            message_template,
            inbox_id: inbox_id || null,
            recipient_count: recipients.length,
            status: "in_progress",
            recipients: recipients.map((r: any) => ({
              email: r.email,
              name: r.name,
              plate: r.plate,
              status: "pending",
            })),
          })
          .select("id")
          .single();

        if (jobError) {
          console.error("[bulk-outreach] Job insert error:", jobError);
          return jsonResponse({ error: "Failed to create outreach job" }, 500);
        }

        const jobId = job.id;
        let sentCount = 0;
        let failedCount = 0;
        const recipientStatuses: any[] = [];

        for (const recipient of recipients) {
          try {
            const { email, name, plate } = recipient;
            if (!email) {
              recipientStatuses.push({ email, name, plate, status: "skipped", error: "No email" });
              failedCount++;
              continue;
            }

            const personalizedMessage = message_template.replace(/\{name\}/gi, name || "Customer");

            const { data: existingCustomer } = await supabase
              .from("customers")
              .select("id")
              .eq("email", email.toLowerCase())
              .eq("organization_id", organization_id)
              .maybeSingle();

            let customerId: string;
            if (existingCustomer) {
              customerId = existingCustomer.id;
            } else {
              const { data: newCustomer, error: custError } = await supabase
                .from("customers")
                .insert({
                  email: email.toLowerCase(),
                  full_name: name || null,
                  organization_id,
                })
                .select("id")
                .single();
              if (custError) {
                console.error("[bulk-outreach] Customer insert error:", custError);
                recipientStatuses.push({ email, name, plate, status: "failed", error: "Customer creation failed" });
                failedCount++;
                continue;
              }
              customerId = newCustomer.id;
            }

            const { data: conversation, error: convError } = await supabase
              .from("conversations")
              .insert({
                organization_id,
                customer_id: customerId,
                channel: "email",
                status: "open",
                subject,
                inbox_id: inbox_id || null,
              })
              .select("id")
              .single();

            if (convError) {
              console.error("[bulk-outreach] Conversation insert error:", convError);
              recipientStatuses.push({ email, name, plate, status: "failed", error: "Conversation creation failed" });
              failedCount++;
              continue;
            }

            const { data: message, error: msgError } = await supabase
              .from("messages")
              .insert({
                conversation_id: conversation.id,
                content: personalizedMessage,
                sender_type: "agent",
                sender_id: user.id,
                email_status: "pending",
                email_subject: subject,
              })
              .select("id")
              .single();

            if (msgError) {
              console.error("[bulk-outreach] Message insert error:", msgError);
              recipientStatuses.push({ email, name, plate, status: "failed", error: "Message creation failed" });
              failedCount++;
              continue;
            }

            try {
              const { error: sendError } = await supabase.functions.invoke("send-reply-email", {
                body: { messageId: message.id },
              });
              if (sendError) {
                console.error("[bulk-outreach] Send error for", email, sendError);
                recipientStatuses.push({ email, name, plate, status: "failed", conversation_id: conversation.id, error: "Email send failed" });
                failedCount++;
                continue;
              }
            } catch (sendErr) {
              console.error("[bulk-outreach] Send invoke error:", sendErr);
              recipientStatuses.push({ email, name, plate, status: "failed", conversation_id: conversation.id, error: "Email invoke failed" });
              failedCount++;
              continue;
            }

            recipientStatuses.push({ email, name, plate, status: "sent", conversation_id: conversation.id });
            sentCount++;
          } catch (recipientError) {
            console.error("[bulk-outreach] Recipient error:", recipientError);
            recipientStatuses.push({ 
              email: recipient.email, 
              name: recipient.name, 
              plate: recipient.plate, 
              status: "failed", 
              error: recipientError instanceof Error ? recipientError.message : String(recipientError) 
            });
            failedCount++;
          }
        }

        await supabase
          .from("bulk_outreach_jobs")
          .update({
            sent_count: sentCount,
            failed_count: failedCount,
            status: failedCount === recipients.length ? "failed" : "completed",
            recipients: recipientStatuses,
          })
          .eq("id", jobId);

        return jsonResponse({
          job_id: jobId,
          sent_count: sentCount,
          failed_count: failedCount,
          recipients: recipientStatuses,
        });
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (error) {
    console.error("[bulk-outreach] Unhandled error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

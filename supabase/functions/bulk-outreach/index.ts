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
}> {
  const cleanPlate = plate.replace(/[\s-]/g, "").toUpperCase();

  // === Strategy 1: Local cache lookup (fast, no API calls) ===
  const cacheResult = await lookupFromCache(supabase, organizationId, cleanPlate);
  if (cacheResult?.matched) {
    console.log(`[bulk-outreach] ✅ Cache hit for plate ${cleanPlate}: ${cacheResult.email}`);
    return cacheResult;
  }

  // === Strategy 2: Noddi API chain (car → bookings → user_group) ===
  try {
    // Step 1: Look up car by license plate
    const carUrl = `${API_BASE}/v1/cars/from-license-plate-number/?brand_domains=noddi&country_code=NO&number=${encodeURIComponent(cleanPlate)}`;
    const carRes = await fetch(carUrl, { headers: noddiHeaders() });

    if (!carRes.ok) {
      console.log(`[bulk-outreach] ❌ No car found for plate ${cleanPlate} (HTTP ${carRes.status})`);
      return { plate: cleanPlate, name: null, email: null, phone: null, matched: false, reason: "no_car_found" };
    }

    const carData = await carRes.json();
    const carId = carData?.id;

    if (!carId) {
      console.log(`[bulk-outreach] ❌ Car response has no id for plate ${cleanPlate}`);
      return { plate: cleanPlate, name: null, email: null, phone: null, matched: false, reason: "no_car_id" };
    }

    console.log(`[bulk-outreach] 🚗 Car found for ${cleanPlate}: id=${carId}`);

    // Step 2: Search bookings by car_id
    const bookingsUrl = `${API_BASE}/v1/bookings/?car_ids=${carId}&brand_domains=noddi&page_size=10&ordering=-created_at`;
    const bookingsRes = await fetch(bookingsUrl, { headers: noddiHeaders() });

    if (!bookingsRes.ok) {
      console.log(`[bulk-outreach] ❌ Bookings fetch failed for car ${carId}: HTTP ${bookingsRes.status}`);
      return { plate: cleanPlate, name: null, email: null, phone: null, matched: false, reason: "bookings_fetch_failed" };
    }

    const bookingsData = await bookingsRes.json();
    const results = bookingsData?.results || (Array.isArray(bookingsData) ? bookingsData : []);
    console.log(`[bulk-outreach] 📋 Found ${results.length} bookings for car ${carId}`);

    if (results.length === 0) {
      return { plate: cleanPlate, name: null, email: null, phone: null, matched: false, reason: "no_bookings" };
    }

    // Try to extract user info directly from booking data first
    for (const booking of results) {
      // Check booking.user field (contains email, name, phone directly)
      const bookingUser = booking?.user;
      if (bookingUser?.email) {
        console.log(`[bulk-outreach] ✅ Found user directly on booking ${booking.id}: ${bookingUser.email}`);
        return {
          plate: cleanPlate,
          name: [bookingUser.first_name, bookingUser.last_name].filter(Boolean).join(" ") || bookingUser.name || null,
          email: bookingUser.email,
          phone: bookingUser.phone_number || null,
          matched: true,
        };
      }

      // Check booking.user_group.members
      const members = booking?.user_group?.members;
      if (Array.isArray(members) && members.length > 0) {
        const member = members[0];
        if (member?.email) {
          console.log(`[bulk-outreach] ✅ Found member on booking ${booking.id}: ${member.email}`);
          return {
            plate: cleanPlate,
            name: member.name || booking.user_group?.name || null,
            email: member.email,
            phone: member.phone_number || null,
            matched: true,
          };
        }
      }
    }

    // Step 3: Try fetching user_group details for the first booking with a user_group reference
    for (const booking of results) {
      const ugId = booking?.user_group?.id || booking?.user_group_id;
      if (!ugId) continue;

      console.log(`[bulk-outreach] 👥 Fetching user group ${ugId} for plate ${cleanPlate}`);
      const ugUrl = `${API_BASE}/v1/user-groups/${ugId}/`;
      const ugRes = await fetch(ugUrl, { headers: noddiHeaders() });

      if (!ugRes.ok) {
        console.log(`[bulk-outreach] ⚠️ User group ${ugId} fetch failed: HTTP ${ugRes.status}`);
        continue;
      }

      const ugData = await ugRes.json();
      const ugMembers = ugData?.members || [];
      const primaryMember = ugMembers[0];
      const name = primaryMember?.name || ugData?.name || null;
      const email = primaryMember?.email || null;
      const phone = primaryMember?.phone_number || null;

      if (email) {
        console.log(`[bulk-outreach] ✅ Found email via user group ${ugId}: ${email}`);
        return { plate: cleanPlate, name, email, phone, matched: true };
      }
    }

    console.log(`[bulk-outreach] ❌ Bookings found but no email for plate ${cleanPlate}`);
    return { plate: cleanPlate, name: null, email: null, phone: null, matched: false, reason: "no_email_in_bookings" };
  } catch (err) {
    console.error(`[bulk-outreach] Error resolving plate ${cleanPlate}:`, err);
    return { plate: cleanPlate, name: null, email: null, phone: null, matched: false, reason: "api_error" };
  }
}

// Search the noddi_customer_cache for a plate match
async function lookupFromCache(
  supabase: any,
  organizationId: string,
  plate: string,
): Promise<{ plate: string; name: string | null; email: string | null; phone: string | null; matched: boolean } | null> {
  try {
    // Get all cache entries for this org that have booking data
    const { data: cacheRows, error } = await supabase
      .from("noddi_customer_cache")
      .select("email, phone, cached_priority_booking, cached_pending_bookings, cached_customer_data")
      .eq("organization_id", organizationId)
      .not("cached_priority_booking", "eq", "{}");

    if (error || !cacheRows || cacheRows.length === 0) return null;

    for (const row of cacheRows) {
      // Check priority booking's booking_items_car for plate match
      const priorityBooking = row.cached_priority_booking;
      if (priorityBooking && plateMatchesBooking(priorityBooking, plate)) {
        const name = extractNameFromBooking(priorityBooking);
        const email = row.email || extractEmailFromBooking(priorityBooking);
        if (email) {
          return { plate, name, email, phone: row.phone || null, matched: true };
        }
      }

      // Check pending bookings
      const pendingBookings = row.cached_pending_bookings;
      if (Array.isArray(pendingBookings)) {
        for (const booking of pendingBookings) {
          if (plateMatchesBooking(booking, plate)) {
            const name = extractNameFromBooking(booking);
            const email = row.email || extractEmailFromBooking(booking);
            if (email) {
              return { plate, name, email, phone: row.phone || null, matched: true };
            }
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

// Check if a booking's car data contains the given plate
function plateMatchesBooking(booking: any, plate: string): boolean {
  // Check booking_items_car array
  const cars = booking?.booking_items_car || [];
  for (const car of cars) {
    const plateNum = (car?.license_plate?.number || "").replace(/[\s-]/g, "").toUpperCase();
    if (plateNum === plate) return true;
  }
  // Check nested booking_items
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

    // Verify user
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
      // ========== Resolve license plates to customers ==========
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

      // ========== List bookings by date for route selection ==========
      case "list_route_bookings": {
        const { date, organization_id } = body;
        if (!date) {
          return jsonResponse({ error: "date required (YYYY-MM-DD)" }, 400);
        }

        const bookingsUrl = `${API_BASE}/v1/bookings/?start_date=${encodeURIComponent(date)}&end_date=${encodeURIComponent(date)}&brand_domains=noddi&page_size=100`;
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
          
          const email = bookingUser.email || primary.email || null;
          const name = [bookingUser.first_name, bookingUser.last_name].filter(Boolean).join(" ") || primary.name || userGroup.name || "Unknown";
          const phone = bookingUser.phone_number || primary.phone_number || null;

          customers.push({
            plate: car.license_plate_number || car.number || "Unknown",
            name,
            email,
            phone,
            booking_id: booking.id,
            service_type: booking.service_type || null,
            address: booking.address?.street_address || null,
            matched: !!email,
          });
        }

        return jsonResponse({ bookings: customers, total: customers.length });
      }

      // ========== Send bulk emails ==========
      case "send_bulk": {
        const { recipients, subject, message_template, inbox_id, organization_id } = body;
        
        if (!Array.isArray(recipients) || recipients.length === 0) {
          return jsonResponse({ error: "recipients array required" }, 400);
        }
        if (!subject || !message_template || !organization_id) {
          return jsonResponse({ error: "subject, message_template, and organization_id required" }, 400);
        }

        // Create bulk outreach job record
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

            // Upsert customer
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

            // Create conversation
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

            // Insert message
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

            // Trigger send-reply-email
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

        // Update job with results
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

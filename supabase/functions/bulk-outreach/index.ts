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

// Resolve a single license plate to customer info via Noddi APIs
async function resolvePlate(plate: string, supabase?: any, organizationId?: string): Promise<{
  plate: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  matched: boolean;
}> {
  const cleanPlate = plate.replace(/[\s-]/g, "").toUpperCase();
  try {
    // Step 1: Look up car by license plate to get car_id
    const carUrl = `${API_BASE}/v1/cars/from-license-plate-number/?brand_domains=noddi&country_code=NO&number=${encodeURIComponent(cleanPlate)}`;
    const carRes = await fetch(carUrl, { headers: noddiHeaders() });

    if (!carRes.ok) {
      console.log(`[bulk-outreach] Car not found for plate ${cleanPlate}: ${carRes.status}`);
      return fallbackLocalLookup(supabase, organizationId, cleanPlate);
    }

    const carData = await carRes.json();
    const carId = carData?.id;

    if (!carId) {
      console.log(`[bulk-outreach] No car id returned for plate ${cleanPlate}`);
      return fallbackLocalLookup(supabase, organizationId, cleanPlate);
    }

    // Step 2: Search bookings by car_id to find the user_group_id
    const bookingsUrl = `${API_BASE}/v1/bookings/?car_ids=${carId}&brand_domains=noddi&page_size=5&ordering=-created_at`;
    const bookingsRes = await fetch(bookingsUrl, { headers: noddiHeaders() });

    let userGroupId: number | null = null;

    if (bookingsRes.ok) {
      const bookingsData = await bookingsRes.json();
      const results = bookingsData?.results || bookingsData || [];
      for (const booking of results) {
        const ugId = booking?.user_group?.id || booking?.user_group_id;
        if (ugId) {
          userGroupId = ugId;
          break;
        }
      }
    }

    if (!userGroupId) {
      // Also try user_group directly from car data as a fallback
      userGroupId = carData?.user_group?.id || carData?.user_group_id || null;
    }

    if (!userGroupId) {
      console.log(`[bulk-outreach] No user group found via bookings for plate ${cleanPlate}`);
      return fallbackLocalLookup(supabase, organizationId, cleanPlate);
    }

    // Step 3: Fetch user group details to get contact info
    const ugUrl = `${API_BASE}/v1/user-groups/${userGroupId}/`;
    const ugRes = await fetch(ugUrl, { headers: noddiHeaders() });

    if (!ugRes.ok) {
      console.log(`[bulk-outreach] User group fetch failed for ${userGroupId}: ${ugRes.status}`);
      return fallbackLocalLookup(supabase, organizationId, cleanPlate);
    }

    const ugData = await ugRes.json();

    // Extract contact info from user group members
    const members = ugData?.members || [];
    const primaryMember = members[0];
    const name = primaryMember?.name || ugData?.name || null;
    const email = primaryMember?.email || null;
    const phone = primaryMember?.phone_number || null;

    if (!email) {
      console.log(`[bulk-outreach] No email found for plate ${cleanPlate}, trying local fallback`);
      return fallbackLocalLookup(supabase, organizationId, cleanPlate, name, phone);
    }

    return { plate: cleanPlate, name, email, phone, matched: true };
  } catch (err) {
    console.error(`[bulk-outreach] Error resolving plate ${plate}:`, err);
    return fallbackLocalLookup(supabase, organizationId, cleanPlate);
  }
}

// Fallback: search the local customers table for a plate match
async function fallbackLocalLookup(
  supabase: any | undefined,
  organizationId: string | undefined,
  plate: string,
  nameHint?: string | null,
  phoneHint?: string | null,
): Promise<{ plate: string; name: string | null; email: string | null; phone: string | null; matched: boolean }> {
  if (!supabase || !organizationId) {
    return { plate, name: nameHint || null, email: null, phone: phoneHint || null, matched: false };
  }
  try {
    // Search customers whose metadata contains this plate
    const { data: customers } = await supabase
      .from("customers")
      .select("id, full_name, email, phone, metadata")
      .eq("organization_id", organizationId)
      .or(`metadata->>license_plate.eq.${plate},metadata->>plate.eq.${plate},phone.not.is.null`)
      .limit(5);

    if (customers && customers.length > 0) {
      // Try exact plate match in metadata first
      const plateMatch = customers.find(
        (c: any) => c.metadata?.license_plate === plate || c.metadata?.plate === plate,
      );
      if (plateMatch && plateMatch.email) {
        return { plate, name: plateMatch.full_name, email: plateMatch.email, phone: plateMatch.phone, matched: true };
      }
    }
  } catch (e) {
    console.error("[bulk-outreach] Local fallback error:", e);
  }
  return { plate, name: nameHint || null, email: null, phone: phoneHint || null, matched: false };
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
        const { plates } = body;
        if (!Array.isArray(plates) || plates.length === 0) {
          return jsonResponse({ error: "plates array required" }, 400);
        }
        if (plates.length > 50) {
          return jsonResponse({ error: "Maximum 50 plates per request" }, 400);
        }

        const orgId = body.organization_id;
        const results = await Promise.all(plates.map((p: string) => resolvePlate(p, supabase, orgId)));
        return jsonResponse({ results });
      }

      // ========== List bookings by date for route selection ==========
      case "list_route_bookings": {
        const { date, organization_id } = body;
        if (!date) {
          return jsonResponse({ error: "date required (YYYY-MM-DD)" }, 400);
        }

        // Fetch bookings from Noddi for the given date
        const bookingsUrl = `${API_BASE}/v1/bookings/?start_date=${encodeURIComponent(date)}&end_date=${encodeURIComponent(date)}&brand_domains=noddi&page_size=100`;
        const bookingsRes = await fetch(bookingsUrl, { headers: noddiHeaders() });
        
        if (!bookingsRes.ok) {
          const text = await bookingsRes.text();
          console.error(`[bulk-outreach] Bookings fetch failed: ${bookingsRes.status}`, text);
          return jsonResponse({ error: "Failed to fetch bookings" }, 502);
        }

        const bookingsData = await bookingsRes.json();
        const bookings = bookingsData?.results || bookingsData || [];

        // Map bookings to customer info
        const customers = [];
        for (const booking of bookings) {
          const car = booking.car || {};
          const userGroup = booking.user_group || {};
          const members = userGroup.members || [];
          const primary = members[0] || {};
          
          customers.push({
            plate: car.license_plate_number || car.number || "Unknown",
            name: primary.name || userGroup.name || "Unknown",
            email: primary.email || null,
            phone: primary.phone_number || null,
            booking_id: booking.id,
            service_type: booking.service_type || null,
            address: booking.address?.street_address || null,
            matched: !!primary.email,
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

            // Personalize message
            const personalizedMessage = message_template.replace(/\{name\}/gi, name || "Customer");

            // Step 1: Upsert customer
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

            // Step 2: Create conversation
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

            // Step 3: Insert message
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

            // Step 4: Trigger send-reply-email to deliver
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

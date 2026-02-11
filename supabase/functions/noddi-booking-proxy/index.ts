import { corsHeaders } from "../_shared/cors.ts";

const API_BASE = (Deno.env.get("NODDI_API_BASE") || "https://api.noddi.co").replace(/\/+$/, "");
const NODDI_TOKEN = Deno.env.get("NODDI_API_TOKEN") || "";

const headers: HeadersInit = {
  Authorization: `Token ${NODDI_TOKEN}`,
  Accept: "application/json",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      // ========== Car Lookup ==========
      case "lookup_car": {
        const { country_code = "NO", license_plate } = body;
        if (!license_plate) {
          return jsonResponse({ error: "license_plate required" }, 400);
        }
        const url = `${API_BASE}/v1/cars/data-from-license-plate-number/?country_code=${encodeURIComponent(country_code)}&license_plate_number=${encodeURIComponent(license_plate)}`;
        const res = await fetch(url, { headers });
        if (!res.ok) {
          const text = await res.text();
          console.error("Car lookup error:", res.status, text);
          return jsonResponse({ error: "Car not found" }, res.status === 404 ? 404 : 502);
        }
        const car = await res.json();
        return jsonResponse({ car });
      }

      // ========== List Services ==========
      case "list_services": {
        const url = `${API_BASE}/v1/booking-proposals/types/`;
        const res = await fetch(url, { headers });
        if (!res.ok) {
          const text = await res.text();
          console.error("List services error:", res.status, text);
          return jsonResponse({ error: "Failed to fetch services" }, 502);
        }
        const data = await res.json();
        const services = Array.isArray(data) ? data : data.results || [];
        return jsonResponse({ services });
      }

      // ========== Create Proposal ==========
      case "create_proposal": {
        const { address_id, car_id, type_slug, promo_code, tyres_stored_at_noddi } = body;
        if (!address_id || !car_id || !type_slug) {
          return jsonResponse({ error: "address_id, car_id, and type_slug required" }, 400);
        }
        const payload: any = { address_id, car_id, type_slug };
        if (promo_code) payload.promo_code = promo_code;
        if (tyres_stored_at_noddi !== undefined) payload.tyres_stored_at_noddi = tyres_stored_at_noddi;

        const res = await fetch(`${API_BASE}/v1/booking-proposals/`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const text = await res.text();
          console.error("Create proposal error:", res.status, text);
          return jsonResponse({ error: "Failed to create proposal" }, 502);
        }
        const proposal = await res.json();
        return jsonResponse({ proposal });
      }

      // ========== Add Proposal Item ==========
      case "add_proposal_item": {
        const { booking_proposal_id, sales_item_id } = body;
        if (!booking_proposal_id || !sales_item_id) {
          return jsonResponse({ error: "booking_proposal_id and sales_item_id required" }, 400);
        }
        const res = await fetch(`${API_BASE}/v1/booking-proposal-items/`, {
          method: "POST",
          headers,
          body: JSON.stringify({ booking_proposal_id, sales_item_id }),
        });
        if (!res.ok) {
          const text = await res.text();
          console.error("Add proposal item error:", res.status, text);
          return jsonResponse({ error: "Failed to add item" }, 502);
        }
        const item = await res.json();
        return jsonResponse({ item });
      }

      // ========== Earliest Date ==========
      case "earliest_date": {
        const { address_id: eAddr } = body;
        const res = await fetch(`${API_BASE}/v1/delivery-windows/earliest-date/`, {
          method: "POST",
          headers,
          body: JSON.stringify({ address_id: eAddr }),
        });
        if (!res.ok) {
          const text = await res.text();
          console.error("Earliest date error:", res.status, text);
          return jsonResponse({ error: "Failed to get earliest date" }, 502);
        }
        const data = await res.json();
        return jsonResponse(data);
      }

      // ========== Delivery Windows ==========
      case "delivery_windows": {
        const { address_id: dwAddr, from_date } = body;
        if (!dwAddr) {
          return jsonResponse({ error: "address_id required" }, 400);
        }
        let url = `${API_BASE}/v1/delivery-windows/for-new-booking/?address_id=${dwAddr}`;
        if (from_date) url += `&from_date=${encodeURIComponent(from_date)}`;
        const res = await fetch(url, { headers });
        if (!res.ok) {
          const text = await res.text();
          console.error("Delivery windows error:", res.status, text);
          return jsonResponse({ error: "Failed to fetch delivery windows" }, 502);
        }
        const data = await res.json();
        return jsonResponse(data);
      }

      // ========== Create Booking ==========
      case "create_booking": {
        const { booking_proposal_slug, delivery_window_id, payment_method, coupon_code } = body;
        if (!booking_proposal_slug || !delivery_window_id) {
          return jsonResponse({ error: "booking_proposal_slug and delivery_window_id required" }, 400);
        }
        const payload: any = { booking_proposal_slug, delivery_window_id };
        if (payment_method) payload.payment_method = payment_method;
        if (coupon_code) payload.coupon_code = coupon_code;

        const res = await fetch(`${API_BASE}/v1/bookings/`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const text = await res.text();
          console.error("Create booking error:", res.status, text);
          return jsonResponse({ error: "Failed to create booking" }, 502);
        }
        const booking = await res.json();
        return jsonResponse({ booking });
      }

      // ========== Start Booking ==========
      case "start_booking": {
        const { booking_id } = body;
        if (!booking_id) {
          return jsonResponse({ error: "booking_id required" }, 400);
        }
        const res = await fetch(`${API_BASE}/v1/bookings/${booking_id}/start/`, {
          method: "POST",
          headers,
          body: JSON.stringify({}),
        });
        if (!res.ok) {
          const text = await res.text();
          console.error("Start booking error:", res.status, text);
          return jsonResponse({ error: "Failed to start booking" }, 502);
        }
        const data = await res.json();
        return jsonResponse(data);
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error("noddi-booking-proxy error:", err);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

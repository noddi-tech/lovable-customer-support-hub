import { corsHeaders } from "../_shared/cors.ts";

const API_BASE = (Deno.env.get("NODDI_API_BASE") || "https://api.noddi.co").replace(/\/+$/, "");

const SERVICE_TYPE_LABELS: Record<string, string> = {
  wheel_services: "Dekkskift",
  stone_chip_repair: "Steinsprut-reparasjon",
  car_wash: "Bilvask",
  tyre_hotel: "Dekkhotell",
  polering: "Polering",
};
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
        const url = `${API_BASE}/v1/cars/from-license-plate-number/?brand_domains=noddi&country_code=${encodeURIComponent(country_code)}&number=${encodeURIComponent(license_plate)}`;
        const res = await fetch(url, { headers });
        if (!res.ok) {
          const text = await res.text();
          console.error("Car lookup error:", res.status, text);
          return jsonResponse({ error: "Car not found" }, res.status === 404 ? 404 : 502);
        }
        const car = await res.json();
        return jsonResponse({ car });
      }

      // ========== List Service Categories ==========
      case "list_services": {
        const { address_id } = body;
        if (!address_id) {
          // Return fallback services when address_id is missing instead of erroring
          console.warn("list_services called without address_id, returning fallback");
          return jsonResponse({
            services: [
              { slug: "dekkskift", name: "Dekkskift", description: "Bytte av dekk" },
              { slug: "bilvask", name: "Bilvask", description: "Utvendig og innvendig vask" },
              { slug: "dekkhotell", name: "Dekkhotell", description: "Lagring av dekk" },
            ],
            fallback: true,
          });
        }
        const url = `${API_BASE}/v1/sales-item-booking-categories/for-new-booking/?address_id=${encodeURIComponent(address_id)}`;
        const res = await fetch(url, { headers });
        if (!res.ok) {
          const text = await res.text();
          console.error("List services error:", res.status, text);
          console.warn("list_services endpoint failed, using fallback services");
          return jsonResponse({
            services: [
              { slug: "dekkskift", name: "Dekkskift", description: "Bytte av dekk" },
              { slug: "bilvask", name: "Bilvask", description: "Utvendig og innvendig vask" },
              { slug: "dekkhotell", name: "Dekkhotell", description: "Lagring av dekk" },
            ],
            fallback: true,
          });
        }
        const data = await res.json();
        const raw = Array.isArray(data) ? data : data.results || [];
        const services = raw.map((s: any) => ({
          slug: s.type || s.slug || '',
          name: SERVICE_TYPE_LABELS[s.type] || s.name || s.type || '',
          description: s.description || '',
          brand_name: s.brand?.name || '',
        }));
        return jsonResponse({ services });
      }

      // ========== Available Items for Booking ==========
      case "available_items": {
        const { address_id: aiAddr, car_ids, license_plates, sales_item_category_id, country_code: aiCountry } = body;
        if (!aiAddr) {
          return jsonResponse({ error: "address_id required" }, 400);
        }
        const payload: any = { address_id: aiAddr };
        // Noddi API requires license_plates as objects: [{number, country_code}]
        if (license_plates) {
          const lpArray = Array.isArray(license_plates) ? license_plates : [license_plates];
          payload.license_plates = lpArray.map((lp: any) =>
            typeof lp === 'string' ? { number: lp, country_code: aiCountry || 'NO' } : lp
          );
        } else if (car_ids) {
          payload.car_ids = car_ids;
        }
        if (sales_item_category_id) payload.sales_item_category_id = sales_item_category_id;

        const res = await fetch(`${API_BASE}/v1/sales-items/initial-available-for-booking/`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const text = await res.text();
          console.error("Available items error:", res.status, text);
          return jsonResponse({ error: "Failed to fetch available items" }, 502);
        }
        const data = await res.json();
        return jsonResponse(data);
      }

      // ========== Earliest Date ==========
      case "earliest_date": {
        const { address_id: eAddr, cars } = body;
        if (!cars || !Array.isArray(cars) || cars.length === 0) {
          return jsonResponse({ error: "cars array is required and must not be empty" }, 400);
        }
        // Noddi expects cars as objects: [{id: 13888}], not plain integers [13888]
        const carsForApi = cars.map((c: any) => typeof c === 'number' ? { id: c } : c);
        const edPayload: any = { address_id: eAddr, cars: carsForApi };
        const res = await fetch(`${API_BASE}/v1/delivery-windows/earliest-date/`, {
          method: "POST",
          headers,
          body: JSON.stringify(edPayload),
        });
        if (!res.ok) {
          const text = await res.text();
          console.error("Earliest date error:", res.status, text);
          return jsonResponse({ error: "Failed to get earliest date" }, 502);
        }
        const data = await res.json();
        return jsonResponse(data);
      }

      // ========== Latest Date ==========
      case "latest_date": {
        const { address_id: lAddr } = body;
        const url = `${API_BASE}/v1/delivery-windows/latest-date/${lAddr ? `?address_id=${encodeURIComponent(lAddr)}` : ''}`;
        const res = await fetch(url, { headers });
        if (!res.ok) {
          const text = await res.text();
          console.error("Latest date error:", res.status, text);
          return jsonResponse({ error: "Failed to get latest date" }, 502);
        }
        const data = await res.json();
        return jsonResponse(data);
      }

      // ========== Delivery Windows ==========
      case "delivery_windows": {
        const { address_id: dwAddr, from_date, to_date, selected_sales_item_ids } = body;
        if (!dwAddr) {
          return jsonResponse({ error: "address_id required" }, 400);
        }
        let url = `${API_BASE}/v1/delivery-windows/for-new-booking/?address_id=${dwAddr}`;
        if (from_date) url += `&from_date=${encodeURIComponent(from_date)}`;
        if (to_date) url += `&to_date=${encodeURIComponent(to_date)}`;
        if (selected_sales_item_ids) {
          const ids = Array.isArray(selected_sales_item_ids) ? selected_sales_item_ids : [selected_sales_item_ids];
          for (const id of ids) {
            url += `&selected_sales_item_ids=${encodeURIComponent(id)}`;
          }
        }
        const res = await fetch(url, { headers });
        if (!res.ok) {
          const text = await res.text();
          console.error("Delivery windows error:", res.status, text);
          return jsonResponse({ error: "Failed to fetch delivery windows" }, 502);
        }
        const data = await res.json();
        return jsonResponse(data);
      }

      // ========== Service Departments ==========
      case "service_departments": {
        const { address_id: sdAddr, sales_items_ids } = body;
        if (!sdAddr) {
          return jsonResponse({ error: "address_id required" }, 400);
        }
        let url = `${API_BASE}/v1/service-departments/from-booking-params/?address_id=${encodeURIComponent(sdAddr)}`;
        if (sales_items_ids) {
          const ids = Array.isArray(sales_items_ids) ? sales_items_ids : [sales_items_ids];
          for (const id of ids) {
            url += `&sales_items_ids=${encodeURIComponent(id)}`;
          }
        }
        const res = await fetch(url, { headers });
        if (!res.ok) {
          const text = await res.text();
          console.error("Service departments error:", res.status, text);
          return jsonResponse({ error: "Failed to fetch service departments" }, 502);
        }
        const data = await res.json();
        return jsonResponse(data);
      }

      // ========== Create Booking ==========
      case "create_booking": {
        const { action: _a, address_id, user_id, user_group_id,
                license_plate, country_code, sales_item_ids,
                delivery_window_id, ...rest } = body;

        // Noddi API expects: address, user, user_group, delivery_window ({id: int}),
        // cars: [{ license_plate: {country_code, number}, selected_sales_item_ids: [int] }]
        const cartPayload: any = {
          ...rest,
          address_id,
          user_id,
          user_group_id,
          delivery_window: { id: delivery_window_id },
          cars: [
            {
              license_plate: {
                country_code: country_code || 'NO',
                number: license_plate,
              },
              selected_sales_item_ids: sales_item_ids || [],
            },
          ],
        };

        console.log("Create booking payload:", JSON.stringify(cartPayload));

        const res = await fetch(`${API_BASE}/v1/bookings/`, {
          method: "POST",
          headers,
          body: JSON.stringify(cartPayload),
        });
        if (!res.ok) {
          const text = await res.text();
          console.error("Create booking error:", res.status, text, "Payload:", JSON.stringify(cartPayload));
          return jsonResponse({ error: "Failed to create booking", details: text }, 502);
        }
        const booking = await res.json();
        return jsonResponse({ booking });
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

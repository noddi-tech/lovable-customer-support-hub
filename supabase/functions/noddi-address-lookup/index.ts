import { corsHeaders } from "../_shared/cors.ts";

const API_BASE = (Deno.env.get("NODDI_API_BASE") || "https://api.noddi.co").replace(/\/+$/, "");
const NODDI_TOKEN = Deno.env.get("NODDI_API_TOKEN") || "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, input, place_id } = await req.json();

    if (action === "suggestions") {
      if (!input || typeof input !== "string" || input.trim().length < 2) {
        return new Response(JSON.stringify({ suggestions: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const url = `${API_BASE}/v1/addresses/suggestions/?query_input=${encodeURIComponent(input.trim())}&country_codes=NO,SE`;
      console.log("Fetching suggestions from:", url);
      const res = await fetch(url, {
        headers: {
          Authorization: `Token ${NODDI_TOKEN}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Noddi suggestions error:", res.status, text);
        return new Response(JSON.stringify({ suggestions: [], error: "Failed to fetch suggestions" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await res.json();
      return new Response(JSON.stringify({ suggestions: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "resolve") {
      if (!place_id || typeof place_id !== "string") {
        return new Response(JSON.stringify({ error: "place_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const url = `${API_BASE}/v1/addresses/create-from-google-place-id/`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Token ${NODDI_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ place_id }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Noddi resolve error:", res.status, text);
        return new Response(JSON.stringify({ error: "Failed to resolve address" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const address = await res.json();
      return new Response(JSON.stringify({ address }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action. Use 'suggestions' or 'resolve'." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("noddi-address-lookup error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

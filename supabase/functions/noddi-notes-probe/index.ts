// TEMPORARY diagnostic function used to discover the exact request/response
// shape of the Noddi `/v1/user-group-notes/` API. Guarded by a one-off token
// and deleted once the shapes are confirmed.
import { corsHeaders } from "../_shared/cors.ts";

const PROBE_TOKEN = "pr0be-8f2c1a54-7d93-4e6b-a1c0-noddi-notes";
const API_BASE = (Deno.env.get("NODDI_API_BASE") || "https://api.noddi.co").replace(/\/+$/, "");
const NODDI_TOKEN = Deno.env.get("NODDI_API_TOKEN") || "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (body.token !== PROBE_TOKEN) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const path = String(body.path || "");
  const method = String(body.method || "GET");
  const payload = body.payload as unknown;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Token ${NODDI_TOKEN}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: payload === undefined || method === "GET" ? undefined : JSON.stringify(payload),
  });
  const text = await res.text();
  return new Response(JSON.stringify({ status: res.status, body: text.slice(0, 4000) }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

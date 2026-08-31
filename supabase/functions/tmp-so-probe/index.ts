const API_BASE = (Deno.env.get('NODDI_API_BASE') || 'https://api.noddi.co').replace(/\/+$/, '');
const TOKEN = Deno.env.get('NODDI_API_TOKEN') || '';

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const path = url.searchParams.get('p') || '/v1/service-organizations/?page_size=100';
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: 'application/json', ...(TOKEN ? { Authorization: `Token ${TOKEN}` } : {}) },
  });
  const text = await res.text();
  return new Response(JSON.stringify({ status: res.status, body: text.slice(0, 6000) }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

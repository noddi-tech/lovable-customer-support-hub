/**
 * Proxy for the Noddi backend brand catalog.
 *
 * Returns a slim list of brands (id, name, slug, domain, logo url) used by the
 * support hub to show which brand a live-chat conversation came from.
 * Responses are cached in-memory for a few minutes to avoid hammering the API.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const API_BASE = (Deno.env.get('NODDI_API_BASE') || 'https://api.noddi.co').replace(/\/+$/, '');
const NODDI_TOKEN = Deno.env.get('NODDI_API_TOKEN') || '';
const CACHE_TTL_MS = 5 * 60 * 1000;

interface SlimBrand {
  id: number;
  name: string;
  slug: string;
  domain: string | null;
  logo_url: string | null;
}

let cache: { at: number; brands: SlimBrand[] } | null = null;

const pickUrl = (value: unknown): string | null => {
  if (typeof value === 'string' && value.startsWith('http')) return value;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    for (const key of ['url', 'src', 'file', 'image', 'original']) {
      const nested = obj[key];
      if (typeof nested === 'string' && nested.startsWith('http')) return nested;
    }
  }
  return null;
};

const toSlim = (raw: Record<string, unknown>): SlimBrand => ({
  id: Number(raw.id),
  name: String(raw.name ?? raw.title ?? ''),
  slug: String(raw.slug ?? raw.code ?? raw.domain ?? ''),
  domain: typeof raw.domain === 'string' ? raw.domain : null,
  logo_url:
    pickUrl(raw.logo) ??
    pickUrl(raw.logo_url) ??
    pickUrl(raw.icon) ??
    pickUrl(raw.image) ??
    pickUrl(raw.favicon) ??
    null,
});

Deno.serve(async (req) => {
  captureNavioSourceVersion(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
      return new Response(JSON.stringify({ brands: cache.brands, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const baseHeaders: Record<string, string> = { Accept: 'application/json', ...navioSourceHeaders() };

    // The backend accepts `Token <key>`; older deployments used `Api-Key <key>`.
    const authSchemes = NODDI_TOKEN ? [`Token ${NODDI_TOKEN}`, `Api-Key ${NODDI_TOKEN}`] : [''];
    let res: Response | null = null;
    for (const auth of authSchemes) {
      const headers = auth ? { ...baseHeaders, Authorization: auth } : baseHeaders;
      res = await fetch(`${API_BASE}/v1/brands/?page_size=100`, { headers });
      console.log(`[noddi-brands] GET /v1/brands/ (${auth.split(' ')[0] || 'anon'}) -> ${res.status}`);
      if (res.status !== 401 && res.status !== 403) break;
    }
    if (!res) throw new Error('No response from Noddi API');

    if (!res.ok) {
      const body = await res.text();
      console.error(`[noddi-brands] upstream failed [${res.status}]: ${body.slice(0, 500)}`);
      // Serve a stale cache rather than breaking the UI
      if (cache) {
        return new Response(JSON.stringify({ brands: cache.brands, stale: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(
        JSON.stringify({ error: 'Failed to fetch brands', status: res.status, details: body }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const payload = await res.json();
    const results: Record<string, unknown>[] = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.results)
        ? payload.results
        : Array.isArray(payload?.data)
          ? payload.data
          : [];
    console.log(`[noddi-brands] parsed ${results.length} brand rows`);
    const brands = results
      .map((r: Record<string, unknown>) => toSlim(r))
      .filter((b: SlimBrand) => b.name && b.slug);

    cache = { at: Date.now(), brands };

    return new Response(JSON.stringify({ brands }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[noddi-brands] unexpected error', error);
    if (cache) {
      return new Response(JSON.stringify({ brands: cache.brands, stale: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

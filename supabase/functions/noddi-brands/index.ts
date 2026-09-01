/**
import { navioSourceHeaders, captureNavioSourceVersion } from "../_shared/navio-source.ts";
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

const toSlim = (raw: Record<string, unknown>): SlimBrand => {
  const logo = raw.logo as { url?: string } | null | undefined;
  return {
    id: Number(raw.id),
    name: String(raw.name ?? ''),
    slug: String(raw.slug ?? ''),
    domain: typeof raw.domain === 'string' ? raw.domain : null,
    logo_url: logo && typeof logo.url === 'string' ? logo.url : null,
  };
};

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

    const headers: Record<string, string> = { Accept: 'application/json', ...navioSourceHeaders() };
    if (NODDI_TOKEN) headers.Authorization = `Api-Key ${NODDI_TOKEN}`;

    const res = await fetch(`${API_BASE}/v1/brands/?page_size=100`, { headers });

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
    const results = Array.isArray(payload?.results) ? payload.results : [];
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

/**
 * Shared access to the Noddi backend brand catalog.
 *
 * Used to make sure every brand we store on a conversation is a real brand
 * from the Noddi API (never a raw page-URL host).
 */

import { navioSourceHeaders } from './navio-source.ts';

const API_BASE = (Deno.env.get('NODDI_API_BASE') || 'https://api.noddi.co').replace(/\/+$/, '');
const NODDI_TOKEN = Deno.env.get('NODDI_API_TOKEN') || '';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export interface CatalogBrand {
  id: number;
  name: string;
  slug: string;
  domain: string | null;
}

let cache: { at: number; brands: CatalogBrand[] } | null = null;

const rowsOf = (payload: any): Record<string, unknown>[] =>
  Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.results)
      ? payload.results
      : Array.isArray(payload?.data)
        ? payload.data
        : [];

export async function fetchNoddiBrands(): Promise<CatalogBrand[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.brands;

  const baseHeaders: Record<string, string> = { Accept: 'application/json', ...navioSourceHeaders() };
  const authSchemes = NODDI_TOKEN ? [`Token ${NODDI_TOKEN}`, `Api-Key ${NODDI_TOKEN}`] : [''];

  try {
    let res: Response | null = null;
    let usedAuth = '';
    for (const auth of authSchemes) {
      const headers = auth ? { ...baseHeaders, Authorization: auth } : baseHeaders;
      res = await fetch(`${API_BASE}/v1/brands/minimal/?page_size=200`, { headers });
      usedAuth = auth;
      if (res.status !== 401 && res.status !== 403) break;
    }
    if (!res || !res.ok) return cache?.brands ?? [];

    const authHeaders = { ...baseHeaders, ...(usedAuth ? { Authorization: usedAuth } : {}) };
    let payload = await res.json();
    const results = rowsOf(payload);
    let next: unknown = payload?.next;
    let guard = 0;
    while (typeof next === 'string' && next && guard++ < 20) {
      const pageRes = await fetch(next, { headers: authHeaders });
      if (!pageRes.ok) break;
      payload = await pageRes.json();
      results.push(...rowsOf(payload));
      next = payload?.next;
    }

    const brands = results
      .map((r) => ({
        id: Number(r.id),
        name: String(r.name ?? r.title ?? ''),
        slug: String(r.slug ?? r.code ?? r.domain ?? ''),
        domain: typeof r.domain === 'string' ? r.domain : null,
      }))
      .filter((b) => b.name);

    if (brands.length > 0) cache = { at: Date.now(), brands };
    return brands.length > 0 ? brands : (cache?.brands ?? []);
  } catch (error) {
    console.error('[noddi-brand-catalog] fetch failed', error);
    return cache?.brands ?? [];
  }
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/^www\./, '')
    .replace(/\.(no|co|com|se|dk)$/i, '')
    .replace(/[^a-z0-9]+/g, '');

/** Match a label ("Dekkfix") or host ("dekkfix.no") to a catalog brand name. */
export function matchBrandName(brands: CatalogBrand[], value: string | null | undefined): string | null {
  if (!value) return null;
  const needle = normalize(value);
  if (!needle) return null;

  const hit =
    brands.find((b) => normalize(b.name) === needle || normalize(b.slug) === needle) ??
    brands.find((b) => b.domain && normalize(b.domain) === needle) ??
    brands.find((b) => normalize(b.slug).length >= 4 && needle.startsWith(normalize(b.slug))) ??
    brands.find((b) => normalize(b.name).length >= 4 && needle.includes(normalize(b.name))) ??
    null;

  return hit ? hit.name : null;
}

/**
 * Resolve the brand for a widget conversation: prefer the explicit brand sent
 * by the host site, otherwise infer it from the page URL host — but only ever
 * return a name that exists in the Noddi brand catalog.
 */
export async function resolveWidgetBrand(
  explicitBrand?: string | null,
  pageUrl?: string | null,
): Promise<string | undefined> {
  let host = '';
  if (pageUrl) {
    try {
      host = new URL(pageUrl).hostname;
    } catch {
      /* ignore malformed URLs */
    }
  }
  if (!explicitBrand && !host) return undefined;

  const brands = await fetchNoddiBrands();
  if (brands.length === 0) return explicitBrand?.trim() || undefined;

  return (
    matchBrandName(brands, explicitBrand) ??
    matchBrandName(brands, host) ??
    (explicitBrand?.trim() || undefined)
  );
}

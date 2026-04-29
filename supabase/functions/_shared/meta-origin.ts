// Shared origin allowlist for Meta OAuth wizard.
// Validates the browser Origin against an allowlist before starting an OAuth flow,
// then echoes that origin back from the callback so previews/prod both work.

const STATIC_ORIGINS = new Set<string>([
  'https://support.noddi.co',
  'https://lovable-customer-support-hub.lovable.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

const WILDCARD_PATTERNS: RegExp[] = [
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/i,
  /^https:\/\/[a-z0-9-]+\.sandbox\.lovable\.dev$/i,
  /^https:\/\/[a-z0-9-]+\.lovable\.dev$/i,
];

export const FALLBACK_ORIGIN = 'https://support.noddi.co';

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (STATIC_ORIGINS.has(origin)) return true;
  return WILDCARD_PATTERNS.some((re) => re.test(origin));
}

export function safeOriginOrFallback(origin: string | null | undefined): string {
  return isAllowedOrigin(origin ?? null) ? (origin as string) : FALLBACK_ORIGIN;
}

export function buildWizardUrl(origin: string, params: Record<string, string>): string {
  const url = new URL(`${origin}/admin/recruitment`);
  url.searchParams.set('tab', 'integrations');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url.toString();
}

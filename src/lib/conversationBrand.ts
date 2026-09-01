/**
 * Brand attribution for widget (live chat / contact form) conversations.
 *
 * The embedding frontend can pass an explicit `brand` when initialising the
 * widget (`NoddiWidget.init({ widgetKey, brand: 'Noddi Bilpleie' })`). When it
 * does, the value is stored on `conversations.metadata.brand`.
 *
 * If no explicit brand was sent we fall back to deriving a readable label from
 * the page URL host so agents still see where the chat originated.
 */

export interface ConversationBrand {
  label: string;
  /** Stable key used to derive a consistent color per brand. */
  key: string;
  /** True when derived from the page URL instead of an explicit brand value. */
  inferred: boolean;
}

const stripWww = (host: string) => host.replace(/^www\./i, '');

export function getConversationBrand(
  metadata: unknown,
  channel?: string | null,
): ConversationBrand | null {
  if (channel && channel !== 'widget') return null;
  const meta = (metadata ?? {}) as Record<string, unknown>;

  const explicit =
    (typeof meta.brand === 'string' && meta.brand) ||
    (typeof meta.brand_name === 'string' && meta.brand_name) ||
    '';

  if (explicit.trim()) {
    const label = explicit.trim().slice(0, 40);
    return { label, key: label.toLowerCase(), inferred: false };
  }

  const pageUrl = typeof meta.page_url === 'string' ? meta.page_url : '';
  if (pageUrl) {
    try {
      const host = stripWww(new URL(pageUrl).hostname);
      if (host) return { label: host, key: host.toLowerCase(), inferred: true };
    } catch {
      /* ignore malformed URLs */
    }
  }

  return null;
}

/**
 * Canonical brand colors, mirrored from the email templates
 * (`supabase/functions/_shared/brand-theme.ts`) so a brand looks the same in
 * live chat, conversation lists and outgoing mail.
 */
const BRAND_THEME_COLORS: Array<{ match: RegExp; color: string }> = [
  { match: /dekkfix/, color: '#229799' },
  { match: /tr.?nderdekk/, color: '#0F766E' },
  { match: /navio/, color: '#1F6FEB' },
  { match: /noddi/, color: '#35155A' },
];

const BRAND_COLORS = [
  '#0ea5e9',
  '#8b5cf6',
  '#f97316',
  '#10b981',
  '#ec4899',
  '#f59e0b',
  '#14b8a6',
  '#6366f1',
];

export function getBrandColor(key: string): string {
  const normalized = (key || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const theme = BRAND_THEME_COLORS.find((t) => t.match.test(normalized));
  if (theme) return theme.color;

  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return BRAND_COLORS[hash % BRAND_COLORS.length];
}

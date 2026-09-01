/**
 * Brand attribution for conversations, live chats and calls.
 *
 * The brand always comes from the Noddi brand catalog: either set explicitly
 * (widget init / backend resolution) or assigned manually by an agent. Page
 * URL hosts are never used as brand labels.
 */

export interface ConversationBrand {
  label: string;
  /** Stable key used to derive a consistent color per brand. */
  key: string;
  /** Kept for API compatibility; brands are never inferred from URLs. */
  inferred: boolean;
}

export function getConversationBrand(
  metadata: unknown,
  _channel?: string | null,
): ConversationBrand | null {
  const meta = (metadata ?? {}) as Record<string, unknown>;

  const explicit =
    (typeof meta.brand === 'string' && meta.brand) ||
    (typeof meta.brand_name === 'string' && meta.brand_name) ||
    '';

  if (explicit.trim()) {
    const label = explicit.trim().slice(0, 40);
    return { label, key: label.toLowerCase(), inferred: false };
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

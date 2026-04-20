/**
 * Shared critical-alert routing helpers used by `send-slack-notification`
 * and `review-open-critical`.
 *
 * Resolves which Slack mention to prepend to a critical alert based on:
 *  1. The triage category (e.g. `service_failure`, `billing_issue`)
 *  2. The org-wide category → bucket mapping (with admin overrides)
 *  3. The bucket's mention mode + target id (subteam/user/channel/none)
 *  4. Optional per-inbox overrides from `inbox_slack_routing`
 *
 * Also provides:
 *  - Category-aware alert headers (emoji + Norwegian label + color)
 *  - Effective-keyword resolution (base list + admin add/remove + temp mutes)
 *  - Per-category AI severity thresholds
 */

export type CriticalCategory =
  | 'app_failure'
  | 'service_quality'
  | 'data_issue'
  | 'billing_issue'
  | 'safety_concern'
  | 'frustrated_customer'
  | 'escalation_request'
  | 'legal_threat'
  | 'none';

export type CriticalBucket = 'tech' | 'ops';

export type MentionMode = 'channel' | 'subteam' | 'user' | 'none';

/**
 * Default category-to-bucket mapping. Admins can override per-org via
 * `slack_integrations.critical_category_routing`. Any new categories added
 * later will fall through to `'ops'` so they remain visible.
 */
export const DEFAULT_CATEGORY_BUCKETS: Record<string, CriticalBucket> = {
  app_failure: 'tech',
  service_quality: 'ops',
  data_issue: 'tech',
  billing_issue: 'ops',
  safety_concern: 'ops',
  frustrated_customer: 'ops',
  escalation_request: 'ops',
  legal_threat: 'ops',
};

/**
 * Per-category presentation: emoji, Norwegian label, attachment color.
 * Used to build scannable alert headers like "⚙️ *Tjenestefeil* — {title}".
 */
export interface CategoryPresentation {
  emoji: string;
  label: string;
  color: string;
}

export const CATEGORY_PRESENTATION: Record<string, CategoryPresentation> = {
  app_failure:         { emoji: '⚙️',  label: 'App-/systemfeil',   color: '#dc2626' },
  service_quality:     { emoji: '🔧', label: 'Tjenestekvalitet',  color: '#ea580c' },
  data_issue:          { emoji: '📊', label: 'Datafeil',          color: '#dc2626' },
  billing_issue:       { emoji: '💳', label: 'Betalingsproblem',  color: '#f59e0b' },
  safety_concern:      { emoji: '⚠️',  label: 'Sikkerhetsproblem', color: '#7c2d12' },
  frustrated_customer: { emoji: '😤', label: 'Frustrert kunde',   color: '#ea580c' },
  escalation_request:  { emoji: '🆙', label: 'Eskalering',        color: '#ea580c' },
  legal_threat:        { emoji: '⚖️',  label: 'Rettslig trussel',  color: '#581c87' },
};

const FALLBACK_PRESENTATION: CategoryPresentation = {
  emoji: '🚨',
  label: 'Kritisk varsel',
  color: '#dc2626',
};

export function getCategoryPresentation(category: string | null | undefined): CategoryPresentation {
  if (!category) return FALLBACK_PRESENTATION;
  return CATEGORY_PRESENTATION[category.toLowerCase()] ?? FALLBACK_PRESENTATION;
}

/**
 * Build a category-prefixed Slack alert header.
 *
 * Returns:
 *  - `headerText`: markdown for the first section block ("⚙️ *Tjenestefeil* — {title}")
 *  - `fallbackText`: short text for mobile push notifications
 *  - `color`: attachment sidebar color
 *  - `severityBadge`: optional second-line badge ("🔥 Severity 5/5")
 */
export function buildAlertHeader(opts: {
  category: string | null | undefined;
  title: string;
  customerName?: string | null;
  severity?: number | null;
  mentionPrefix?: string;
  isBatch?: boolean;
}): { headerText: string; fallbackText: string; color: string; severityBadge: string | null; label: string; emoji: string } {
  const { category, title, customerName, severity, mentionPrefix, isBatch } = opts;
  const pres = getCategoryPresentation(category);
  const batchSuffix = isBatch ? ' (Batch)' : '';

  const headerText = `${pres.emoji} *${pres.label}*${batchSuffix} — ${title}`;

  const customerPart = customerName ? ` (${customerName})` : '';
  const mentionPart = mentionPrefix ? ` ${mentionPrefix}` : '';
  const fallbackText = `${pres.emoji} ${pres.label}${batchSuffix} — ${title}${customerPart}${mentionPart}`;

  let severityBadge: string | null = null;
  if (typeof severity === 'number' && severity >= 4) {
    severityBadge = `🔥 Severity ${severity}/5`;
  } else if (severity === 3) {
    severityBadge = `🟠 Severity 3/5`;
  }

  return {
    headerText,
    fallbackText,
    color: pres.color,
    severityBadge,
    label: pres.label,
    emoji: pres.emoji,
  };
}

/**
 * Standard footer prompting Slack users to react with feedback.
 * Wired to the `slack-event-handler` reaction listener.
 */
export const FEEDBACK_FOOTER_TEXT =
  '👍 nyttig · 👎 falsk alarm · 🔇 demp denne triggeren i 7 dager';

export function buildFeedbackFooterBlock(): { type: 'context'; elements: Array<{ type: 'mrkdwn'; text: string }> } {
  return {
    type: 'context',
    elements: [{ type: 'mrkdwn', text: FEEDBACK_FOOTER_TEXT }],
  };
}

/**
 * Base critical keyword list — shared between `send-slack-notification` and
 * `review-open-critical`. Admin overrides (add/remove) and temporary mutes
 * are applied via {@link getEffectiveKeywords}.
 */
export const BASE_CRITICAL_KEYWORDS: string[] = [
  // English
  'booking', "can't book", 'cannot book', 'payment failed', 'payment error',
  'error', 'not working', 'broken', 'down', 'outage', "can't access",
  'unable to', 'fails', 'failure', 'critical', 'urgent',
  // Norwegian
  'kan ikke bestille', 'bestilling feilet', 'bestilling feiler',
  'betaling feilet', 'betaling feiler', 'betalingsfeil',
  'fungerer ikke', 'virker ikke', 'funker ikke',
  'feil', 'feilmelding', 'feiler',
  'nedetid', 'ødelagt', 'nede',
  'får ikke til', 'klarer ikke', 'ikke tilgjengelig',
  'kritisk', 'haster', 'akutt',
  'kan ikke logge inn', 'innlogging feiler',
  'appen krasjer', 'krasjer', 'tom side', 'blank side',
];

export interface KeywordOverrides {
  disabled?: string[];
  added?: string[];
}

/**
 * Compute the effective keyword list for an org:
 *   BASE ∪ overrides.added − overrides.disabled − active mutes
 */
export function getEffectiveKeywords(
  overrides: KeywordOverrides | null | undefined,
  activeMutedKeywords: string[],
): string[] {
  const disabled = new Set((overrides?.disabled || []).map((k) => k.toLowerCase()));
  const muted = new Set(activeMutedKeywords.map((k) => k.toLowerCase()));
  const added = (overrides?.added || []).map((k) => k.toLowerCase());

  const merged = new Set<string>([...BASE_CRITICAL_KEYWORDS.map((k) => k.toLowerCase()), ...added]);
  for (const d of disabled) merged.delete(d);
  for (const m of muted) merged.delete(m);

  return Array.from(merged);
}

/**
 * Get the minimum AI severity required to fire an alert for a given category.
 * Defaults to 3 if not explicitly set.
 */
export function getCategoryThreshold(
  thresholds: Record<string, number> | null | undefined,
  category: string | null | undefined,
): number {
  if (!category) return 3;
  const t = thresholds?.[category.toLowerCase()];
  if (typeof t === 'number' && t >= 1 && t <= 5) return t;
  return 3;
}

/**
 * Keyword → category hint, used when the alert was triggered by keyword
 * match (no AI category available). Conservative defaults — anything not
 * matched here falls through to `'service_failure'` as the safest "tech"
 * bucket for unknown technical-sounding triggers.
 */
const KEYWORD_CATEGORY_HINTS: Array<{ patterns: RegExp; category: CriticalCategory }> = [
  { patterns: /\b(payment|billing|betalingsfeil|betaling feil|faktura|belastet)\b/i, category: 'billing_issue' },
  { patterns: /\b(legal|advokat|sue|stevning|forbrukerrådet)\b/i, category: 'legal_threat' },
  { patterns: /\b(injury|skadet person|safety|farlig|ulykke|brann)\b/i, category: 'safety_concern' },
  { patterns: /\b(angry|frustrated|elendig|forferdelig|verste|aldri mer)\b/i, category: 'frustrated_customer' },
  { patterns: /\b(supervisor|manager|leder|escalat|eskaler)\b/i, category: 'escalation_request' },
  { patterns: /\b(wrong data|feil data|mangler|missing info)\b/i, category: 'data_issue' },
  // App / system failures (tech): software, login, payment-page, crashes, downtime
  { patterns: /\b(app|appen|krasj|krasjer|logge inn|innlogging|nede|outage|broken|tom side|blank side|betalingsside|innloggingsside)\b/i, category: 'app_failure' },
  // Physical service quality (ops): noise, damage caused by service, faulty installation, poor workmanship
  { patterns: /\b(metallisk|lyd fra|skade på|skade etter|skadet etter|skadet under|feilmontert|feil montert|dårlig utført|reklamasjon|ødelagt etter)\b/i, category: 'service_quality' },
];

export function inferCategoryFromKeyword(keyword: string | null | undefined): CriticalCategory {
  if (!keyword) return 'app_failure';
  for (const { patterns, category } of KEYWORD_CATEGORY_HINTS) {
    if (patterns.test(keyword)) return category;
  }
  return 'app_failure';
}

/** Resolve the bucket for a given category, honoring org overrides. */
export function resolveBucket(
  category: string | null | undefined,
  categoryRouting: Record<string, string> | null | undefined,
): CriticalBucket {
  const cat = (category || '').toLowerCase();
  const override = categoryRouting?.[cat];
  if (override === 'tech' || override === 'ops') return override;
  const fallback = DEFAULT_CATEGORY_BUCKETS[cat];
  return fallback ?? 'ops';
}

export interface BucketConfig {
  mention_mode: MentionMode | null;
  subteam_id: string | null;
  subteam_handle: string | null;
  user_id: string | null;
}

export interface IntegrationRoutingFields {
  critical_tech_mention_mode: string | null;
  critical_tech_subteam_id: string | null;
  critical_tech_subteam_handle: string | null;
  critical_tech_user_id: string | null;
  critical_ops_mention_mode: string | null;
  critical_ops_subteam_id: string | null;
  critical_ops_subteam_handle: string | null;
  critical_ops_user_id: string | null;
}

/**
 * Pull the bucket-specific config from an integration / inbox-routing row.
 * Inbox overrides take precedence when set; otherwise fall back to org
 * defaults.
 */
export function getBucketConfig(
  bucket: CriticalBucket,
  integration: IntegrationRoutingFields,
  inboxOverride?: Partial<IntegrationRoutingFields> | null,
): BucketConfig {
  const prefix = `critical_${bucket}` as const;
  const ovr = inboxOverride ?? {};
  const pick = <K extends keyof IntegrationRoutingFields>(suffix: string): string | null => {
    const key = `${prefix}_${suffix}` as K;
    const overrideVal = (ovr as IntegrationRoutingFields)[key];
    if (overrideVal !== null && overrideVal !== undefined && overrideVal !== '') {
      return overrideVal;
    }
    return integration[key] ?? null;
  };

  return {
    mention_mode: (pick('mention_mode') as MentionMode | null) ?? 'channel',
    subteam_id: pick('subteam_id'),
    subteam_handle: pick('subteam_handle'),
    user_id: pick('user_id'),
  };
}

/**
 * Build the Slack mention prefix for a resolved bucket. Returns an empty
 * string when the mode is `'none'` or required ids are missing — the alert
 * still fires, just without a ping.
 */
export function buildMentionPrefix(config: BucketConfig): string {
  switch (config.mention_mode) {
    case 'subteam':
      return config.subteam_id ? `<!subteam^${config.subteam_id}>` : '<!channel>';
    case 'user':
      return config.user_id ? `<@${config.user_id}>` : '<!channel>';
    case 'none':
      return '';
    case 'channel':
    default:
      return '<!channel>';
  }
}

/** Human-readable label for context blocks in Slack alerts. */
export function describeRouting(bucket: CriticalBucket, config: BucketConfig, category: string): string {
  const bucketLabel = bucket === 'tech' ? 'Tech' : 'Ops';
  const target = (() => {
    switch (config.mention_mode) {
      case 'subteam':
        return config.subteam_handle ? `@${config.subteam_handle}` : 'subteam';
      case 'user':
        return config.user_id ? `<@${config.user_id}>` : 'user';
      case 'none':
        return 'no ping';
      case 'channel':
      default:
        return '@channel';
    }
  })();
  return `🏷️ Routed to: ${bucketLabel} (${target}) — category: \`${category}\``;
}

/**
 * Shared critical-alert routing helpers used by `send-slack-notification`
 * and `review-open-critical`.
 *
 * Resolves which Slack mention to prepend to a critical alert based on:
 *  1. The triage category (e.g. `service_failure`, `billing_issue`)
 *  2. The org-wide category → bucket mapping (with admin overrides)
 *  3. The bucket's mention mode + target id (subteam/user/channel/none)
 *  4. Optional per-inbox overrides from `inbox_slack_routing`
 */

export type CriticalCategory =
  | 'service_failure'
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
  service_failure: 'tech',
  data_issue: 'tech',
  billing_issue: 'ops',
  safety_concern: 'ops',
  frustrated_customer: 'ops',
  escalation_request: 'ops',
  legal_threat: 'ops',
};

/**
 * Keyword → category hint, used when the alert was triggered by keyword
 * match (no AI category available). Conservative defaults — anything not
 * matched here falls through to `'service_failure'` as the safest "tech"
 * bucket for unknown technical-sounding triggers.
 */
const KEYWORD_CATEGORY_HINTS: Array<{ patterns: RegExp; category: CriticalCategory }> = [
  { patterns: /\b(payment|billing|betalingsfeil|betaling feil|faktura|belastet)\b/i, category: 'billing_issue' },
  { patterns: /\b(legal|advokat|sue|stevning|forbrukerrådet)\b/i, category: 'legal_threat' },
  { patterns: /\b(injury|skadet|safety|farlig|ulykke|brann)\b/i, category: 'safety_concern' },
  { patterns: /\b(angry|frustrated|elendig|forferdelig|verste|aldri mer)\b/i, category: 'frustrated_customer' },
  { patterns: /\b(supervisor|manager|leder|escalat|eskaler)\b/i, category: 'escalation_request' },
  { patterns: /\b(wrong data|feil data|mangler|missing info)\b/i, category: 'data_issue' },
];

export function inferCategoryFromKeyword(keyword: string | null | undefined): CriticalCategory {
  if (!keyword) return 'service_failure';
  for (const { patterns, category } of KEYWORD_CATEGORY_HINTS) {
    if (patterns.test(keyword)) return category;
  }
  return 'service_failure';
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

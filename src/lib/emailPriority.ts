/**
 * Email importance/priority (RFC 2156/4021) — the thing Outlook shows as the
 * red "!" or blue down-arrow. It is a standard mail feature, not Outlook-only.
 *
 *   Importance:        High | Normal | Low
 *   X-Priority:        1 (Highest) … 5 (Lowest)
 *   X-MSMail-Priority: High | Normal | Low
 */

export type EmailPriority = 'high' | 'normal' | 'low';

function headerValue(headersRaw: string | null | undefined, name: string): string | null {
  if (!headersRaw) return null;
  const regex = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*(.*)$`, 'im');
  const m = headersRaw.match(regex);
  return m ? m[1].trim() : null;
}

/** Parse priority out of a raw header blob. 'normal' when absent or unknown. */
export function parseEmailPriority(headersRaw: string | null | undefined): EmailPriority {
  if (!headersRaw) return 'normal';

  const importance = (headerValue(headersRaw, 'Importance') || '').toLowerCase();
  if (importance.startsWith('high') || importance.startsWith('urgent')) return 'high';
  if (importance.startsWith('low') || importance.startsWith('non-urgent')) return 'low';

  const xPriority = headerValue(headersRaw, 'X-Priority') || headerValue(headersRaw, 'Priority');
  if (xPriority) {
    const num = parseInt(xPriority.trim(), 10);
    if (!Number.isNaN(num)) {
      if (num <= 2) return 'high';
      if (num >= 4) return 'low';
      return 'normal';
    }
    const word = xPriority.toLowerCase();
    if (word.includes('high') || word.includes('urgent')) return 'high';
    if (word.includes('low') || word.includes('non-urgent')) return 'low';
  }

  const msMail = (headerValue(headersRaw, 'X-MSMail-Priority') || '').toLowerCase();
  if (msMail.includes('high')) return 'high';
  if (msMail.includes('low')) return 'low';

  return 'normal';
}

/**
 * Priority of a stored message. Newly ingested/sent messages carry it in
 * `metadata.email_priority`; older ones are re-derived from their raw headers.
 */
export function getMessagePriority(message: unknown): EmailPriority {
  const m = message as
    | { metadata?: unknown; email_headers?: unknown; originalMessage?: unknown }
    | null
    | undefined;
  if (!m) return 'normal';

  const source = (m.originalMessage ?? m) as { metadata?: unknown; email_headers?: unknown };

  const meta = source?.metadata as Record<string, unknown> | null | undefined;
  const stored = typeof meta?.email_priority === 'string' ? (meta.email_priority as string) : null;
  if (stored === 'high' || stored === 'low' || stored === 'normal') return stored;

  const headers = source?.email_headers as { raw?: string } | string | null | undefined;
  const raw = typeof headers === 'string' ? headers : headers?.raw;
  return parseEmailPriority(raw);
}

export const EMAIL_PRIORITY_LABELS: Record<EmailPriority, string> = {
  high: 'High importance',
  normal: 'Normal importance',
  low: 'Low importance',
};

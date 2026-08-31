/**
 * Groups inboxes visually by the email domain they belong to
 * (e.g. all @noddi.no inboxes are shown together).
 */

export const emailDomain = (email?: string | null): string | null => {
  if (!email) return null;
  const at = email.lastIndexOf('@');
  if (at === -1) return null;
  const domain = email.slice(at + 1).trim().toLowerCase();
  return domain || null;
};

export interface InboxDomainGroup<T> {
  /** Domain key, e.g. "noddi.no", or null for inboxes without an email */
  domain: string | null;
  /** Display label, e.g. "@noddi.no" or "Not configured" */
  label: string;
  inboxes: T[];
}

/**
 * Groups the given inboxes by the domain of their connected email address.
 * Domains are sorted alphabetically; inboxes without an email come last.
 */
export function groupInboxesByDomain<T extends { id: string; name?: string }>(
  inboxes: T[],
  emails: Record<string, string | undefined>,
): InboxDomainGroup<T>[] {
  const map = new Map<string, InboxDomainGroup<T>>();

  for (const inbox of inboxes) {
    const domain = emailDomain(emails[inbox.id]);
    const key = domain ?? '__none__';
    let group = map.get(key);
    if (!group) {
      group = {
        domain,
        label: domain ? `@${domain}` : 'Not configured',
        inboxes: [],
      };
      map.set(key, group);
    }
    group.inboxes.push(inbox);
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.domain === b.domain) return 0;
    if (a.domain === null) return 1;
    if (b.domain === null) return -1;
    return a.domain.localeCompare(b.domain);
  });
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InboxOutstanding {
  open: number;
  pending: number;
  total: number;
}

/** Strip reply/forward prefixes so "Re: X" and "X" collapse into one thread. */
const threadKey = (email: string | null | undefined, subject: string | null | undefined) => {
  const normalizedSubject = (subject || '')
    .toLowerCase()
    .replace(/^(re:|fwd?:|fw:|aw:|sv:|vs:)\s*/gi, '')
    .trim();
  return `${(email || '').toLowerCase()}|${normalizedSubject}`;
};

/**
 * Per-inbox counts of outstanding work (open + pending conversations).
 * Used by the inbox selector so agents can see the workload at a glance.
 *
 * The list view groups conversations into threads (same customer + same
 * subject) and hides archived/deleted/snoozed rows, so this hook applies the
 * exact same rules — otherwise the badge shows e.g. 31 while the list has 3.
 */
export const useInboxOutstandingCounts = () => {
  return useQuery({
    queryKey: ['inbox-outstanding-counts'],
    staleTime: 60_000,
    refetchInterval: 120_000,
    queryFn: async (): Promise<Record<string, InboxOutstanding>> => {
      const { data, error } = await supabase
        .from('conversations')
        .select('inbox_id, status, subject, is_archived, deleted_at, snooze_until, customer:customers(email)')
        .in('status', ['open', 'pending'])
        .limit(5000);

      if (error) throw error;

      type Row = {
        inbox_id: string | null;
        status: string;
        subject: string | null;
        is_archived: boolean | null;
        deleted_at: string | null;
        snooze_until: string | null;
        customer?: { email: string | null } | null;
      };

      const now = Date.now();
      const seen = new Set<string>();
      const map: Record<string, InboxOutstanding> = {};

      for (const row of (data || []) as unknown as Row[]) {
        if (!row.inbox_id) continue;
        if (row.is_archived) continue;
        if (row.deleted_at) continue;
        if (row.snooze_until && new Date(row.snooze_until).getTime() > now) continue;

        // Count each thread once, matching the list view's thread grouping.
        const key = `${row.inbox_id}|${threadKey(row.customer?.email, row.subject)}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const entry = (map[row.inbox_id] ||= { open: 0, pending: 0, total: 0 });
        if (row.status === 'open') entry.open += 1;
        else if (row.status === 'pending') entry.pending += 1;
        entry.total += 1;
      }
      return map;
    },
  });
};

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InboxOutstanding {
  open: number;
  pending: number;
  total: number;
}

/**
 * Per-inbox counts of outstanding work (open + pending conversations).
 * Used by the inbox selector so agents can see the workload at a glance.
 */
export const useInboxOutstandingCounts = () => {
  return useQuery({
    queryKey: ['inbox-outstanding-counts'],
    staleTime: 60_000,
    refetchInterval: 120_000,
    queryFn: async (): Promise<Record<string, InboxOutstanding>> => {
      const { data, error } = await supabase
        .from('conversations')
        .select('inbox_id, status')
        .in('status', ['open', 'pending'])
        .limit(5000);

      if (error) throw error;

      const map: Record<string, InboxOutstanding> = {};
      for (const row of (data || []) as Array<{ inbox_id: string | null; status: string }>) {
        if (!row.inbox_id) continue;
        const entry = (map[row.inbox_id] ||= { open: 0, pending: 0, total: 0 });
        if (row.status === 'open') entry.open += 1;
        else if (row.status === 'pending') entry.pending += 1;
        entry.total += 1;
      }
      return map;
    },
  });
};

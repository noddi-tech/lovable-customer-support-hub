import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InboxOutstanding {
  open: number;
  pending: number;
  total: number;
}

/**
 * Per-inbox counts of outstanding work (open + pending conversations).
 *
 * Uses the same thread grouping as the conversation list: conversations are
 * collapsed per customer email + normalised subject, and the newest message in
 * the thread decides its status. That way an older "open" row inside a thread
 * that has since been closed no longer inflates the badge.
 */
export const useInboxOutstandingCounts = () => {
  return useQuery({
    queryKey: ['inbox-outstanding-counts'],
    staleTime: 60_000,
    refetchInterval: 120_000,
    queryFn: async (): Promise<Record<string, InboxOutstanding>> => {
      const { data, error } = await (supabase.rpc as any)('get_inbox_outstanding_counts');
      if (error) throw error;

      const map: Record<string, InboxOutstanding> = {};
      for (const row of (data || []) as Array<{
        inbox_id: string | null;
        open_count: number;
        pending_count: number;
        total_count: number;
      }>) {
        if (!row.inbox_id) continue;
        map[row.inbox_id] = {
          open: Number(row.open_count) || 0,
          pending: Number(row.pending_count) || 0,
          total: Number(row.total_count) || 0,
        };
      }
      return map;
    },
  });
};


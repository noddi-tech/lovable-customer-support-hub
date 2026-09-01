import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCaseQueueCounts } from '@/hooks/useCases';

export interface SidebarNavCounts {
  text: number;
  chat: number;
  cases: number;
}

/**
 * Counts used for the small number overlays on the sidebar nav icons.
 * - text: open text conversations (same source as the inbox list "All inboxes" count)
 * - chat: active live chat conversations (widget channel, open/pending)
 * - cases: cases in an open state
 */
export const useSidebarNavCounts = (): SidebarNavCounts => {
  const { user, loading, profile } = useAuth();
  const queryClient = useQueryClient();
  const organizationId = profile?.organization_id;

  // Reuse the exact same query the Cases page uses, so the badge always matches "All open"
  const { data: caseCounts } = useCaseQueueCounts();

  const { data } = useQuery({
    queryKey: ['sidebar-nav-counts', organizationId],
    enabled: !!user && !loading,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: false,
    queryFn: async (): Promise<SidebarNavCounts> => {
      const [allCountsRes, chatRes] = await Promise.all([
        // Same RPC the inbox list uses, so the badge matches "All inboxes"
        (supabase.rpc as any)('get_all_counts'),
        (() => {
          let q = (supabase.from('conversations') as any)
            .select('id', { count: 'exact', head: true })
            .eq('channel', 'widget')
            .in('status', ['open', 'pending'])
            .is('deleted_at', null);
          if (organizationId) q = q.eq('organization_id', organizationId);
          return q;
        })(),
      ]);

      const row = (allCountsRes as any)?.data?.[0];
      const textOpen = Number(row?.conversations_open) || 0;
      const chatActive = (chatRes as any)?.count ?? 0;

      return {
        // Text = all open conversations minus the live-chat ones (those get their own badge)
        text: Math.max(textOpen - chatActive, 0),
        chat: chatActive,
        cases: 0, // filled in from useCaseQueueCounts below
      };
    },
  });

  // Keep the badges fresh when conversations or chat sessions change
  useEffect(() => {
    if (!user || loading) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const invalidate = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['sidebar-nav-counts'] });
      }, 2000);
    };

    const channel = supabase
      .channel('sidebar-nav-counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'widget_chat_sessions' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cases' }, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['case-queue-counts'] });
        }, 2000);
      })
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [user, loading, queryClient]);

  return {
    text: data?.text ?? 0,
    chat: data?.chat ?? 0,
    cases: caseCounts?.open ?? 0,
  };
};

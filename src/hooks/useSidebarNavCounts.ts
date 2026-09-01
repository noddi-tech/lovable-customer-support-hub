import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { OPEN_CASE_STATUSES } from '@/hooks/useCases';

export interface SidebarNavCounts {
  text: number;
  chat: number;
  cases: number;
}

/**
 * Counts used for the small number overlays on the sidebar nav icons.
 * - text: unread text (email/SMS) conversations
 * - chat: live chat sessions waiting or active
 * - cases: cases in an open state
 */
export const useSidebarNavCounts = (): SidebarNavCounts => {
  const { user, loading } = useAuth();

  const { data } = useQuery({
    queryKey: ['sidebar-nav-counts'],
    enabled: !!user && !loading,
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: false,
    queryFn: async (): Promise<SidebarNavCounts> => {
      const [textRes, chatRes, casesRes] = await Promise.all([
        supabase
          .from('conversations')
          .select('id', { count: 'exact', head: true })
          .eq('is_read', false)
          .eq('is_archived', false)
          .neq('status', 'closed'),
        supabase
          .from('chat_sessions')
          .select('id', { count: 'exact', head: true })
          .in('status', ['waiting', 'active']),
        (supabase.from('cases') as any)
          .select('id', { count: 'exact', head: true })
          .in('status', OPEN_CASE_STATUSES),
      ]);

      return {
        text: textRes.count ?? 0,
        chat: chatRes.count ?? 0,
        cases: casesRes.count ?? 0,
      };
    },
  });

  return data ?? { text: 0, chat: 0, cases: 0 };
};

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface OnlineAgent {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url?: string;
  chat_availability: 'online' | 'away' | 'offline';
}

export function useOnlineAgents() {
  const { profile } = useAuth();
  const organizationId = profile?.organization_id;

  return useQuery({
    queryKey: ['online-agents', organizationId],
    queryFn: async (): Promise<OnlineAgent[]> => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          full_name,
          avatar_url,
          chat_availability
        `)
        .eq('organization_id', organizationId)
        .in('chat_availability', ['online', 'away'])
        .order('full_name');

      if (error) {
        console.error('[useOnlineAgents] Error fetching agents:', error);
        throw error;
      }

      return (data || []).map(agent => ({
        id: agent.id,
        user_id: agent.user_id,
        full_name: agent.full_name || 'Unknown',
        avatar_url: agent.avatar_url,
        chat_availability: agent.chat_availability as 'online' | 'away' | 'offline',
      }));
    },
    enabled: !!organizationId,
    refetchInterval: 15000, // Poll every 15 seconds
    staleTime: 10000,
  });
}

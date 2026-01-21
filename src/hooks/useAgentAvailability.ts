import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type AvailabilityStatus = 'online' | 'away' | 'offline';

interface UseAgentAvailabilityResult {
  status: AvailabilityStatus;
  setStatus: (status: AvailabilityStatus) => Promise<void>;
  isLoading: boolean;
  onlineAgentCount: number;
  isUpdating: boolean;
}

export function useAgentAvailability(): UseAgentAvailabilityResult {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [localStatus, setLocalStatus] = useState<AvailabilityStatus>('offline');

  // Fetch current user's availability status
  const { data: currentStatus, isLoading } = useQuery({
    queryKey: ['agent-availability', user?.id],
    queryFn: async () => {
      if (!user?.id) return 'offline';
      
      const { data, error } = await supabase
        .from('profiles')
        .select('chat_availability')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('[useAgentAvailability] Error fetching status:', error);
        return 'offline';
      }

      return (data?.chat_availability as AvailabilityStatus) || 'offline';
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });

  // Fetch online agent count for the organization
  const { data: onlineCount = 0 } = useQuery({
    queryKey: ['online-agent-count', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return 0;

      const { data, error } = await supabase
        .rpc('get_online_agent_count', { org_id: profile.organization_id });

      if (error) {
        console.error('[useAgentAvailability] Error fetching online count:', error);
        return 0;
      }

      return data || 0;
    },
    enabled: !!profile?.organization_id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Mutation to update status
  const updateMutation = useMutation({
    mutationFn: async (newStatus: AvailabilityStatus) => {
      if (!user?.id) throw new Error('No user');

      const { error } = await supabase
        .from('profiles')
        .update({ 
          chat_availability: newStatus,
          chat_availability_updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;
      return newStatus;
    },
    onMutate: async (newStatus) => {
      // Optimistic update
      setLocalStatus(newStatus);
      await queryClient.cancelQueries({ queryKey: ['agent-availability', user?.id] });
      const previousStatus = queryClient.getQueryData(['agent-availability', user?.id]);
      queryClient.setQueryData(['agent-availability', user?.id], newStatus);
      return { previousStatus };
    },
    onError: (err, newStatus, context) => {
      // Rollback on error
      if (context?.previousStatus) {
        queryClient.setQueryData(['agent-availability', user?.id], context.previousStatus);
        setLocalStatus(context.previousStatus as AvailabilityStatus);
      }
      console.error('[useAgentAvailability] Error updating status:', err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-availability', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['online-agent-count'] });
    },
  });

  // Sync local status with fetched status
  useEffect(() => {
    if (currentStatus) {
      setLocalStatus(currentStatus);
    }
  }, [currentStatus]);

  // Set to offline when user leaves the page
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (localStatus === 'online' || localStatus === 'away') {
        // Use supabase directly on unload - sendBeacon doesn't work well with auth
        await supabase
          .from('profiles')
          .update({ chat_availability: 'offline' })
          .eq('user_id', user?.id);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [localStatus, user?.id]);

  const setStatus = useCallback(async (newStatus: AvailabilityStatus) => {
    await updateMutation.mutateAsync(newStatus);
  }, [updateMutation]);

  return {
    status: localStatus,
    setStatus,
    isLoading,
    onlineAgentCount: onlineCount,
    isUpdating: updateMutation.isPending,
  };
}

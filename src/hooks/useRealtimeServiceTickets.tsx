import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';

export const useRealtimeServiceTickets = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('service-tickets-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_tickets',
        },
        () => {
          // Invalidate all service ticket queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['service-tickets'] });
          queryClient.invalidateQueries({ queryKey: ['service-ticket'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_ticket_comments',
        },
        () => {
          // Invalidate ticket queries when comments are added
          queryClient.invalidateQueries({ queryKey: ['service-ticket'] });
          queryClient.invalidateQueries({ queryKey: ['ticket-comments'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_ticket_events',
        },
        () => {
          // Invalidate ticket queries when events are added
          queryClient.invalidateQueries({ queryKey: ['service-ticket'] });
          queryClient.invalidateQueries({ queryKey: ['ticket-events'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
};

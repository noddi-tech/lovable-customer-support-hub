import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';

export const useRealtimeServiceTickets = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Use unique channel name to avoid conflicts
    const channelName = `service-tickets-${user.id}-${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_tickets',
        },
        (payload) => {
          console.log('Service ticket change:', payload);
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
        (payload) => {
          console.log('Ticket comment change:', payload);
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
        (payload) => {
          console.log('Ticket event change:', payload);
          queryClient.invalidateQueries({ queryKey: ['service-ticket'] });
          queryClient.invalidateQueries({ queryKey: ['ticket-events'] });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Realtime connected: ${channelName}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Realtime error: ${channelName}`);
        }
      });

    return () => {
      console.log(`🧹 Cleaning up channel: ${channelName}`);
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
};

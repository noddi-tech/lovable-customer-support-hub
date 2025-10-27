import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { useBrowserNotifications } from './useBrowserNotifications';

export const useServiceTicketNotifications = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showNotification, permission } = useBrowserNotifications();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('service-ticket-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const notification = payload.new as any;
          
          // Only handle service ticket notifications
          if (!notification.data?.ticket_id) return;

          // Invalidate queries to update notification badge
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
          queryClient.invalidateQueries({ queryKey: ['service-tickets'] });

          // Show toast notification
          toast(notification.title, {
            description: notification.message,
            action: notification.data?.ticket_id ? {
              label: 'View Ticket',
              onClick: () => {
                window.location.href = `/service-tickets?ticket=${notification.data.ticket_id}`;
              },
            } : undefined,
          });

          // Show browser notification if permission granted
          if (permission === 'granted') {
            await showNotification({
              title: notification.title,
              body: notification.message,
              tag: notification.id,
              data: notification.data,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, showNotification, permission]);
};

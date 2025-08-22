import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
// Using centralized realtime system - no longer needed

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  data: any;
  created_at: string;
  updated_at: string;
}

export const useOptimizedNotifications = () => {
  // Get notifications with selective fields and optimized polling
  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: async (): Promise<Notification[]> => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, title, message, type, is_read, data, created_at, updated_at')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }
      
      return data || [];
    },
    refetchInterval: 5 * 60 * 1000, // 5 minutes - less frequent polling
    staleTime: 3 * 60 * 1000, // 3 minutes stale time
  });

  // Real-time subscriptions handled centrally via useOptimizedCounts

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  };

  const markAllAsRead = async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  };

  return {
    notifications: notificationsQuery.data || [],
    isLoading: notificationsQuery.isLoading,
    error: notificationsQuery.error,
    markAsRead,
    markAllAsRead,
    refetch: notificationsQuery.refetch,
    unreadCount: notificationsQuery.data?.length || 0,
  };
};
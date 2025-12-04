import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type NotificationCategory = 
  | 'all' 
  | 'urgent' 
  | 'assigned' 
  | 'mentions' 
  | 'calls' 
  | 'conversations' 
  | 'tickets' 
  | 'system';

export type NotificationPriority = 'urgent' | 'high' | 'normal' | 'low';

export interface EnhancedNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  data: Record<string, any> | null;
  priority: NotificationPriority;
  category: NotificationCategory;
}

// Determine priority based on notification type and data
const getPriority = (notification: any): NotificationPriority => {
  const type = notification.type?.toLowerCase() || '';
  const data = notification.data || {};
  
  // Urgent: Missed calls, escalations, overdue tickets
  if (type.includes('missed') || type.includes('escalation') || data.overdue) {
    return 'urgent';
  }
  
  // High: New assignments, mentions/tags
  if (type.includes('assignment') || type.includes('mention') || type.includes('tag') || data.assigned_to) {
    return 'high';
  }
  
  // Low: System notifications, completed items
  if (type.includes('system') || type.includes('completed') || type.includes('resolved')) {
    return 'low';
  }
  
  // Normal: Everything else
  return 'normal';
};

// Determine category based on notification data
const getCategory = (notification: any, userId: string): NotificationCategory => {
  const data = notification.data || {};
  const type = notification.type?.toLowerCase() || '';
  
  // Check for urgent items first
  if (type.includes('missed') || type.includes('escalation') || data.overdue) {
    return 'urgent';
  }
  
  // Check for assignments to current user
  if (data.assigned_to === userId || data.assigned_to_id === userId) {
    return 'assigned';
  }
  
  // Check for mentions
  if (data.mentioned_user_id === userId || type.includes('mention') || type.includes('tag')) {
    return 'mentions';
  }
  
  // Check for calls
  if (data.call_id) {
    return 'calls';
  }
  
  // Check for tickets
  if (data.ticket_id) {
    return 'tickets';
  }
  
  // Check for conversations
  if (data.conversation_id) {
    return 'conversations';
  }
  
  // Default to system
  return 'system';
};

export const useNotificationFilters = (selectedCategory: NotificationCategory = 'all') => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all notifications
  const { data: notifications = [], isLoading, error, refetch } = useQuery({
    queryKey: ['notifications-enhanced'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 30000,
  });

  // Enhance notifications with priority and category
  const enhancedNotifications = useMemo(() => {
    if (!user) return [];
    
    return notifications.map((n): EnhancedNotification => ({
      ...n,
      data: n.data as Record<string, any> | null,
      priority: getPriority(n),
      category: getCategory(n, user.id),
    }));
  }, [notifications, user]);

  // Filter notifications by category
  const filteredNotifications = useMemo(() => {
    if (selectedCategory === 'all') return enhancedNotifications;
    return enhancedNotifications.filter(n => n.category === selectedCategory);
  }, [enhancedNotifications, selectedCategory]);

  // Group notifications by time
  const groupedNotifications = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const groups = {
      today: [] as EnhancedNotification[],
      yesterday: [] as EnhancedNotification[],
      thisWeek: [] as EnhancedNotification[],
      earlier: [] as EnhancedNotification[],
    };

    filteredNotifications.forEach(n => {
      const date = new Date(n.created_at);
      if (date >= today) {
        groups.today.push(n);
      } else if (date >= yesterday) {
        groups.yesterday.push(n);
      } else if (date >= thisWeek) {
        groups.thisWeek.push(n);
      } else {
        groups.earlier.push(n);
      }
    });

    return groups;
  }, [filteredNotifications]);

  // Count by category
  const categoryCounts = useMemo(() => {
    const counts: Record<NotificationCategory, number> = {
      all: enhancedNotifications.length,
      urgent: 0,
      assigned: 0,
      mentions: 0,
      calls: 0,
      conversations: 0,
      tickets: 0,
      system: 0,
    };

    enhancedNotifications.forEach(n => {
      counts[n.category]++;
    });

    return counts;
  }, [enhancedNotifications]);

  // Count unread by category
  const unreadCounts = useMemo(() => {
    const counts: Record<NotificationCategory, number> = {
      all: 0,
      urgent: 0,
      assigned: 0,
      mentions: 0,
      calls: 0,
      conversations: 0,
      tickets: 0,
      system: 0,
    };

    enhancedNotifications.filter(n => !n.is_read).forEach(n => {
      counts.all++;
      counts[n.category]++;
    });

    return counts;
  }, [enhancedNotifications]);

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-enhanced'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-enhanced'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-enhanced'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
    },
  });

  return {
    notifications: filteredNotifications,
    groupedNotifications,
    categoryCounts,
    unreadCounts,
    isLoading,
    error,
    refetch,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
    isMarkingRead: markAsReadMutation.isPending,
    isMarkingAllRead: markAllAsReadMutation.isPending,
    isDeleting: deleteNotificationMutation.isPending,
  };
};

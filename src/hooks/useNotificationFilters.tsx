import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Notification categories for tab-based filtering
// Notifications are a personal feed: mentions, assignments and calls only.
// Email / text / ticket follow-up is owned by the inbox, chat and cases queues.
export type NotificationCategory =
  | 'unread'
  | 'calls'
  | 'assigned'
  | 'mentions';

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
  const urgency = data.urgency?.toLowerCase() || '';
  
  // Urgent: SLA breaches, missed calls, escalations
  if (type.includes('sla_breach') || type.includes('missed') || type.includes('escalation') || urgency === 'urgent' || data.overdue) {
    return 'urgent';
  }
  
  // High: SLA warnings, assignments, mentions, new assignments
  if (type.includes('sla_warning') || type.includes('assignment') || type.includes('mention') || urgency === 'high') {
    return 'high';
  }
  
  // Low: System notifications, completed items
  if (type.includes('system') || type.includes('completed') || type.includes('resolved')) {
    return 'low';
  }
  
  // Normal: Everything else
  return 'normal';
};

// Determine notification category based on type and data.
// Returns null for queue-owned notifications (emails, replies, tickets, SLA) which
// are intentionally excluded from the personal notification feed.
const getCategory = (notification: any, userId: string): NotificationCategory | null => {
  const type = notification.type?.toLowerCase() || '';
  const data = notification.data || {};

  // Mentions (highest priority)
  if (type === 'mention' || type.includes('mentioned')) {
    return 'mentions';
  }

  // Calls, voicemail, callbacks
  if (data.call_id || type.includes('call') || type.includes('voicemail')) {
    return 'calls';
  }

  // Assignments
  if (type === 'assignment' || type.includes('assigned') ||
      (data.assigned_to_id && data.assigned_to_id === userId)) {
    return 'assigned';
  }

  return null;
};

export const useNotificationFilters = (selectedCategory: NotificationCategory = 'unread') => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all notifications - use same query key as dropdown for cache sharing
  const { data: notifications = [], isLoading, error, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  // Exact unread count from the database, restricted to the personal feed
  // (mentions, assignments, calls) since the list above is capped at 100 rows.
  const { data: totalUnread = 0 } = useQuery({
    queryKey: ['notifications-unread-total', user?.id],
    enabled: !!user,
    staleTime: 30000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('is_read', false)
        .or('type.ilike.%mention%,type.ilike.%assign%,type.ilike.%call%,type.ilike.%voicemail%');
      if (error) throw error;
      return count ?? 0;
    },
  });


  // Enhance notifications with priority and category
  const enhancedNotifications = useMemo(() => {
    if (!user) return [];
    
    return notifications
      .map((n) => {
        const category = getCategory(n, user.id);
        if (!category) return null;
        return {
          ...n,
          data: n.data as Record<string, any> | null,
          priority: getPriority(n),
          category,
        } as EnhancedNotification;
      })
      .filter((n): n is EnhancedNotification => n !== null);
  }, [notifications, user]);

  // Filter notifications by category
  const filteredNotifications = useMemo(() => {
    if (selectedCategory === 'unread') {
      return enhancedNotifications.filter(n => !n.is_read);
    }
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

  // Count unread by category
  const unreadCounts = useMemo(() => {
    const counts: Record<NotificationCategory, number> = {
      unread: 0,
      calls: 0,
      assigned: 0,
      mentions: 0,
    };

    enhancedNotifications.filter(n => !n.is_read).forEach(n => {
      counts.unread++;
      counts[n.category]++;
    });

    // The list query is capped at 100 rows, so trust the exact DB count for the
    // overall unread total (per-category counts remain based on the loaded page).
    return counts;
  }, [enhancedNotifications, totalUnread]);

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
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-total'] });
      queryClient.invalidateQueries({ queryKey: ['all-counts'] });
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
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-total'] });
      queryClient.invalidateQueries({ queryKey: ['all-counts'] });
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
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-total'] });
      queryClient.invalidateQueries({ queryKey: ['all-counts'] });
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
    queryClient.invalidateQueries({ queryKey: ['notifications-unread-total'] });
    queryClient.invalidateQueries({ queryKey: ['all-counts'] });
  };

  // Bulk mark as read / unread
  const markManyMutation = useMutation({
    mutationFn: async ({ ids, isRead }: { ids: string[]; isRead: boolean }) => {
      if (!ids.length) return;
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: isRead })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  // Bulk delete
  const deleteManyMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!ids.length) return;
      const { error } = await supabase.from('notifications').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  return {
    notifications: filteredNotifications,
    groupedNotifications,
    unreadCounts,
    totalUnread,
    isLoading,
    error,
    refetch,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
    markMany: markManyMutation.mutate,
    deleteMany: deleteManyMutation.mutate,
    isBulkPending: markManyMutation.isPending || deleteManyMutation.isPending,
    isMarkingRead: markAsReadMutation.isPending,
    isMarkingAllRead: markAllAsReadMutation.isPending,
    isDeleting: deleteNotificationMutation.isPending,
  };
};

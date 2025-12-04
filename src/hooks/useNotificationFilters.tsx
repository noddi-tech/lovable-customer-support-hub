import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Notification categories for tab-based filtering
export type NotificationCategory = 
  | 'unread' 
  | 'calls' 
  | 'text' 
  | 'email' 
  | 'tickets' 
  | 'assigned';

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

// Determine notification category based on type and data
const getCategory = (notification: any, userId: string): NotificationCategory => {
  const type = notification.type?.toLowerCase() || '';
  const data = notification.data || {};

  // Check for calls (incoming, missed, voicemail, callback)
  if (data.call_id || type.includes('call') || type.includes('voicemail') || type.includes('callback')) {
    return 'calls';
  }

  // Check for text/SMS
  if (data.sms_id || type.includes('sms') || type.includes('text_message')) {
    return 'text';
  }

  // Check for tickets (service tickets)
  if (data.ticket_id || type.includes('ticket') || type.includes('sla_breach') || type.includes('sla_warning')) {
    return 'tickets';
  }

  // Check for assignments (assigned to current user)
  if (type === 'assignment' || type.includes('assigned') || 
      (data.assigned_to_id && data.assigned_to_id === userId)) {
    return 'assigned';
  }

  // Check for email/conversations (customer replies, new emails, mentions)
  if (data.conversation_id || type.includes('conversation') || type.includes('email') || 
      type.includes('reply') || type.includes('mention') || type === 'new_conversation' ||
      type === 'customer_reply' || type === 'new_email') {
    return 'email';
  }

  return 'email'; // Default to email category
};

export const useNotificationFilters = (selectedCategory: NotificationCategory = 'unread') => {
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
      text: 0,
      email: 0,
      tickets: 0,
      assigned: 0,
    };

    enhancedNotifications.filter(n => !n.is_read).forEach(n => {
      counts.unread++;
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

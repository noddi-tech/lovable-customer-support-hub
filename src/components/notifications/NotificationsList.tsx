import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCheck, Eye, MessageSquare, EyeOff, ExternalLink, Trash2 } from 'lucide-react';
import { useDateFormatting } from '@/hooks/useDateFormatting';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTranslation } from 'react-i18next';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  is_read: boolean;
  data: any;
  created_at: string;
}

interface NotificationsListProps {
  context?: 'text' | 'voice' | 'all';
}

export function NotificationsList({ context = 'all' }: NotificationsListProps = {}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { relative } = useDateFormatting();
  const { t } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null);

  // Fetch notifications with real-time updates
  const { data: notifications = [], isLoading, error } = useQuery({
    queryKey: ['notifications', context],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const allNotifications = data as Notification[];
      
      // Filter notifications based on context
      if (context === 'text') {
        // Exclude voice/call-related notifications
        return allNotifications.filter(notification => {
          const hasCallId = notification.data?.call_id;
          const isVoiceTitle = notification.title?.includes('📞') || 
                              notification.title?.includes('🎙️') ||
                              notification.title?.toLowerCase().includes('call') ||
                              notification.title?.toLowerCase().includes('voicemail');
          return !hasCallId && !isVoiceTitle;
        });
      } else if (context === 'voice') {
        // Only include voice/call-related notifications  
        return allNotifications.filter(notification => {
          const hasCallId = notification.data?.call_id;
          const isVoiceTitle = notification.title?.includes('📞') || 
                              notification.title?.includes('🎙️') ||
                              notification.title?.toLowerCase().includes('call') ||
                              notification.title?.toLowerCase().includes('voicemail');
          return hasCallId || isVoiceTitle;
        });
      }
      
      // Return all notifications for 'all' context
      return allNotifications;
    },
    enabled: true, // Always enabled since auth is handled by ProtectedRoute
  });

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase.rpc('mark_notification_read', {
        notification_id: notificationId
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('mark_all_notifications_read');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
    },
  });

  // Mark notification as unread
  const markAsUnreadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: false, updated_at: new Date().toISOString() })
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
    },
  });

  // Delete notification
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      console.log('Starting delete mutation for:', notificationId);
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
      if (error) {
        console.error('Delete error:', error);
        throw error;
      }
      console.log('Delete successful');
    },
    onSuccess: (_, notificationId) => {
      console.log('Delete mutation onSuccess triggered');
      // Optimistic update - immediately remove from cache
      queryClient.setQueryData(['notifications'], (old: Notification[] | undefined) => {
        if (!old) return old;
        const filtered = old.filter(n => n.id !== notificationId);
        console.log('Optimistic update: removed notification', notificationId, 'new length:', filtered.length);
        return filtered;
      });
      
      // Also invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
      
      toast({
        title: t('dashboard.notifications.success'),
        description: t('dashboard.notifications.notificationDeleted'),
      });
    },
    onError: () => {
      toast({
        title: t('dashboard.notifications.error'),
        description: t('dashboard.notifications.failedToDeleteNotification'),
        variant: "destructive",
      });
    },
  });

  const handleNotificationClick = (notification: Notification, event: React.MouseEvent) => {
    // Don't navigate if clicking on action buttons
    if ((event.target as HTMLElement).closest('button')) {
      return;
    }
    
    // Navigate to conversation if it's an assignment notification
    if (notification.data?.conversation_id) {
      const conversationId = notification.data.conversation_id;
      const messageId = notification.data.message_id;
      
      // Navigate to the specific conversation with message ID if available
      const url = messageId 
        ? `/?conversation=${conversationId}&message=${messageId}`
        : `/?conversation=${conversationId}`;
      
      navigate(url);
    }
  };

  const handleMarkAsRead = (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    markAsReadMutation.mutate(notificationId);
  };

  const handleMarkAsUnread = (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    markAsUnreadMutation.mutate(notificationId);
  };

  const handleDeleteClick = (notificationId: string, event: React.MouseEvent) => {
    console.log('Delete button clicked for notification:', notificationId);
    event.stopPropagation();
    event.preventDefault();
    setNotificationToDelete(notificationId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (notificationToDelete) {
      deleteNotificationMutation.mutate(notificationToDelete);
      setNotificationToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return '⚠️';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return <MessageSquare className="h-5 w-5 text-primary" />;
    }
  };

  const getNotificationBadgeVariant = (type: string) => {
    switch (type) {
      case 'warning':
        return 'destructive';
      case 'success':
        return 'default';
      case 'error':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">{t('dashboard.notifications.loadingNotifications')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-destructive mb-2">Failed to load notifications</div>
          <div className="text-sm text-muted-foreground">Please check your authentication and try again</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">{t('dashboard.notifications.title')}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {unreadCount > 0 ? (unreadCount === 1 ? t('dashboard.notifications.unreadNotification', { count: unreadCount }) : t('dashboard.notifications.unreadNotifications', { count: unreadCount })) : t('dashboard.notifications.allCaughtUp')}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              {t('dashboard.notifications.markAllRead')}
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="pane flex-1">
        <div className="p-6 space-y-4">
          {notifications.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">{t('dashboard.notifications.noNotifications')}</h3>
                  <p>{t('dashboard.notifications.noNotificationsDescription')}</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`cursor-pointer transition-all duration-200 hover:bg-muted border-border ${
                  !notification.is_read ? 'bg-primary-muted border-primary/20' : 'bg-card'
                }`}
                onClick={(event) => handleNotificationClick(notification, event)}
                title="Click to view conversation"
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {typeof getNotificationIcon(notification.type) === 'string' ? (
                        <span className="text-xl">{getNotificationIcon(notification.type)}</span>
                      ) : (
                        getNotificationIcon(notification.type)
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className={`font-medium ${
                          !notification.is_read ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          {notification.title}
                        </h4>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getNotificationBadgeVariant(notification.type)}>
                            {notification.type}
                          </Badge>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-primary rounded-full" />
                          )}
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      
                      {notification.data?.note_preview && (
                        <div className="mt-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground italic">
                          "{notification.data.note_preview}"
                        </div>
                      )}
                      
                         <div className="flex items-center justify-between mt-3">
                          <p className="text-xs text-muted-foreground">
                            {relative(notification.created_at)}
                          </p>
                         
                         <div className="flex items-center space-x-1">
                           {/* Action buttons */}
                           {notification.data?.conversation_id && (
                             <Button
                               variant="ghost"
                               size="sm"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  const conversationId = notification.data.conversation_id;
                                  const messageId = notification.data.message_id;
                                  
                                  console.log('Navigating to conversation:', conversationId);
                                  console.log('Message ID:', messageId);
                                  
                                  // Always navigate to ensure we switch away from notifications view
                                  // Add a timestamp to force navigation even if same URL
                                  const url = messageId 
                                    ? `/?conversation=${conversationId}&message=${messageId}&t=${Date.now()}`
                                    : `/?conversation=${conversationId}&t=${Date.now()}`;
                                  
                                  navigate(url, { replace: true });
                                }}
                               className="h-7 px-2 text-xs"
                               title="View conversation"
                             >
                               <ExternalLink className="h-3 w-3 mr-1" />
                                {t('dashboard.notifications.view')}
                             </Button>
                           )}
                           
                           {notification.is_read ? (
                             <Button
                               variant="ghost"
                               size="sm"
                               onClick={(event) => handleMarkAsUnread(notification.id, event)}
                               className="h-7 px-2 text-xs"
                               title="Mark as unread"
                             >
                               <EyeOff className="h-3 w-3 mr-1" />
                                {t('dashboard.notifications.unread')}
                             </Button>
                           ) : (
                             <Button
                               variant="ghost"
                               size="sm"
                               onClick={(event) => handleMarkAsRead(notification.id, event)}
                               className="h-7 px-2 text-xs"
                               title="Mark as read"
                             >
                               <Eye className="h-3 w-3 mr-1" />
                                {t('dashboard.notifications.read')}
                             </Button>
                           )}

                            <button
                              type="button"
                              onClick={(event) => {
                                console.log('Delete button onclick triggered');
                                console.log('Event target:', event.target);
                                console.log('Event currentTarget:', event.currentTarget);
                                event.stopPropagation();
                                event.preventDefault();
                                handleDeleteClick(notification.id, event);
                              }}
                              className="h-7 px-2 text-xs text-destructive hover:text-destructive-foreground hover:bg-destructive/10 rounded border-0 bg-transparent transition-colors"
                              title="Delete notification"
                              style={{ minWidth: 'auto' }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                         </div>
                       </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dashboard.notifications.deleteNotification')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dashboard.notifications.deleteNotificationConfirmation')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
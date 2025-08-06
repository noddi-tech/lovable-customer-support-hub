import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { CheckCheck, Eye, MessageSquare, EyeOff, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  is_read: boolean;
  data: any;
  created_at: string;
}

export function NotificationsList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Notification[];
    },
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
        <div className="text-muted-foreground">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Notifications</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4">
          {notifications.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No notifications yet</h3>
                  <p>You'll see notifications here when internal notes are assigned to you.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${
                  !notification.is_read ? 'bg-primary/5 border-primary/20' : ''
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
                           {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                         </p>
                         
                         <div className="flex items-center space-x-2">
                           {/* Action buttons */}
                           {notification.data?.conversation_id && (
                             <Button
                               variant="ghost"
                               size="sm"
                               onClick={(event) => {
                                 event.stopPropagation();
                                 const conversationId = notification.data.conversation_id;
                                 const messageId = notification.data.message_id;
                                 const url = messageId 
                                   ? `/?conversation=${conversationId}&message=${messageId}`
                                   : `/?conversation=${conversationId}`;
                                 navigate(url);
                               }}
                               className="h-7 px-2 text-xs"
                               title="View conversation"
                             >
                               <ExternalLink className="h-3 w-3 mr-1" />
                               View
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
                               Unread
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
                               Read
                             </Button>
                           )}
                         </div>
                       </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
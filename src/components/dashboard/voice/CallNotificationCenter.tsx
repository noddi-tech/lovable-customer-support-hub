import React, { useState } from 'react';
import { Bell, Phone, PhoneCall, PhoneOff, Voicemail, X, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface CallNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  data: {
    call_id?: string;
    event_type?: string;
    customer_phone?: string;
    monitored_line?: string;
    line_type?: string;
  };
  is_read: boolean;
  created_at: string;
}

interface CallNotificationCenterProps {
  onNavigateToCall?: (callId: string) => void;
}

export const CallNotificationCenter: React.FC<CallNotificationCenterProps> = ({ 
  onNavigateToCall 
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch call-related notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['call-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .contains('data', { call_id: '' }) // Filter for call-related notifications
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as CallNotification[];
    },
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-notifications'] });
    }
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.user.id)
        .eq('is_read', false)
        .not('data->call_id', 'is', null);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-notifications'] });
      toast({
        title: "Notifications cleared",
        description: "All call notifications marked as read",
      });
    }
  });

  const getNotificationIcon = (eventType?: string) => {
    switch (eventType) {
      case 'call_started':
        return <PhoneCall className="h-4 w-4 text-green-600" />;
      case 'call_missed':
        return <PhoneOff className="h-4 w-4 text-red-600" />;
      case 'voicemail_left':
        return <Voicemail className="h-4 w-4 text-blue-600" />;
      case 'callback_requested':
        return <Phone className="h-4 w-4 text-orange-600" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getEventTypeLabel = (eventType?: string) => {
    switch (eventType) {
      case 'call_started':
        return 'Call Started';
      case 'call_missed':
        return 'Missed Call';
      case 'voicemail_left':
        return 'Voicemail';
      case 'callback_requested':
        return 'Callback';
      default:
        return 'Call Event';
    }
  };

  const handleNotificationClick = (notification: CallNotification) => {
    // Mark as read
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }

    // Navigate to call if callback provided
    if (notification.data.call_id && onNavigateToCall) {
      onNavigateToCall(notification.data.call_id);
    }
  };

  const handleQuickAction = (notification: CallNotification, action: string) => {
    switch (action) {
      case 'callback':
        toast({
          title: "Callback Scheduled",
          description: `Callback scheduled for ${notification.data.customer_phone}`,
        });
        break;
      case 'voicemail':
        toast({
          title: "Opening Voicemail",
          description: "Loading voicemail player...",
        });
        break;
      default:
        break;
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notification Panel */}
      {isOpen && (
        <Card className="absolute right-0 top-full mt-2 w-96 max-h-96 z-50 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Call Notifications</CardTitle>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAllAsReadMutation.mutate()}
                    className="text-xs"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <ScrollArea className="max-h-80">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No call notifications
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 border-b border-border hover:bg-muted/50 cursor-pointer transition-colors ${
                        !notification.is_read ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.data.event_type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium truncate">
                              {notification.title}
                            </p>
                            {notification.data.event_type && (
                              <Badge variant="outline" className="text-xs">
                                {getEventTypeLabel(notification.data.event_type)}
                              </Badge>
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                            {notification.message}
                          </p>

                          {/* Call Details */}
                          {notification.data.customer_phone && (
                            <div className="text-xs text-muted-foreground mb-2">
                              📞 {notification.data.customer_phone}
                              {notification.data.monitored_line && (
                                <span className="ml-2">
                                  → {notification.data.monitored_line}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Time and Actions */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </span>

                            {/* Quick Actions */}
                            <div className="flex gap-1">
                              {notification.data.event_type === 'callback_requested' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickAction(notification, 'callback');
                                  }}
                                >
                                  Schedule
                                </Button>
                              )}
                              {notification.data.event_type === 'voicemail_left' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickAction(notification, 'voicemail');
                                  }}
                                >
                                  Listen
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
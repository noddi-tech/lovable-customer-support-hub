import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { UnifiedAppLayout } from '@/components/layout/UnifiedAppLayout';
import { NotificationTabs } from '@/components/notifications/NotificationTabs';
import { NotificationListItem } from '@/components/notifications/NotificationListItem';
import { useNotificationFilters, NotificationCategory, EnhancedNotification } from '@/hooks/useNotificationFilters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, CheckCheck, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const VALID_TABS: NotificationCategory[] = ['unread', 'mentions', 'calls', 'text', 'email', 'tickets', 'assigned'];

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { tab } = useParams<{ tab: string }>();
  const [searchQuery, setSearchQuery] = React.useState('');

  // Validate tab from URL, default to 'unread'
  const selectedCategory: NotificationCategory = 
    tab && VALID_TABS.includes(tab as NotificationCategory) 
      ? (tab as NotificationCategory) 
      : 'unread';

  // Handle tab change via URL navigation
  const handleTabChange = (category: NotificationCategory) => {
    navigate(`/notifications/${category}`, { replace: false });
  };

  const {
    notifications,
    groupedNotifications,
    unreadCounts,
    isLoading,
    refetch,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    isMarkingAllRead,
  } = useNotificationFilters(selectedCategory);

  // Filter by search query
  const filteredNotifications = searchQuery
    ? notifications.filter(n => 
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.message.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : notifications;

  // Navigate to source (conversation/ticket/call)
  const handleNavigate = (notification: EnhancedNotification) => {
    const data = notification.data || {};
    
    // Mark as read when navigating
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    if (data.conversation_id) {
      navigate(`/interactions/text/open?c=${data.conversation_id}`);
    } else if (data.ticket_id) {
      navigate(`/operations/tickets?ticket=${data.ticket_id}`);
    } else if (data.call_id) {
      navigate(`/interactions/voice?call=${data.call_id}`);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
    toast.success('All notifications marked as read');
  };

  const handleDelete = (id: string) => {
    deleteNotification(id);
    toast.success('Notification deleted');
  };

  const renderNotificationGroup = (title: string, items: EnhancedNotification[]) => {
    if (items.length === 0) return null;
    
    return (
      <div key={title}>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-2 bg-muted/30 sticky top-0 z-10">
          {title}
        </h3>
        {items.map(notification => (
          <NotificationListItem
            key={notification.id}
            notification={notification}
            onMarkAsRead={markAsRead}
            onDelete={handleDelete}
            onNavigate={handleNavigate}
          />
        ))}
      </div>
    );
  };

  return (
    <UnifiedAppLayout>
      <div className="flex flex-col h-full">
        {/* Header with Tabs */}
        <div className="border-b border-border px-6 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-xl font-semibold">Notifications</h1>
              {unreadCounts.unread > 0 && (
                <span className="text-sm text-muted-foreground">
                  {unreadCounts.unread} unread
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="h-8"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              {unreadCounts.unread > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  disabled={isMarkingAllRead}
                  className="h-8"
                >
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Mark all as read
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <NotificationTabs
            selectedCategory={selectedCategory}
            onSelectCategory={handleTabChange}
            unreadCounts={unreadCounts}
          />

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start gap-4 p-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-1">
                No notifications
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery 
                  ? 'No notifications match your search'
                  : selectedCategory === 'unread' 
                    ? "You're all caught up!"
                    : `No ${selectedCategory} notifications`
                }
              </p>
            </div>
          ) : searchQuery ? (
            // Show flat list when searching
            <div>
              {filteredNotifications.map(notification => (
                <NotificationListItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onDelete={handleDelete}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
          ) : (
            // Show grouped list
            <div>
              {renderNotificationGroup('Today', groupedNotifications.today)}
              {renderNotificationGroup('Yesterday', groupedNotifications.yesterday)}
              {renderNotificationGroup('This Week', groupedNotifications.thisWeek)}
              {renderNotificationGroup('Earlier', groupedNotifications.earlier)}
            </div>
          )}
        </div>
      </div>
    </UnifiedAppLayout>
  );
};

export default NotificationsPage;

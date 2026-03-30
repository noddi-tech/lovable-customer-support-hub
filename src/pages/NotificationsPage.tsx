import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { UnifiedAppLayout } from '@/components/layout/UnifiedAppLayout';
import { NotificationTabs } from '@/components/notifications/NotificationTabs';
import { DataTable } from '@/components/admin/DataTable';
import { getNotificationColumns } from '@/components/notifications/NotificationColumns';
import { useNotificationFilters, NotificationCategory, EnhancedNotification } from '@/hooks/useNotificationFilters';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, CheckCheck, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const VALID_TABS: NotificationCategory[] = ['unread', 'mentions', 'calls', 'text', 'email', 'tickets', 'assigned'];

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { tab } = useParams<{ tab: string }>();

  const selectedCategory: NotificationCategory =
    tab && VALID_TABS.includes(tab as NotificationCategory)
      ? (tab as NotificationCategory)
      : 'unread';

  const handleTabChange = (category: NotificationCategory) => {
    navigate(`/notifications/${category}`, { replace: false });
  };

  const {
    notifications,
    unreadCounts,
    isLoading,
    refetch,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    isMarkingAllRead,
  } = useNotificationFilters(selectedCategory);

  const handleNavigate = (notification: EnhancedNotification) => {
    const data = notification.data || {};
    if (!notification.is_read) markAsRead(notification.id);

    if (data.conversation_id) {
      const messagePath = data.message_id ? `/m/${data.message_id}` : '';
      navigate(`/c/${data.conversation_id}${messagePath}`);
    } else if (data.ticket_id) {
      navigate(`/operations/tickets?ticket=${data.ticket_id}`);
    } else if (data.call_id) {
      navigate(`/interactions/voice?call=${data.call_id}`);
    }
  };

  const handleDelete = (id: string) => {
    deleteNotification(id);
    toast.success('Notification deleted');
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
    toast.success('All notifications marked as read');
  };

  const columns = React.useMemo(
    () => getNotificationColumns({ onMarkAsRead: markAsRead, onDelete: handleDelete, onNavigate: handleNavigate }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedCategory],
  );

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
              <Button variant="outline" size="sm" onClick={() => refetch()} className="h-8">
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

          <NotificationTabs
            selectedCategory={selectedCategory}
            onSelectCategory={handleTabChange}
            unreadCounts={unreadCounts}
          />
        </div>

        {/* DataTable */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="space-y-4">
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
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-1">No notifications</h3>
              <p className="text-sm text-muted-foreground">
                {selectedCategory === 'unread'
                  ? "You're all caught up!"
                  : `No ${selectedCategory} notifications`}
              </p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={notifications}
              searchPlaceholder="Search notifications..."
              globalFilter
            />
          )}
        </div>
      </div>
    </UnifiedAppLayout>
  );
};

export default NotificationsPage;

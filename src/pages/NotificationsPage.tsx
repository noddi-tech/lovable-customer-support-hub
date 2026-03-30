import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { UnifiedAppLayout } from '@/components/layout/UnifiedAppLayout';
import { NotificationTabs } from '@/components/notifications/NotificationTabs';
import { TableHeaderCell } from '@/components/dashboard/conversation-list/TableHeaderCell';
import { Table, TableBody, TableHeader, TableRow, TableCell, TableHead } from '@/components/ui/table';
import { useNotificationFilters, NotificationCategory, EnhancedNotification } from '@/hooks/useNotificationFilters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bell, CheckCheck, RefreshCw, Search, Phone, MessageSquare, Mail,
  Ticket, UserCheck, AtSign, Check, Eye, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const VALID_TABS: NotificationCategory[] = ['unread', 'mentions', 'calls', 'text', 'email', 'tickets', 'assigned'];

const categoryIcons: Record<string, React.ElementType> = {
  calls: Phone,
  text: MessageSquare,
  email: Mail,
  tickets: Ticket,
  assigned: UserCheck,
  mentions: AtSign,
};

const priorityStyles: Record<string, string> = {
  urgent: 'border-l-4 border-l-destructive',
  high: 'border-l-4 border-l-yellow-500',
  normal: '',
  low: '',
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { tab } = useParams<{ tab: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({
    key: 'created_at',
    direction: 'desc',
  });

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

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      if (prev.direction === 'desc') return { key, direction: null };
      return { key, direction: 'asc' };
    });
  };

  const sortedAndFiltered = useMemo(() => {
    let result = notifications;

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        n => n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortConfig.direction) {
      const dir = sortConfig.direction === 'asc' ? 1 : -1;
      result = [...result].sort((a, b) => {
        const key = sortConfig.key;
        if (key === 'created_at') {
          return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        }
        if (key === 'title') {
          return dir * a.title.localeCompare(b.title);
        }
        if (key === 'category') {
          return dir * a.category.localeCompare(b.category);
        }
        return 0;
      });
    }

    return result;
  }, [notifications, searchQuery, sortConfig]);

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

        {/* Search + Table */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-4 p-6">
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
          ) : notifications.length === 0 && !searchQuery ? (
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
            <>
              {/* Search */}
              <div className="px-6 pt-4 pb-2">
                <div className="relative max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search notifications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
              </div>

              <div className="px-6 pb-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]" />
                      <TableHeaderCell
                        label="Type"
                        sortKey="category"
                        currentSort={sortConfig}
                        onSort={handleSort}
                        className="w-[70px]"
                      />
                      <TableHeaderCell
                        label="Notification"
                        sortKey="title"
                        currentSort={sortConfig}
                        onSort={handleSort}
                      />
                      <TableHeaderCell
                        label="Time"
                        sortKey="created_at"
                        currentSort={sortConfig}
                        onSort={handleSort}
                        className="w-[140px]"
                      />
                      <TableHead className="w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedAndFiltered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No notifications match your search
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedAndFiltered.map((n) => {
                        const Icon = categoryIcons[n.category] || Bell;
                        return (
                          <TableRow
                            key={n.id}
                            className={cn(
                              'cursor-pointer',
                              !n.is_read && 'bg-muted/30'
                            )}
                            onClick={() => handleNavigate(n)}
                          >
                            {/* Status dot */}
                            <TableCell className="w-[40px]">
                              <div className="flex justify-center">
                                {!n.is_read && (
                                  <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                                )}
                              </div>
                            </TableCell>

                            {/* Type icon */}
                            <TableCell className="w-[70px]">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                            </TableCell>

                            {/* Notification content */}
                            <TableCell>
                              <div
                                className={cn(
                                  'py-1',
                                  priorityStyles[n.priority],
                                  n.priority !== 'normal' && n.priority !== 'low' && 'pl-3',
                                )}
                              >
                                <p className={cn('text-sm truncate', !n.is_read && 'font-semibold')}>
                                  {n.title}
                                </p>
                                <p className="text-xs text-muted-foreground line-clamp-1">{n.message}</p>
                                <div className="flex gap-1.5 mt-1">
                                  {n.priority === 'urgent' && (
                                    <Badge variant="destructive" className="text-[10px] h-4 px-1.5">Urgent</Badge>
                                  )}
                                  {n.priority === 'high' && (
                                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-yellow-500 text-yellow-600">High</Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>

                            {/* Time */}
                            <TableCell className="w-[140px]">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                              </span>
                            </TableCell>

                            {/* Actions */}
                            <TableCell className="w-[100px]">
                              <div className="flex items-center justify-end gap-1">
                                {!n.is_read && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    title="Mark as read"
                                    onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  title="View"
                                  onClick={(e) => { e.stopPropagation(); handleNavigate(n); }}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  title="Delete"
                                  onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </div>
    </UnifiedAppLayout>
  );
};

export default NotificationsPage;

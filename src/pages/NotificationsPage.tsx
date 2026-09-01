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
import { useIsMobile } from '@/hooks/use-responsive';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

const VALID_TABS: NotificationCategory[] = ['unread', 'mentions', 'assigned', 'calls'];

const categoryIcons: Record<string, React.ElementType> = {
  calls: Phone,
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
  const isMobile = useIsMobile();
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
    totalUnread,
    isLoading,
    refetch,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    markMany,
    deleteMany,
    isMarkingAllRead,
  } = useNotificationFilters(selectedCategory);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lastClickedId, setLastClickedId] = useState<string | null>(null);

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

  // ---- Multi-select (cmd/ctrl click = toggle, shift click = range) ----
  const handleRowClick = (n: EnhancedNotification, e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      setSelectedIds(prev =>
        prev.includes(n.id) ? prev.filter(id => id !== n.id) : [...prev, n.id]
      );
      setLastClickedId(n.id);
      return;
    }

    if (e.shiftKey) {
      e.preventDefault();
      const anchor = lastClickedId ?? n.id;
      const from = sortedAndFiltered.findIndex(x => x.id === anchor);
      const to = sortedAndFiltered.findIndex(x => x.id === n.id);
      if (from !== -1 && to !== -1) {
        const [start, end] = from <= to ? [from, to] : [to, from];
        const rangeIds = sortedAndFiltered.slice(start, end + 1).map(x => x.id);
        setSelectedIds(prev => Array.from(new Set([...prev, ...rangeIds])));
      }
      return;
    }

    if (selectedIds.length > 0) {
      setSelectedIds([]);
    }
    setLastClickedId(n.id);
    handleNavigate(n);
  };

  const handleContextMenuOpen = (n: EnhancedNotification) => {
    // Right-clicking a row outside the current selection selects just that row
    if (!selectedIds.includes(n.id)) {
      setSelectedIds([n.id]);
      setLastClickedId(n.id);
    }
  };

  const targetIds = (n: EnhancedNotification) =>
    selectedIds.includes(n.id) && selectedIds.length > 0 ? selectedIds : [n.id];

  const bulkMarkRead = (ids: string[], isRead: boolean) => {
    markMany({ ids, isRead });
    toast.success(
      `${ids.length} notification${ids.length === 1 ? '' : 's'} marked as ${isRead ? 'read' : 'unread'}`
    );
    setSelectedIds([]);
  };

  const bulkDelete = (ids: string[]) => {
    deleteMany(ids);
    toast.success(`${ids.length} notification${ids.length === 1 ? '' : 's'} deleted`);
    setSelectedIds([]);
  };


  return (
    <UnifiedAppLayout>
      <div className="flex flex-col h-full">
        {/* Header with Tabs */}
        <div className="border-b border-border px-3 py-3 sm:px-6 sm:py-4 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {isMobile ? (
                <SidebarTrigger className="shrink-0" />
              ) : (
                <Bell className="h-5 w-5 text-muted-foreground" />
              )}
              <h1 className="text-lg sm:text-xl font-semibold truncate">Notifications</h1>
              {unreadCounts.unread > 0 && (
                <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                  {unreadCounts.unread} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <Button
                variant="outline"
                size={isMobile ? 'icon' : 'sm'}
                onClick={() => refetch()}
                className={isMobile ? 'h-9 w-9' : 'h-8'}
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4 sm:mr-1" />
                {!isMobile && 'Refresh'}
              </Button>
              {unreadCounts.unread > 0 && (
                <Button
                  variant="outline"
                  size={isMobile ? 'icon' : 'sm'}
                  onClick={handleMarkAllAsRead}
                  disabled={isMarkingAllRead}
                  className={isMobile ? 'h-9 w-9' : 'h-8'}
                  title="Mark all as read"
                >
                  <CheckCheck className="h-4 w-4 sm:mr-1" />
                  {!isMobile && 'Mark all as read'}
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
              <div className="px-3 sm:px-6 pt-3 sm:pt-4 pb-2">
                <div className="relative w-full sm:max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    inputMode="search"
                    placeholder="Search notifications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10 text-base sm:h-9 sm:text-sm"
                  />
                </div>
                {totalUnread > sortedAndFiltered.length && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Showing the {sortedAndFiltered.length} most recent of {totalUnread} unread notifications.
                  </p>
                )}
                {!isMobile && selectedIds.length > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{selectedIds.length} selected</span>
                    <Button variant="outline" size="sm" className="h-7" onClick={() => bulkMarkRead(selectedIds, true)}>
                      Mark as read
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-destructive hover:text-destructive"
                      onClick={() => bulkDelete(selectedIds)}
                    >
                      Delete
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7" onClick={() => setSelectedIds([])}>
                      Clear
                    </Button>
                  </div>
                )}
              </div>

              {isMobile ? (
                <div className="pb-6">
                  {sortedAndFiltered.length === 0 ? (
                    <p className="text-center py-8 text-sm text-muted-foreground">
                      No notifications match your search
                    </p>
                  ) : (
                    sortedAndFiltered.map((n) => {
                      const Icon = categoryIcons[n.category] || Bell;
                      return (
                        <div
                          key={n.id}
                          onClick={() => handleNavigate(n)}
                          className={cn(
                            'flex items-start gap-3 px-3 py-3 border-b border-border active:bg-muted/60',
                            !n.is_read && 'bg-muted/30',
                            priorityStyles[n.priority],
                          )}
                        >
                          <div className="relative shrink-0 mt-0.5">
                            <Icon className="h-5 w-5 text-muted-foreground" />
                            {!n.is_read && (
                              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-sm', !n.is_read && 'font-semibold')}>{n.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                            {n.data?.customer_email && (
                              <p className="text-xs text-muted-foreground/80 truncate mt-0.5">{n.data.customer_email}</p>
                            )}
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[11px] text-muted-foreground">
                                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                              </span>
                              {n.priority === 'urgent' && (
                                <Badge variant="destructive" className="text-[10px] h-4 px-1.5">Urgent</Badge>
                              )}
                              {n.priority === 'high' && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-yellow-500 text-yellow-600">High</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-center gap-1 shrink-0">
                            {!n.is_read && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9"
                                aria-label="Mark as read"
                                onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-destructive hover:text-destructive"
                              aria-label="Delete notification"
                              onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
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
                        const isSelected = selectedIds.includes(n.id);
                        return (
                          <ContextMenu key={n.id}>
                          <ContextMenuTrigger asChild onContextMenu={() => handleContextMenuOpen(n)}>
                          <TableRow
                            className={cn(
                              'cursor-pointer select-none',
                              !n.is_read && 'bg-muted/30',
                              isSelected && 'bg-primary/10 hover:bg-primary/15'
                            )}
                            onClick={(e) => handleRowClick(n, e)}
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
                                {n.data?.customer_email && (
                                  <p className="text-xs text-muted-foreground/80 truncate">{n.data.customer_email}</p>
                                )}
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
                          </ContextMenuTrigger>
                          <ContextMenuContent className="w-56">
                            <ContextMenuItem onSelect={() => bulkMarkRead(targetIds(n), true)}>
                              <Check className="mr-2 h-4 w-4" />
                              Mark as read
                              {targetIds(n).length > 1 && ` (${targetIds(n).length})`}
                            </ContextMenuItem>
                            <ContextMenuItem onSelect={() => bulkMarkRead(targetIds(n), false)}>
                              <Bell className="mr-2 h-4 w-4" />
                              Mark as unread
                              {targetIds(n).length > 1 && ` (${targetIds(n).length})`}
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem onSelect={() => handleNavigate(n)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Open
                            </ContextMenuItem>
                            <ContextMenuItem
                              onSelect={() => setSelectedIds(sortedAndFiltered.map(x => x.id))}
                            >
                              <CheckCheck className="mr-2 h-4 w-4" />
                              Select all
                            </ContextMenuItem>
                            {selectedIds.length > 0 && (
                              <ContextMenuItem onSelect={() => setSelectedIds([])}>
                                Clear selection
                              </ContextMenuItem>
                            )}
                            <ContextMenuSeparator />
                            <ContextMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={() => bulkDelete(targetIds(n))}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                              {targetIds(n).length > 1 && ` (${targetIds(n).length})`}
                            </ContextMenuItem>
                          </ContextMenuContent>
                          </ContextMenu>
                         );
                       })
                    )}
                  </TableBody>
                </Table>
              </div>
              )}
            </>
          )}
        </div>
      </div>
    </UnifiedAppLayout>
  );
};

export default NotificationsPage;

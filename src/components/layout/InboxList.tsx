/**
 * InboxList - Primary sidebar component for inbox and status filter selection.
 * 
 * IMPORTANT: This is the MAIN inbox sidebar component used across the app.
 * - Used by: EnhancedInteractionsLayout.tsx (main interactions page)
 * - Used by: ServiceTicketsPage.tsx, NewsletterManagementPage.tsx
 * 
 * DO NOT confuse with these deprecated/unused components:
 * - InboxSidebar.tsx (legacy, different structure)
 * - OptimizedInteractionsSidebar.tsx (not used on main route)
 */
import React from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Inbox, Mail, Users, Archive, Star, Clock, CheckCircle, Trash2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAccessibleInboxes, useInboxCounts } from '@/hooks/useInteractionsData';
import { useInboxEmailAddresses } from '@/hooks/useInboxEmailAddresses';
import { useInboxOutstandingCounts } from '@/hooks/useInboxOutstandingCounts';
import { useDefaultInbox } from '@/hooks/useDefaultInbox';

import { LiveChatQueue } from '@/components/conversations/LiveChatQueue';
import type { StatusFilter, InboxId } from '@/types/interactions';

interface StatusFilterItem {
  id: StatusFilter;
  name: string;
  icon: React.ReactNode;
  color?: string;
}

interface InboxListProps {
  selectedInbox?: InboxId;
  selectedStatus?: StatusFilter;
  onInboxSelect?: (inboxId: InboxId) => void;
  onStatusSelect?: (status: StatusFilter) => void;
  className?: string;
}

const statusFilters: StatusFilterItem[] = [
  { id: 'open', name: 'Open', icon: <Inbox className="h-4 w-4" />, color: 'text-blue-600' },
  { id: 'pending', name: 'Pending', icon: <Clock className="h-4 w-4" />, color: 'text-orange-600' },
  { id: 'assigned', name: 'Assigned to Me', icon: <Star className="h-4 w-4" />, color: 'text-yellow-600' },
  { id: 'closed', name: 'Closed', icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-600' },
  { id: 'archived', name: 'Archived', icon: <Archive className="h-4 w-4" />, color: 'text-gray-500' },
  { id: 'deleted', name: 'Deleted', icon: <Trash2 className="h-4 w-4" />, color: 'text-destructive' },
  { id: 'all', name: 'All Messages', icon: <Mail className="h-4 w-4" /> },
];

export const InboxList: React.FC<InboxListProps> = ({
  selectedInbox,
  selectedStatus = 'open',
  onInboxSelect,
  onStatusSelect,
  className
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { data: inboxes = [], isLoading: inboxesLoading } = useAccessibleInboxes();
  const { data: inboxEmails = {} } = useInboxEmailAddresses();
  const { data: outstanding = {} } = useInboxOutstandingCounts();
  const { data: counts, isLoading: countsLoading } = useInboxCounts(selectedInbox || 'all');
  const { defaultInboxId } = useDefaultInbox();

  const [selectOpen, setSelectOpen] = React.useState(false);

  // The inbox selection supports several inboxes at once (comma separated in the URL)
  const selectedIds = React.useMemo(
    () =>
      !selectedInbox || selectedInbox === 'all'
        ? []
        : String(selectedInbox).split(',').filter(Boolean),
    [selectedInbox]
  );

  // Configured inboxes get keyboard shortcuts 1-9 (0 = All Inboxes)
  const numberedInboxes = React.useMemo(
    () => inboxes.filter((i) => inboxEmails[i.id]).slice(0, 9),
    [inboxes, inboxEmails]
  );

  const NumberKey: React.FC<{ n: number }> = ({ n }) => (
    <kbd className="flex h-4 w-4 items-center justify-center rounded border border-border bg-muted text-[10px] font-medium text-muted-foreground flex-shrink-0 mt-0.5">
      {n}
    </kbd>
  );

  const DefaultTag: React.FC = () => (
    <Badge variant="outline" className="h-4 px-1.5 text-[9px] border-primary/40 text-primary flex-shrink-0">
      Default
    </Badge>
  );

  const allOutstanding = React.useMemo(
    () =>
      Object.values(outstanding).reduce(
        (acc, o) => ({ open: acc.open + o.open, pending: acc.pending + o.pending }),
        { open: 0, pending: 0 },
      ),
    [outstanding],
  );

  const OutstandingBadges: React.FC<{ open: number; pending: number }> = ({ open, pending }) => {
    if (!open && !pending) return null;
    return (
      <span className="flex items-center gap-1 flex-shrink-0">
        {open > 0 && (
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-medium" title={`${open} open`}>
            {open}
          </Badge>
        )}
        {pending > 0 && (
          <Badge
            variant="outline"
            className="h-5 px-1.5 text-[10px] font-medium text-orange-600 border-orange-500/40"
            title={`${pending} pending`}
          >
            {pending}
          </Badge>
        )}
      </span>
    );
  };


  // Get the count for a specific filter
  const getFilterCount = (filter: StatusFilter): number => {
    if (!counts) return 0;
    switch (filter) {
      case 'all': return counts.total;
      case 'open': return counts.open;
      case 'assigned': return counts.assigned;
      case 'pending': return counts.pending;
      case 'closed': return counts.closed;
      case 'archived': return counts.archived;
      case 'deleted': return counts.deleted;
      default: return 0;
    }
  };

  // Handle status filter click with URL navigation
  const handleStatusClick = (status: StatusFilter) => {
    // Build new path: /interactions/text/[status]
    const pathParts = location.pathname.split('/');
    // Get base path (e.g., /interactions/text)
    const basePath = pathParts.slice(0, 3).join('/');
    const newPath = `${basePath}/${status}`;
    
    // Preserve query params (inbox, conversation, etc.)
    const queryString = searchParams.toString();
    const fullPath = queryString ? `${newPath}?${queryString}` : newPath;
    
    navigate(fullPath, { replace: false });
    
    // Also call the callback for any side effects
    onStatusSelect?.(status);
  };

  // Handle inbox selection with URL navigation
  const handleInboxChange = (inboxId: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (inboxId && inboxId !== 'all') {
      newParams.set('inbox', inboxId);
    } else {
      newParams.delete('inbox');
    }
    // No need to clear 'c' — conversation is in path, not params
    
    const queryString = newParams.toString();
    const newUrl = queryString ? `${location.pathname}?${queryString}` : location.pathname;
    
    navigate(newUrl, { replace: false });
    
    // Also call the callback
    onInboxSelect?.(inboxId);
  };

  // Add/remove an inbox from the combined multi-inbox view
  const toggleInbox = (inboxId: string) => {
    const next = selectedIds.includes(inboxId)
      ? selectedIds.filter((id) => id !== inboxId)
      : [...selectedIds, inboxId];
    handleInboxChange(next.length === 0 ? 'all' : next.join(','));
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Live Chat Queue - highest priority */}
      <LiveChatQueue compact className="px-2" />
      
      {/* Inbox Selector */}
      <div className="space-y-2 px-2">
        <h3 className="text-xs font-semibold text-foreground/70">Inboxes</h3>
        
        {inboxesLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Popover open={selectOpen} onOpenChange={setSelectOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex w-full min-w-0 items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-left focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <div className="flex items-start gap-2 min-w-0 overflow-hidden text-left w-full">
                  {selectedIds.length === 1 ? (
                    <>
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                        style={{ backgroundColor: inboxes.find(i => i.id === selectedIds[0])?.color || '#6B7280' }}
                      />
                      <div className="min-w-0 flex flex-col leading-tight flex-1">
                        <span className="truncate flex items-center gap-1.5">
                          {inboxes.find(i => i.id === selectedIds[0])?.name || 'Select inbox'}
                          {defaultInboxId === selectedIds[0] && <DefaultTag />}
                        </span>
                        {inboxEmails[selectedIds[0]] && (
                          <span className="text-[11px] text-muted-foreground truncate">
                            {inboxEmails[selectedIds[0]]}
                          </span>
                        )}
                      </div>
                      <OutstandingBadges
                        open={outstanding[selectedIds[0]]?.open || 0}
                        pending={outstanding[selectedIds[0]]?.pending || 0}
                      />
                    </>
                  ) : selectedIds.length > 1 ? (
                    <>
                      <div className="min-w-0 flex flex-col leading-tight flex-1">
                        <span className="truncate">{selectedIds.length} inboxes</span>
                        <span className="text-[11px] text-muted-foreground truncate">
                          {selectedIds
                            .map((id) => inboxes.find((i) => i.id === id)?.name)
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      </div>
                      <OutstandingBadges
                        open={selectedIds.reduce((s, id) => s + (outstanding[id]?.open || 0), 0)}
                        pending={selectedIds.reduce((s, id) => s + (outstanding[id]?.pending || 0), 0)}
                      />
                    </>
                  ) : (
                    <>
                      <span className="truncate flex-1">All Inboxes</span>
                      <OutstandingBadges open={allOutstanding.open} pending={allOutstanding.pending} />
                    </>
                  )}
                  <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0 mt-0.5" />
                </div>
              </button>
            </PopoverTrigger>

            <PopoverContent
              align="start"
              className="w-[var(--radix-popover-trigger-width)] min-w-[260px] p-1 bg-popover border-border"
              onKeyDown={(e) => {
                if (e.metaKey || e.ctrlKey) return;
                if (!/^[0-9]$/.test(e.key)) return;
                const n = Number(e.key);
                const target = n === 0 ? 'all' : numberedInboxes[n - 1]?.id;
                if (!target) return;
                e.preventDefault();
                e.stopPropagation();
                // Alt/Shift + number toggles the inbox into a multi-inbox view
                if ((e.altKey || e.shiftKey) && target !== 'all') {
                  toggleInbox(target);
                  return;
                }
                setSelectOpen(false);
                handleInboxChange(target);
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setSelectOpen(false);
                  handleInboxChange('all');
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent',
                  selectedIds.length === 0 && 'bg-accent/60'
                )}
              >
                <NumberKey n={0} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                <span>All Inboxes</span>
                <span className="ml-auto flex items-center">
                  <OutstandingBadges open={allOutstanding.open} pending={allOutstanding.pending} />
                </span>
              </button>

              {inboxGroups.map((group) => (
                <div key={group.label} className="pt-1">
                  <div className="flex items-center gap-2 px-2 pb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.label}
                    </span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  {group.inboxes.map((inbox) => {
                const email = inboxEmails[inbox.id];
                const shortcutIndex = numberedInboxes.findIndex((i) => i.id === inbox.id);


                if (!email) {
                  // Unconfigured inbox: not selectable, offers a shortcut to finish setup
                  return (
                    <div
                      key={inbox.id}
                      className="relative flex items-center justify-between gap-2 rounded-sm py-1.5 px-2 text-sm opacity-60"
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="w-4 flex-shrink-0" />
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5 bg-muted-foreground/40"
                        />
                        <div className="min-w-0 flex flex-col leading-tight">
                          <span className="truncate text-muted-foreground">{inbox.name}</span>
                          <span className="text-[11px] text-muted-foreground truncate">
                            Not configured
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[11px] flex-shrink-0"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          navigate('/admin/integrations');
                        }}
                      >
                        Configure
                      </Button>
                    </div>
                  );
                }

                const isChecked = selectedIds.includes(inbox.id);

                return (
                  <div
                    key={inbox.id}
                    className={cn(
                      'flex items-start gap-2 min-w-0 w-full rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer',
                      isChecked && 'bg-accent/60'
                    )}
                    onClick={(e) => {
                      // Alt/Meta/Shift click toggles into a combined multi-inbox view
                      if (e.altKey || e.metaKey || e.shiftKey) {
                        toggleInbox(inbox.id);
                        return;
                      }
                      setSelectOpen(false);
                      handleInboxChange(inbox.id);
                    }}
                  >
                    <Checkbox
                      checked={isChecked}
                      onClick={(e) => e.stopPropagation()}
                      onCheckedChange={() => toggleInbox(inbox.id)}
                      aria-label={`Include ${inbox.name} in view`}
                      className="mt-0.5 flex-shrink-0"
                    />
                    {shortcutIndex > -1 ? <NumberKey n={shortcutIndex + 1} /> : <span className="w-4 flex-shrink-0" />}
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                      style={{ backgroundColor: inbox.color || '#6B7280' }}
                    />
                    <div className="min-w-0 flex flex-col leading-tight flex-1">
                      <span className="truncate flex items-center gap-1.5">
                        {inbox.name}
                        {defaultInboxId === inbox.id && <DefaultTag />}
                      </span>
                      <span className="text-[11px] text-muted-foreground truncate">
                        {email}
                      </span>
                    </div>
                    <OutstandingBadges
                      open={outstanding[inbox.id]?.open || 0}
                      pending={outstanding[inbox.id]?.pending || 0}
                    />
                  </div>
                );
                  })}
                </div>
              ))}


              <p className="px-2 py-1.5 text-[11px] text-muted-foreground border-t border-border mt-1">
                Press 0–9 to switch · tick boxes (or Alt+click / Alt+number) to view several inboxes at once
              </p>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Status Filters */}
      <div className="space-y-2 px-2">
        <h3 className="text-xs font-semibold text-foreground/70">Filters</h3>
        
        <div className="space-y-1">
          {statusFilters.map((filter) => (
            <Button
              key={filter.id}
              variant={selectedStatus === filter.id ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-between h-auto px-3 py-2 text-left hover:bg-muted/50 focus-visible:ring-ring",
                selectedStatus === filter.id && "bg-muted text-foreground"
              )}
              onClick={() => handleStatusClick(filter.id)}
            >
              <div className="flex items-center gap-2">
                <span className={cn("flex-shrink-0", filter.color)}>
                  {filter.icon}
                </span>
                <span className="text-xs font-medium truncate">
                  {filter.name}
                </span>
              </div>
              
              {countsLoading ? (
                <Skeleton className="h-5 w-8" />
              ) : (
                <Badge 
                  variant={selectedStatus === filter.id ? "default" : "secondary"} 
                  className="ml-2 px-2 py-0 h-5 text-xs bg-muted-foreground/10 text-muted-foreground border-border"
                >
                  {getFilterCount(filter.id)}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

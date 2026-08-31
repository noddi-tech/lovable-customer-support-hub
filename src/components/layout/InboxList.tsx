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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Inbox, Mail, Users, Archive, Star, Clock, CheckCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAccessibleInboxes, useInboxCounts } from '@/hooks/useInteractionsData';
import { useInboxEmailAddresses } from '@/hooks/useInboxEmailAddresses';
import { useInboxOutstandingCounts } from '@/hooks/useInboxOutstandingCounts';

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
          <Select value={selectedInbox || ''} onValueChange={handleInboxChange}>
            <SelectTrigger className="w-full min-w-0 h-auto py-1.5 bg-background border-border focus:ring-ring">
              <div className="flex items-start gap-2 min-w-0 overflow-hidden text-left w-full">
                {selectedInbox && selectedInbox !== 'all' ? (
                  <>
                    <div 
                      className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                      style={{ backgroundColor: inboxes.find(i => i.id === selectedInbox)?.color || '#6B7280' }}
                    />
                    <div className="min-w-0 flex flex-col leading-tight flex-1">
                      <span className="truncate">
                        {inboxes.find(i => i.id === selectedInbox)?.name || 'Select inbox'}
                      </span>
                      {inboxEmails[selectedInbox] && (
                        <span className="text-[11px] text-muted-foreground truncate">
                          {inboxEmails[selectedInbox]}
                        </span>
                      )}
                    </div>
                    <OutstandingBadges
                      open={outstanding[selectedInbox]?.open || 0}
                      pending={outstanding[selectedInbox]?.pending || 0}
                    />
                  </>
                ) : (
                  <>
                    <span className="truncate flex-1">All Inboxes</span>
                    <OutstandingBadges open={allOutstanding.open} pending={allOutstanding.pending} />
                  </>
                )}
              </div>
            </SelectTrigger>

            <SelectContent className="bg-popover border-border">
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                  <span>All Inboxes</span>
                  <OutstandingBadges open={allOutstanding.open} pending={allOutstanding.pending} />
                </div>
              </SelectItem>

              {inboxes.map((inbox) => {
                const email = inboxEmails[inbox.id];

                if (!email) {
                  // Unconfigured inbox: not selectable, offers a shortcut to finish setup
                  return (
                    <div
                      key={inbox.id}
                      className="relative flex items-center justify-between gap-2 rounded-sm py-1.5 pl-8 pr-2 text-sm opacity-60"
                    >
                      <div className="flex items-start gap-2 min-w-0">
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

                return (
                  <SelectItem key={inbox.id} value={inbox.id}>
                    <div className="flex items-start gap-2 min-w-0">
                      <div 
                        className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                        style={{ backgroundColor: inbox.color || '#6B7280' }}
                      />
                      <div className="min-w-0 flex flex-col leading-tight">
                        <span className="truncate">{inbox.name}</span>
                        <span className="text-[11px] text-muted-foreground truncate">
                          {email}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}

            </SelectContent>
          </Select>
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

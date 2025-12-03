import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Inbox, Mail, Users, Archive, Star, Clock, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAccessibleInboxes, useInboxCounts } from '@/hooks/useInteractionsData';
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
  { id: 'all', name: 'All Messages', icon: <Mail className="h-4 w-4" /> },
];

export const InboxList: React.FC<InboxListProps> = ({
  selectedInbox,
  selectedStatus = 'all',
  onInboxSelect,
  onStatusSelect,
  className
}) => {
  const { data: inboxes = [], isLoading: inboxesLoading } = useAccessibleInboxes();
  const { data: counts, isLoading: countsLoading } = useInboxCounts(selectedInbox || 'all');

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
      default: return 0;
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Inbox Selector */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground/70 px-2">Workspace</h3>
        
        {inboxesLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select value={selectedInbox || ''} onValueChange={onInboxSelect}>
            <SelectTrigger className="w-full bg-background border-border focus:ring-ring">
              <SelectValue placeholder="Select inbox" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="all">All Inboxes</SelectItem>
              {inboxes.map((inbox) => (
                <SelectItem key={inbox.id} value={inbox.id}>
                  {inbox.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Status Filters */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground/70 px-2">Filters</h3>
        
        <div className="space-y-1">
          {statusFilters.map((filter) => (
            <Button
              key={filter.id}
              variant={selectedStatus === filter.id ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-between h-auto px-3 py-2 text-left hover:bg-muted/50 focus-visible:ring-ring",
                selectedStatus === filter.id && "bg-muted text-foreground"
              )}
              onClick={() => onStatusSelect?.(filter.id)}
            >
              <div className="flex items-center gap-2">
                <span className={cn("flex-shrink-0", filter.color)}>
                  {filter.icon}
                </span>
                <span className="text-sm font-medium truncate">
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
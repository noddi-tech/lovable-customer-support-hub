import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AccessibleStandardList } from "@/components/ui/accessible-standard-list";
import { Pane, PaneToolbar, PaneBody } from "@/components/layout";
import { usePaginatedQuery } from "@/hooks/usePaginatedQuery";
import { fetchConversationsPaginated, Conversation, ConversationFilters } from "@/services/conversationsService";
import { useDateFormatting } from '@/hooks/useDateFormatting';
import { useAriaAnnouncement } from "@/hooks/useAriaAnnouncement";
import { useTranslation } from "react-i18next";
import { 
  Search, 
  Filter, 
  Archive, 
  Trash2, 
  CheckCircle, 
  MessageSquare, 
  Mail, 
  Phone, 
  Star,
  Clock,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ListColumn, BulkAction } from "@/types/pagination";

interface NewConversationListProps {
  selectedConversation?: Conversation;
  onConversationSelect?: (conversation: Conversation) => void;
  inboxId?: string;
}

const getChannelIcon = (channel: string) => {
  switch (channel) {
    case 'email': return Mail;
    case 'chat': return MessageSquare;
    case 'phone': return Phone;
    default: return MessageSquare;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'destructive';
    case 'high': return 'orange';
    case 'normal': return 'default';
    case 'low': return 'secondary';
    default: return 'default';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'open': return 'success';
    case 'pending': return 'warning';
    case 'resolved': return 'default';
    case 'closed': return 'secondary';
    default: return 'default';
  }
};

export function NewConversationList({ 
  selectedConversation, 
  onConversationSelect,
  inboxId = 'all'
}: NewConversationListProps) {
  const { t } = useTranslation();
  const { dateTime } = useDateFormatting();
  const { announce } = useAriaAnnouncement();
  
  const [filters, setFilters] = useState<ConversationFilters>({
    inbox_id: inboxId,
    is_archived: false
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Update filters when inboxId changes
  useState(() => {
    setFilters(prev => ({ ...prev, inbox_id: inboxId }));
  });

  const {
    data: paginatedData,
    isLoading,
    error,
    currentPage,
    totalPages,
    pageSize,
    totalCount,
    startItem,
    endItem,
    hasNextPage,
    hasPreviousPage,
    setPage,
    setPageSize,
    setSort,
    pagination
  } = usePaginatedQuery({
    queryKey: ['conversations-paginated'],
    queryFn: (params) => fetchConversationsPaginated({
      ...params,
      filters: { ...filters, search: searchQuery }
    }),
    initialPageSize: 25
  });

  const columns: ListColumn<Conversation>[] = [
    {
      key: 'channel',
      label: '',
      width: '40px',
      render: (_, conversation) => {
        const ChannelIcon = getChannelIcon(conversation.channel);
        return <ChannelIcon className="h-4 w-4 text-muted-foreground" />;
      }
    },
    {
      key: 'subject',
      label: 'Conversation',
      sortable: true,
      render: (_, conversation) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {!conversation.is_read && (
              <div className="h-2 w-2 rounded-full bg-primary" />
            )}
            <span className={cn(
              "font-medium truncate",
              !conversation.is_read && "text-foreground",
              conversation.is_read && "text-muted-foreground"
            )}>
              {conversation.subject || 'No Subject'}
            </span>
            {conversation.snooze_until && (
              <Clock className="h-3 w-3 text-orange-500" />
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {conversation.customer?.full_name || conversation.customer?.email || 'Unknown Customer'}
          </div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      width: '100px',
      render: (_, conversation) => (
        <Badge variant={getStatusColor(conversation.status) as any} className="capitalize">
          {conversation.status}
        </Badge>
      )
    },
    {
      key: 'priority',
      label: 'Priority',
      sortable: true,
      width: '100px',
      render: (_, conversation) => (
        <Badge variant={getPriorityColor(conversation.priority) as any} className="capitalize">
          {conversation.priority}
        </Badge>
      )
    },
    {
      key: 'assigned_to',
      label: 'Assigned',
      width: '120px',
      render: (_, conversation) => (
        conversation.assigned_to ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={conversation.assigned_to.avatar_url} />
              <AvatarFallback className="text-xs">
                {conversation.assigned_to.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm truncate">{conversation.assigned_to.full_name}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Unassigned</span>
        )
      )
    },
    {
      key: 'updated_at',
      label: 'Updated',
      sortable: true,
      width: '120px',
      render: (_, conversation) => (
        <span className="text-sm text-muted-foreground">
          {dateTime(conversation.updated_at)}
        </span>
      )
    }
  ];

  const bulkActions: BulkAction<Conversation>[] = [
    {
      id: 'mark-read',
      label: 'Mark as Read',
      icon: CheckCircle,
      action: async (conversations) => {
        console.log('Mark as read:', conversations);
        announce(`Marked ${conversations.length} conversations as read`);
        // TODO: Implement bulk mark as read
      }
    },
    {
      id: 'archive',
      label: 'Archive',
      icon: Archive,
      action: async (conversations) => {
        console.log('Archive:', conversations);
        announce(`Archived ${conversations.length} conversations`);
        // TODO: Implement bulk archive
      }
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      destructive: true,
      action: async (conversations) => {
        console.log('Delete:', conversations);
        announce(`Deleted ${conversations.length} conversations`);
        // TODO: Implement bulk delete
      }
    }
  ];

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(1); // Reset to first page when searching
    if (query) {
      announce(`Searching for ${query}`);
    }
  };

  const handleFilterChange = (key: keyof ConversationFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value
    }));
    setPage(1); // Reset to first page when filtering
    announce(`Filtered by ${key}: ${value}`);
  };

  return (
    <Pane className="flex-1">
      <PaneToolbar 
        className="flex items-center justify-between gap-4 p-4 border-b"
        role="toolbar"
        aria-label="Conversation filters and actions"
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 w-64"
              aria-label="Search conversations"
              aria-describedby="search-description"
            />
            <div id="search-description" className="sr-only">
              Search through conversation subjects, customer names, and email addresses
            </div>
          </div>
          
          <Select 
            value={filters.status || 'all'} 
            onValueChange={(value) => handleFilterChange('status', value)}
          >
            <SelectTrigger className="w-32" aria-label="Filter by status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={filters.priority || 'all'} 
            onValueChange={(value) => handleFilterChange('priority', value)}
          >
            <SelectTrigger className="w-32" aria-label="Filter by priority">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
      </PaneToolbar>

      <PaneBody className="flex-1">
        <AccessibleStandardList
          data={paginatedData?.data || []}
          columns={columns}
          isLoading={isLoading}
          error={error}
          selectable
          bulkActions={bulkActions}
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalCount={totalCount}
          startItem={startItem}
          endItem={endItem}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          currentSort={pagination.sort}
          currentSortDirection={pagination.sortDirection}
          onSort={setSort}
          onRowClick={onConversationSelect}
          getRowClassName={(conversation) => cn(
            selectedConversation?.id === conversation.id && "bg-primary/10"
          )}
          emptyMessage="No conversations found"
          emptyDescription="No conversations match your current filters"
          ariaLabel="Conversations table"
          ariaDescription="List of customer conversations with status, priority, and assignment information"
        />
      </PaneBody>
    </Pane>
  );
}
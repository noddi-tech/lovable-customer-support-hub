import { Filter, CheckCheck, ChevronDown, Move, Settings, CheckSquare, X, Plus, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ConversationMigrator } from "../ConversationMigrator";
import { ThreadMerger } from "../ThreadMerger";
import { NewConversationDialog } from "../NewConversationDialog";
import { useConversationList } from "@/contexts/ConversationListContext";
import { useTranslation } from "react-i18next";
import type { SortBy } from "@/contexts/ConversationListContext";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-responsive";

interface ConversationListHeaderProps {
  onToggleCollapse?: () => void;
  selectedInboxId: string;
  onInboxChange?: (inboxId: string) => void;
  bulkSelectionMode?: boolean;
  onToggleBulkMode?: () => void;
}

export const ConversationListHeader = ({ 
  onToggleCollapse, 
  selectedInboxId, 
  onInboxChange,
  bulkSelectionMode = false,
  onToggleBulkMode
}: ConversationListHeaderProps) => {
  const { state, dispatch, filteredConversations, markAllAsRead, isMarkingAllAsRead, hasNextPage, isFetchingNextPage } = useConversationList();
  const { t } = useTranslation();
  const [showMigrator, setShowMigrator] = useState(false);
  const [showThreadMerger, setShowThreadMerger] = useState(false);

  const unreadCount = filteredConversations.filter(c => !c.is_read).length;

  const hasActiveFilters = state.searchQuery || state.statusFilter !== 'all' || state.priorityFilter !== 'all';
  
  const activeFilterCount = [
    state.statusFilter !== 'all',
    state.priorityFilter !== 'all',
    state.searchQuery.length > 0
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: '' });
    dispatch({ type: 'SET_STATUS_FILTER', payload: 'all' });
    dispatch({ type: 'SET_PRIORITY_FILTER', payload: 'all' });
  };

  const getFilterLabel = () => {
    const parts: string[] = [];
    if (state.statusFilter !== 'all') parts.push(state.statusFilter);
    if (state.priorityFilter !== 'all') parts.push(state.priorityFilter);
    if (parts.length === 0) return t('dashboard.conversationList.filters', 'Filters');
    return parts.join(', ');
  };

  const getSortLabel = (sortBy: SortBy) => {
    switch (sortBy) {
      case 'latest': return t('dashboard.conversationList.sortLatest', 'Latest');
      case 'oldest': return t('dashboard.conversationList.sortOldest', 'Oldest');
      case 'priority': return t('dashboard.conversationList.sortPriority', 'Priority');
      case 'unread': return t('dashboard.conversationList.sortUnread', 'Unread First');
      default: return t('dashboard.conversationList.sortLatest', 'Latest');
    }
  };

  return (
    <div className="flex-shrink-0 px-1.5 pt-1 pb-3 bg-card">
      <div className="flex items-center justify-between mb-0.5 px-0.5">
        <span className="text-[9px] text-muted-foreground uppercase tracking-wide font-medium">
          {t('dashboard.conversationList.quickActions', 'Quick actions')}
        </span>
        <span className="text-[9px] text-muted-foreground uppercase tracking-wide font-medium">
          {t('dashboard.conversationList.sortFiltering', 'Sort / Filtering')}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {/* Left side: Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Select */}
          {onToggleBulkMode && (
            <Button
              variant={bulkSelectionMode ? "default" : "outline"}
              size="xxs"
              onClick={() => onToggleBulkMode?.()}
            >
              <CheckSquare className="!w-2.5 !h-2.5" />
              {bulkSelectionMode 
                ? t('dashboard.conversationList.exitSelection', 'Exit') 
                : t('dashboard.conversationList.select', 'Select')}
            </Button>
          )}

          {/* New */}
          <NewConversationDialog>
            <Button variant="default" size="xxs">
              <Plus className="!w-2.5 !h-2.5" />
              {t('dashboard.conversationList.new', 'New')}
            </Button>
          </NewConversationDialog>

          {/* Merge */}
          <Dialog open={showThreadMerger} onOpenChange={setShowThreadMerger}>
            <DialogTrigger asChild>
              <Button variant="outline" size="xxs">
                <Settings className="!w-2.5 !h-2.5" />
                {t('dashboard.conversationList.merge', 'Merge')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{t('dashboard.threadMerger', 'Thread Merger')}</DialogTitle>
              </DialogHeader>
              <ThreadMerger 
                inboxId={selectedInboxId !== 'all' ? selectedInboxId : undefined}
                onMergeComplete={() => setShowThreadMerger(false)}
              />
            </DialogContent>
          </Dialog>

          {/* Migrate */}
          <Dialog open={showMigrator} onOpenChange={setShowMigrator}>
            <DialogTrigger asChild>
              <Button variant="outline" size="xxs">
                <Move className="!w-2.5 !h-2.5" />
                {t('dashboard.conversationList.migrate', 'Migrate')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t('dashboard.migrateConversations', 'Migrate Conversations')}</DialogTitle>
              </DialogHeader>
              <ConversationMigrator 
                sourceInboxId={selectedInboxId !== 'all' ? selectedInboxId : undefined}
                onMigrationComplete={() => setShowMigrator(false)}
              />
            </DialogContent>
          </Dialog>

          {/* Mark All Read */}
          <Button
            variant="outline"
            size="xxs"
            onClick={markAllAsRead}
            disabled={isMarkingAllAsRead || unreadCount === 0}
          >
            <CheckCheck className="!w-2.5 !h-2.5" />
            {t('dashboard.conversationList.markAllRead', 'Read')}
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-3.5 px-1 text-[9px] ml-0.5">
                {unreadCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Right side: Filters + Sort */}
        <div className="flex items-center gap-1 ml-auto flex-shrink-0">
          {/* Filters as DropdownMenu styled like Select */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-7 items-center justify-between gap-1.5 rounded-md border border-input bg-background px-3 text-[10px] ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap">
                <Filter className="!w-2.5 !h-2.5 shrink-0" />
                <span className="truncate max-w-[70px] text-[10px]">{getFilterLabel()}</span>
                {activeFilterCount > 0 && (
                  <Badge className="h-3.5 w-3.5 p-0 flex items-center justify-center text-[8px] bg-primary text-primary-foreground rounded-full">
                    {activeFilterCount}
                  </Badge>
                )}
                <ChevronDown className="!h-2.5 !w-2.5 opacity-50 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>{t('dashboard.conversationList.statusFilter', 'Status')}</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={state.statusFilter}
                onValueChange={(value) => dispatch({ type: 'SET_STATUS_FILTER', payload: value })}
              >
                <DropdownMenuRadioItem value="all">{t('dashboard.conversationList.allStatus', 'All Status')}</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="open">{t('dashboard.conversationList.open', 'Open')}</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="pending">{t('dashboard.conversationList.pending', 'Pending')}</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="closed">{t('dashboard.conversationList.closed', 'Closed')}</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{t('dashboard.conversationList.priorityFilter', 'Priority')}</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={state.priorityFilter}
                onValueChange={(value) => dispatch({ type: 'SET_PRIORITY_FILTER', payload: value })}
              >
                <DropdownMenuRadioItem value="all">{t('dashboard.conversationList.allPriority', 'All Priority')}</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="low">{t('dashboard.conversationList.low', 'Low')}</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="normal">{t('dashboard.conversationList.normal', 'Normal')}</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="high">{t('dashboard.conversationList.high', 'High')}</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="urgent">{t('dashboard.conversationList.urgent', 'Urgent')}</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              {hasActiveFilters && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={clearAllFilters} className="justify-center text-xs">
                    <X className="!w-3 !h-3 mr-1" />
                    {t('dashboard.conversationList.clearFilters', 'Clear Filters')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort Select */}
          <Select 
            value={state.sortBy} 
            onValueChange={(value: SortBy) => dispatch({ type: 'SET_SORT_BY', payload: value })}
          >
            <SelectTrigger className="w-auto h-7 text-[10px] gap-1.5 px-3">
              <SelectValue>{getSortLabel(state.sortBy)}</SelectValue>
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="latest">{t('dashboard.conversationList.sortLatest', 'Latest')}</SelectItem>
              <SelectItem value="oldest">{t('dashboard.conversationList.sortOldest', 'Oldest')}</SelectItem>
              <SelectItem value="priority">{t('dashboard.conversationList.sortPriority', 'Priority')}</SelectItem>
              <SelectItem value="unread">{t('dashboard.conversationList.sortUnread', 'Unread First')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active Filter Badges */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {t('dashboard.conversationList.activeFilters', 'Active filters:')}
          </span>
          {state.searchQuery && (
            <Badge variant="secondary" className="h-5 px-2 text-xs gap-1">
              Search: "{state.searchQuery.substring(0, 20)}{state.searchQuery.length > 20 ? '...' : ''}"
              <button onClick={() => dispatch({ type: 'SET_SEARCH_QUERY', payload: '' })} className="ml-1 hover:text-foreground">
                <X className="!w-2.5 !h-2.5" />
              </button>
            </Badge>
          )}
          {state.statusFilter !== 'all' && (
            <Badge variant="secondary" className="h-5 px-2 text-xs gap-1">
              Status: {state.statusFilter}
              <button onClick={() => dispatch({ type: 'SET_STATUS_FILTER', payload: 'all' })} className="ml-1 hover:text-foreground">
                <X className="!w-2.5 !h-2.5" />
              </button>
            </Badge>
          )}
          {state.priorityFilter !== 'all' && (
            <Badge variant="secondary" className="h-5 px-2 text-xs gap-1">
              Priority: {state.priorityFilter}
              <button onClick={() => dispatch({ type: 'SET_PRIORITY_FILTER', payload: 'all' })} className="ml-1 hover:text-foreground">
                <X className="!w-2.5 !h-2.5" />
              </button>
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-5 px-2 text-xs">
            {t('dashboard.conversationList.clearAll', 'Clear all')}
          </Button>
        </div>
      )}
    </div>
  );
};

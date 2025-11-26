import { Search, Filter, Inbox, CheckCheck, ChevronDown, Move, Settings, CheckSquare, X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ConversationListFilters } from "./ConversationListFilters";
import { InboxSwitcher } from "../InboxSwitcher";
import { ConversationMigrator } from "../ConversationMigrator";
import { ThreadMerger } from "../ThreadMerger";
import { NewConversationDialog } from "../NewConversationDialog";
import { useConversationList } from "@/contexts/ConversationListContext";
import { useTranslation } from "react-i18next";
import type { SortBy } from "@/contexts/ConversationListContext";
import { useState } from "react";
import { toast } from "sonner";

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
  const { state, dispatch, filteredConversations, markAllAsRead, isMarkingAllAsRead, loadAllConversations, hasNextPage, isFetchingNextPage } = useConversationList();
  const { t } = useTranslation();
  const [showMigrator, setShowMigrator] = useState(false);
  const [showThreadMerger, setShowThreadMerger] = useState(false);
  const [isLoadingAll, setIsLoadingAll] = useState(false);

  const totalCount = filteredConversations.length;
  const unreadCount = filteredConversations.filter(c => !c.is_read).length;

  // Check if any filters are active
  const hasActiveFilters = state.searchQuery || state.statusFilter !== 'all' || state.priorityFilter !== 'all';
  
  // Count active filters
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

  const getSortLabel = (sortBy: SortBy) => {
    switch (sortBy) {
      case 'latest':
        return t('dashboard.conversationList.sortLatest', 'Latest');
      case 'oldest':
        return t('dashboard.conversationList.sortOldest', 'Oldest');
      case 'priority':
        return t('dashboard.conversationList.sortPriority', 'Priority');
      case 'unread':
        return t('dashboard.conversationList.sortUnread', 'Unread First');
      default:
        return t('dashboard.conversationList.sortLatest', 'Latest');
    }
  };

  const handleToggleBulkMode = async () => {
    if (!bulkSelectionMode && hasNextPage) {
      setIsLoadingAll(true);
      toast.info('Loading all conversations...');
      
      try {
        await loadAllConversations();
      } catch (error) {
        console.error('Failed to load all conversations:', error);
        toast.error('Failed to load all conversations');
      }
      
      // Increase stabilization delay to 500ms for full stabilization
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsLoadingAll(false);
    }
    onToggleBulkMode?.();
  };

  return (
    <div className="flex-shrink-0 p-2 md:p-3 border-b border-border bg-card/80 backdrop-blur-sm shadow-surface">
      {/* Row 1: Inbox Switcher + Unread Count + Select + Actions */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <InboxSwitcher 
            selectedInboxId={selectedInboxId}
            onInboxChange={onInboxChange || (() => {})}
            className="h-7 text-xs"
          />
          <Badge variant="destructive" className="h-4 px-1.5 text-xs">
            {unreadCount}
          </Badge>
          
          {/* Select Button for Bulk Operations */}
          {onToggleBulkMode && (
            <Button
              variant={bulkSelectionMode ? "default" : "outline"}
              size="sm"
              onClick={handleToggleBulkMode}
              disabled={isLoadingAll || isFetchingNextPage}
              className="h-7 px-2 gap-1 text-xs"
            >
              <CheckSquare className="!w-3 !h-3" />
              <span className="hidden sm:inline">
                {isLoadingAll ? 'Loading...' : bulkSelectionMode ? t('dashboard.conversationList.exitSelection', 'Exit') : t('dashboard.conversationList.select', 'Select')}
              </span>
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-1.5">
          {/* New Conversation Button */}
          <NewConversationDialog>
            <Button
              variant="default"
              size="sm"
              className="h-7 px-2 gap-1 text-xs"
            >
              <Plus className="!w-3 !h-3" />
              <span className="hidden sm:inline">
                {t('dashboard.conversationList.new', 'New')}
              </span>
            </Button>
          </NewConversationDialog>
          
          {/* Filters Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant={hasActiveFilters ? "default" : "outline"}
                size="sm" 
                className="h-7 px-2 gap-1 text-xs relative"
              >
                <Filter className="!w-3 !h-3" />
                <span className="hidden sm:inline">
                  {t('dashboard.conversationList.filters', 'Filters')}
                </span>
                {activeFilterCount > 0 && (
                  <Badge className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground">
                    {activeFilterCount}
                  </Badge>
                )}
                <ChevronDown className="!w-3 !h-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">
                    {t('dashboard.conversationList.filterConversations', 'Filter Conversations')}
                  </h4>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFilters}
                      className="h-6 px-2 text-xs"
                    >
                      <X className="!w-3 !h-3 mr-1" />
                      {t('dashboard.conversationList.clearFilters', 'Clear')}
                    </Button>
                  )}
                </div>
                <ConversationListFilters />
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Thread Merger */}
          <Dialog open={showThreadMerger} onOpenChange={setShowThreadMerger}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 gap-1 text-xs"
              >
                <Settings className="!w-3 !h-3" />
                <span className="hidden sm:inline">
                  {t('dashboard.conversationList.merge', 'Merge')}
                </span>
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

          {/* Migration Tool */}
          <Dialog open={showMigrator} onOpenChange={setShowMigrator}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 gap-1 text-xs"
              >
                <Move className="!w-3 !h-3" />
                <span className="hidden sm:inline">
                  {t('dashboard.conversationList.migrate', 'Migrate')}
                </span>
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

          {/* Mark All Read Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            disabled={isMarkingAllAsRead || unreadCount === 0}
            className="h-7 px-2 gap-1 text-xs"
          >
            <CheckCheck className="!w-3 !h-3" />
            <span className="hidden sm:inline">
              {t('dashboard.conversationList.markAllRead', 'Mark all read')}
            </span>
          </Button>
        </div>
      </div>
      
      {/* Row 2: Search + Sort */}
      <div className="flex items-center gap-2">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
          <Input
            placeholder={t('dashboard.conversationList.searchPlaceholder', 'Search conversations... (Ctrl+K)')}
            value={state.searchQuery}
            onChange={(e) => dispatch({ type: 'SET_SEARCH_QUERY', payload: e.target.value })}
            className="pl-9 h-7 bg-background text-xs"
          />
          {state.searchQuery && (
            <button
              onClick={() => dispatch({ type: 'SET_SEARCH_QUERY', payload: '' })}
              className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="!w-3 !h-3" />
            </button>
          )}
        </div>
        
        {/* Sort Dropdown */}
        <Select 
          value={state.sortBy} 
          onValueChange={(value: SortBy) => dispatch({ type: 'SET_SORT_BY', payload: value })}
        >
          <SelectTrigger className="w-28 h-7 text-xs">
            <SelectValue>{getSortLabel(state.sortBy)}</SelectValue>
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="latest">
              {t('dashboard.conversationList.sortLatest', 'Latest')}
            </SelectItem>
            <SelectItem value="oldest">
              {t('dashboard.conversationList.sortOldest', 'Oldest')}
            </SelectItem>
            <SelectItem value="priority">
              {t('dashboard.conversationList.sortPriority', 'Priority')}
            </SelectItem>
            <SelectItem value="unread">
              {t('dashboard.conversationList.sortUnread', 'Unread First')}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Row 3: Active Filter Badges */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {t('dashboard.conversationList.activeFilters', 'Active filters:')}
          </span>
          {state.searchQuery && (
            <Badge variant="secondary" className="h-5 px-2 text-xs gap-1">
              Search: "{state.searchQuery.substring(0, 20)}{state.searchQuery.length > 20 ? '...' : ''}"
              <button
                onClick={() => dispatch({ type: 'SET_SEARCH_QUERY', payload: '' })}
                className="ml-1 hover:text-foreground"
              >
                <X className="!w-2.5 !h-2.5" />
              </button>
            </Badge>
          )}
          {state.statusFilter !== 'all' && (
            <Badge variant="secondary" className="h-5 px-2 text-xs gap-1">
              Status: {state.statusFilter}
              <button
                onClick={() => dispatch({ type: 'SET_STATUS_FILTER', payload: 'all' })}
                className="ml-1 hover:text-foreground"
              >
                <X className="!w-2.5 !h-2.5" />
              </button>
            </Badge>
          )}
          {state.priorityFilter !== 'all' && (
            <Badge variant="secondary" className="h-5 px-2 text-xs gap-1">
              Priority: {state.priorityFilter}
              <button
                onClick={() => dispatch({ type: 'SET_PRIORITY_FILTER', payload: 'all' })}
                className="ml-1 hover:text-foreground"
              >
                <X className="!w-2.5 !h-2.5" />
              </button>
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-5 px-2 text-xs"
          >
            {t('dashboard.conversationList.clearAll', 'Clear all')}
          </Button>
        </div>
      )}
    </div>
  );
};
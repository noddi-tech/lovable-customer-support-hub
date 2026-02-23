import { Filter, CheckCheck, ChevronDown, Move, Settings, CheckSquare, X, Plus } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ConversationMigrator } from "../ConversationMigrator";
import { ThreadMerger } from "../ThreadMerger";
import { NewConversationDialog } from "../NewConversationDialog";
import { useConversationList } from "@/contexts/ConversationListContext";
import { useTranslation } from "react-i18next";
import type { SortBy } from "@/contexts/ConversationListContext";
import { useState } from "react";

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
    <TooltipProvider delayDuration={300}>
      <div className="flex-shrink-0 p-1 md:p-1.5 border-b border-border bg-card/80 backdrop-blur-sm shadow-surface">
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {/* Unread Count Badge */}
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
                {unreadCount}
              </Badge>
            )}

            {/* Select */}
            {onToggleBulkMode && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={bulkSelectionMode ? "default" : "ghost"}
                    size="icon"
                    onClick={() => onToggleBulkMode?.()}
                    className="h-7 w-7"
                  >
                    <CheckSquare className="!w-3.5 !h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{bulkSelectionMode ? t('dashboard.conversationList.exitSelection', 'Exit') : t('dashboard.conversationList.select', 'Select')}</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* New */}
            <NewConversationDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="default" size="icon" className="h-7 w-7">
                    <Plus className="!w-3.5 !h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{t('dashboard.conversationList.new', 'New')}</p>
                </TooltipContent>
              </Tooltip>
            </NewConversationDialog>

            {/* Filters DropdownMenu */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={hasActiveFilters ? "default" : "ghost"}
                      size="icon"
                      className="h-7 w-7 relative"
                    >
                      <Filter className="!w-3.5 !h-3.5" />
                      {activeFilterCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-3.5 w-3.5 p-0 flex items-center justify-center text-[9px] bg-primary text-primary-foreground">
                          {activeFilterCount}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{t('dashboard.conversationList.filters', 'Filters')}</p>
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="start" className="w-48">
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

            {/* Merge */}
            <Dialog open={showThreadMerger} onOpenChange={setShowThreadMerger}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Settings className="!w-3.5 !h-3.5" />
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{t('dashboard.conversationList.merge', 'Merge')}</p>
                </TooltipContent>
              </Tooltip>
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Move className="!w-3.5 !h-3.5" />
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{t('dashboard.conversationList.migrate', 'Migrate')}</p>
                </TooltipContent>
              </Tooltip>
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={markAllAsRead}
                  disabled={isMarkingAllAsRead || unreadCount === 0}
                  className="h-7 w-7"
                >
                  <CheckCheck className="!w-3.5 !h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{t('dashboard.conversationList.markAllRead', 'Mark all read')}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Sort Dropdown */}
          <Select 
            value={state.sortBy} 
            onValueChange={(value: SortBy) => dispatch({ type: 'SET_SORT_BY', payload: value })}
          >
            <SelectTrigger className="w-auto h-7 border-0 shadow-none text-xs gap-1 ml-auto flex-shrink-0 px-1.5">
              <span className="text-muted-foreground">Sort:</span>
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
    </TooltipProvider>
  );
};

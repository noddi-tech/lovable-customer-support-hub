import { Filter, CheckCheck, ChevronDown, Move, Settings, CheckSquare, X, Plus, MoreHorizontal, Inbox, Clock, CheckCircle, Mail, Flag, ArrowDown, ArrowUp, Minus, AlertTriangle } from "lucide-react";
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
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useAccessibleInboxes } from "@/hooks/useInteractionsData";
import { useInboxOutstandingCounts } from "@/hooks/useInboxOutstandingCounts";

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
  const isMobile = useIsMobile();
  const { data: inboxes = [] } = useAccessibleInboxes();
  const { data: outstanding = {} } = useInboxOutstandingCounts();

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
      {!isMobile && (
        <div className="flex items-center justify-between mb-0.5 px-0.5">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wide font-medium">
            {t('dashboard.conversationList.quickActions', 'Quick actions')}
          </span>
          <span className="text-[9px] text-muted-foreground uppercase tracking-wide font-medium">
            {t('dashboard.conversationList.sortFiltering', 'Sort / Filtering')}
          </span>
        </div>
      )}
      <div className="flex items-center gap-1">
        {/* Left side: Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Sidebar trigger - mobile only */}
          {isMobile && <SidebarTrigger className="shrink-0" />}
          {/* New - always visible */}
          <NewConversationDialog>
            <Button variant="default" size="xxs">
              <Plus className="!w-2.5 !h-2.5" />
              {!isMobile && t('dashboard.conversationList.new', 'New')}
            </Button>
          </NewConversationDialog>

          {/* Desktop: show all buttons inline */}
          {!isMobile && (
            <>
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
            </>
          )}

          {/* Mobile: overflow menu for secondary actions */}
          {isMobile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="xxs">
                  <MoreHorizontal className="!w-3 !h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {onToggleBulkMode && (
                  <DropdownMenuItem onClick={() => onToggleBulkMode?.()}>
                    <CheckSquare className="w-4 h-4 mr-2" />
                    {bulkSelectionMode ? 'Exit Selection' : 'Select'}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setShowThreadMerger(true)}>
                  <Settings className="w-4 h-4 mr-2" />
                  Merge Threads
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowMigrator(true)}>
                  <Move className="w-4 h-4 mr-2" />
                  Migrate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={markAllAsRead} disabled={isMarkingAllAsRead || unreadCount === 0}>
                  <CheckCheck className="w-4 h-4 mr-2" />
                  Mark All Read {unreadCount > 0 && `(${unreadCount})`}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Right side: Filters + Sort */}
        <div className="flex items-center gap-1 ml-auto flex-shrink-0">
          {/* Purpose filter chips: Alle / Kundesupport / Rekruttering */}
          <div className="hidden sm:flex items-center rounded-md border border-input bg-background overflow-hidden">
            {([
              { v: 'all', label: 'Alle' },
              { v: 'support', label: 'Kundesupport' },
              { v: 'recruitment', label: 'Rekruttering' },
            ] as const).map((opt) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => dispatch({ type: 'SET_PURPOSE_FILTER', payload: opt.v })}
                className={`px-2 h-7 text-[10px] transition-colors ${
                  state.purposeFilter === opt.v
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {/* Filters */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-7 items-center justify-between gap-1 rounded-md border border-input bg-background px-2 text-[10px] ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap">
                <Filter className="!w-2.5 !h-2.5 shrink-0" />
                {!isMobile && <span className="truncate max-w-[70px] text-[10px]">{getFilterLabel()}</span>}
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
                <DropdownMenuRadioItem value="all" className="gap-2"><Mail className="!w-3.5 !h-3.5" />{t('dashboard.conversationList.allStatus', 'All Status')}</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="open" className="gap-2"><Inbox className="!w-3.5 !h-3.5 text-blue-600" />{t('dashboard.conversationList.open', 'Open')}</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="pending" className="gap-2"><Clock className="!w-3.5 !h-3.5 text-orange-600" />{t('dashboard.conversationList.pending', 'Pending')}</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="closed" className="gap-2"><CheckCircle className="!w-3.5 !h-3.5 text-green-600" />{t('dashboard.conversationList.closed', 'Closed')}</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{t('dashboard.conversationList.priorityFilter', 'Priority')}</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={state.priorityFilter}
                onValueChange={(value) => dispatch({ type: 'SET_PRIORITY_FILTER', payload: value })}
              >
                <DropdownMenuRadioItem value="all" className="gap-2"><Flag className="!w-3.5 !h-3.5" />{t('dashboard.conversationList.allPriority', 'All Priority')}</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="low" className="gap-2"><ArrowDown className="!w-3.5 !h-3.5 text-muted-foreground" />{t('dashboard.conversationList.low', 'Low')}</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="normal" className="gap-2"><Minus className="!w-3.5 !h-3.5 text-blue-600" />{t('dashboard.conversationList.normal', 'Normal')}</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="high" className="gap-2"><ArrowUp className="!w-3.5 !h-3.5 text-orange-600" />{t('dashboard.conversationList.high', 'High')}</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="urgent" className="gap-2"><AlertTriangle className="!w-3.5 !h-3.5 text-destructive" />{t('dashboard.conversationList.urgent', 'Urgent')}</DropdownMenuRadioItem>
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
            <SelectTrigger className="w-auto h-7 text-[10px] gap-1 px-2">
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

      {/* Mobile: full-width search (the inbox rail is hidden on phones) */}
      {isMobile && (
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            inputMode="search"
            value={state.searchQuery}
            onChange={(e) => dispatch({ type: 'SET_SEARCH_QUERY', payload: e.target.value })}
            placeholder={t('dashboard.conversationList.searchPlaceholder', 'Search conversations...')}
            className="h-10 pl-8 text-base"
          />
        </div>
      )}

      {/* Mobile: inbox switcher + status / purpose filter chips */}
      {isMobile && (
        <div className="mt-2 space-y-2">
          <Select
            value={selectedInboxId && selectedInboxId !== 'all' && !selectedInboxId.includes(',') ? selectedInboxId : 'all'}
            onValueChange={(value) => onInboxChange?.(value)}
          >
            <SelectTrigger className="h-10 w-full text-sm">
              <span className="flex items-center gap-2 min-w-0">
                <Inbox className="h-4 w-4 shrink-0 text-muted-foreground" />
                <SelectValue placeholder={t('dashboard.conversationList.allInboxes', 'All inboxes')} />
              </span>
            </SelectTrigger>
            <SelectContent className="max-h-[50vh]">
              <SelectItem value="all">{t('dashboard.conversationList.allInboxes', 'All inboxes')}</SelectItem>
              {inboxes.map((inbox) => {
                const counts = outstanding[inbox.id];
                const open = counts?.open ?? 0;
                return (
                  <SelectItem key={inbox.id} value={inbox.id}>
                    <span className="flex items-center gap-2">
                      <span className="truncate">{inbox.name}</span>
                      {open > 0 && (
                        <Badge variant="secondary" className="h-4 px-1 text-[10px]">{open}</Badge>
                      )}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1.5 overflow-x-auto -mx-1.5 px-1.5 pb-0.5">
            {([
              { v: 'all', label: t('dashboard.conversationList.allStatus', 'All Status') },
              { v: 'open', label: t('dashboard.conversationList.open', 'Open') },
              { v: 'pending', label: t('dashboard.conversationList.pending', 'Pending') },
              { v: 'closed', label: t('dashboard.conversationList.closed', 'Closed') },
            ] as const).map((opt) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => dispatch({ type: 'SET_STATUS_FILTER', payload: opt.v })}
                className={`shrink-0 rounded-full border px-3 h-8 text-xs transition-colors ${
                  state.statusFilter === opt.v
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-input bg-background text-muted-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
            <span className="shrink-0 w-px h-5 bg-border mx-0.5" />
            {([
              { v: 'all', label: 'Alle' },
              { v: 'support', label: 'Kundesupport' },
              { v: 'recruitment', label: 'Rekruttering' },
            ] as const).map((opt) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => dispatch({ type: 'SET_PURPOSE_FILTER', payload: opt.v })}
                className={`shrink-0 rounded-full border px-3 h-8 text-xs transition-colors ${
                  state.purposeFilter === opt.v
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-input bg-background text-muted-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mobile dialogs (rendered outside the overflow menu) */}
      {isMobile && (
        <>
          <Dialog open={showThreadMerger} onOpenChange={setShowThreadMerger}>
            <DialogContent className="max-w-[95vw]">
              <DialogHeader>
                <DialogTitle>{t('dashboard.threadMerger', 'Thread Merger')}</DialogTitle>
              </DialogHeader>
              <ThreadMerger 
                inboxId={selectedInboxId !== 'all' ? selectedInboxId : undefined}
                onMergeComplete={() => setShowThreadMerger(false)}
              />
            </DialogContent>
          </Dialog>
          <Dialog open={showMigrator} onOpenChange={setShowMigrator}>
            <DialogContent className="max-w-[95vw]">
              <DialogHeader>
                <DialogTitle>{t('dashboard.migrateConversations', 'Migrate Conversations')}</DialogTitle>
              </DialogHeader>
              <ConversationMigrator 
                sourceInboxId={selectedInboxId !== 'all' ? selectedInboxId : undefined}
                onMigrationComplete={() => setShowMigrator(false)}
              />
            </DialogContent>
          </Dialog>
        </>
      )}

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
              {state.statusFilter === 'open' && <Inbox className="!w-3 !h-3 text-blue-600" />}
              {state.statusFilter === 'pending' && <Clock className="!w-3 !h-3 text-orange-600" />}
              {state.statusFilter === 'closed' && <CheckCircle className="!w-3 !h-3 text-green-600" />}
              {state.statusFilter}
              <button onClick={() => dispatch({ type: 'SET_STATUS_FILTER', payload: 'all' })} className="ml-1 hover:text-foreground">
                <X className="!w-2.5 !h-2.5" />
              </button>
            </Badge>
          )}
          {state.priorityFilter !== 'all' && (
            <Badge variant="secondary" className="h-5 px-2 text-xs gap-1">
              {state.priorityFilter === 'low' && <ArrowDown className="!w-3 !h-3 text-muted-foreground" />}
              {state.priorityFilter === 'normal' && <Minus className="!w-3 !h-3 text-blue-600" />}
              {state.priorityFilter === 'high' && <ArrowUp className="!w-3 !h-3 text-orange-600" />}
              {state.priorityFilter === 'urgent' && <AlertTriangle className="!w-3 !h-3 text-destructive" />}
              {state.priorityFilter}
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

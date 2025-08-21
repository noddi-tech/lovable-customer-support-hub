import { Search, Filter, Inbox, CheckCheck, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ConversationListFilters } from "./ConversationListFilters";
import { useConversationList } from "@/contexts/ConversationListContext";
import { useTranslation } from "react-i18next";
import type { SortBy } from "@/contexts/ConversationListContext";

interface ConversationListHeaderProps {
  onToggleCollapse?: () => void;
}

export const ConversationListHeader = ({ onToggleCollapse }: ConversationListHeaderProps) => {
  const { state, dispatch, filteredConversations, markAllAsRead, isMarkingAllAsRead } = useConversationList();
  const { t } = useTranslation();

  const totalCount = filteredConversations.length;
  const unreadCount = filteredConversations.filter(c => !c.is_read).length;

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

  return (
    <div className="flex-shrink-0 p-3 md:p-4 border-b border-border bg-card/80 backdrop-blur-sm shadow-surface">
      {/* Row 1: Title + Total Count + Actions */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h1 className="font-semibold text-lg md:text-xl">
            {t('dashboard.conversationList.conversations', 'Conversations')}
          </h1>
          <Badge variant="secondary" className="h-5 px-2 text-xs font-medium">
            {totalCount}
          </Badge>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="h-5 px-2 text-xs">
              {unreadCount} {t('dashboard.conversationList.unread', 'unread')}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Filters Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 gap-1"
              >
                <Filter className="w-3 h-3" />
                <span className="hidden sm:inline">
                  {t('dashboard.conversationList.filters', 'Filters')}
                </span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">
                  {t('dashboard.conversationList.filterConversations', 'Filter Conversations')}
                </h4>
                <ConversationListFilters />
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Mark All Read Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            disabled={isMarkingAllAsRead || unreadCount === 0}
            className="h-8 gap-1"
          >
            <CheckCheck className="w-3 h-3" />
            <span className="hidden sm:inline">
              {t('dashboard.conversationList.markAllRead', 'Mark all read')}
            </span>
          </Button>
        </div>
      </div>
      
      {/* Row 2: Search + Sort */}
      <div className="flex items-center gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder={t('dashboard.conversationList.searchPlaceholder', 'Search conversations... (Ctrl+K)')}
            value={state.searchQuery}
            onChange={(e) => dispatch({ type: 'SET_SEARCH_QUERY', payload: e.target.value })}
            className="pl-10 h-9 bg-background"
          />
        </div>
        
        {/* Sort Dropdown */}
        <Select 
          value={state.sortBy} 
          onValueChange={(value: SortBy) => dispatch({ type: 'SET_SORT_BY', payload: value })}
        >
          <SelectTrigger className="w-32 h-9">
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
    </div>
  );
};
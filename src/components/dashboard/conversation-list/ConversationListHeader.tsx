import { Search, Filter, Inbox, Sidebar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConversationList } from "@/contexts/ConversationListContext";
import { useTranslation } from "react-i18next";

interface ConversationListHeaderProps {
  onToggleCollapse?: () => void;
}

export const ConversationListHeader = ({ onToggleCollapse }: ConversationListHeaderProps) => {
  const { state, dispatch, filteredConversations } = useConversationList();
  const { t } = useTranslation();

  const unreadCount = filteredConversations.filter(c => !c.is_read).length;

  return (
    <div className="flex-shrink-0 p-3 md:p-4 border-b border-border bg-card/80 backdrop-blur-sm shadow-surface">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4 md:h-5 md:w-5" />
          <h2 className="font-semibold text-base md:text-lg ellipsis">
            {t('dashboard.conversationList.inbox', 'Inbox')}
          </h2>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="h-4 md:h-5 px-1 md:px-2 text-xs">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onToggleCollapse && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onToggleCollapse}
              className="hidden md:flex h-8 w-8 p-0"
              title="Collapse conversation list"
            >
              <Sidebar className="h-4 w-4" />
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-8">
            <Filter className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">
              {t('dashboard.conversationList.filter', 'Filter')}
            </span>
          </Button>
        </div>
      </div>
      
      <div className="relative mb-3 md:mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder={t('dashboard.conversationList.searchPlaceholder', 'Search conversations...')}
          value={state.searchQuery}
          onChange={(e) => dispatch({ type: 'SET_SEARCH_QUERY', payload: e.target.value })}
          className="pl-10 h-9"
        />
      </div>
    </div>
  );
};
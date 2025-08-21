import { Clock, Inbox } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ConversationListProvider, useConversationList, type Conversation } from "@/contexts/ConversationListContext";
import { ConversationListHeader } from "./conversation-list/ConversationListHeader";
import { ConversationListFilters } from "./conversation-list/ConversationListFilters";
import { ConversationListItem } from "./conversation-list/ConversationListItem";
import { ConversationListDeleteDialog } from "./conversation-list/ConversationListDeleteDialog";

interface ConversationListProps {
  selectedTab: string;
  onSelectConversation: (conversation: Conversation) => void;
  selectedConversation?: Conversation;
  selectedInboxId: string;
  onToggleCollapse?: () => void;
}

const ConversationListContent = ({ onSelectConversation, selectedConversation, onToggleCollapse }: Omit<ConversationListProps, 'selectedTab' | 'selectedInboxId'>) => {
  const { filteredConversations, isLoading } = useConversationList();
  const { t } = useTranslation();

  return (
    <div className="flex flex-col bg-gradient-surface h-full min-h-0">
      <ConversationListHeader onToggleCollapse={onToggleCollapse} />
      <ConversationListFilters />
      
      {/* Conversation List - Scrollable with responsive layout */}
      <div className="pane flex-1">
        <div className="px-3 md:px-4 pb-4 space-y-2">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50 animate-spin" />
              <p>{t('dashboard.conversationList.loadingConversations', 'Loading conversations...')}</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Inbox className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">{t('dashboard.conversationList.noConversations', 'No conversations found')}</p>
              <p className="text-sm mb-4">{t('dashboard.conversationList.noConversationsDescription', 'There are no conversations matching your current filters.')}</p>
            </div>
          ) : (
            <div className="space-y-0">
              {/* Desktop: Table header */}
              <div className="hidden md:block sticky top-0 z-10 bg-card/90 backdrop-blur-sm border-b border-border">
                <div className="row px-4 py-2 text-sm font-medium text-muted-foreground">
                  <div className="col--status">Status</div>
                  <div className="col--from">From</div>
                  <div className="col--subject">Subject</div>
                  <div className="col--date">Date</div>
                  <div className="flex-shrink-0 w-10"></div>
                </div>
              </div>
              
              {/* Conversation List */}
              {filteredConversations.map((conversation) => (
                <ConversationListItem 
                  key={conversation.id}
                  conversation={conversation}
                  isSelected={selectedConversation?.id === conversation.id}
                  onSelect={onSelectConversation}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ConversationListDeleteDialog />
    </div>
  );
};

export const ConversationList = ({ selectedTab, onSelectConversation, selectedConversation, selectedInboxId, onToggleCollapse }: ConversationListProps) => {
  return (
    <ConversationListProvider selectedTab={selectedTab} selectedInboxId={selectedInboxId}>
      <ConversationListContent 
        onSelectConversation={onSelectConversation}
        selectedConversation={selectedConversation}
        onToggleCollapse={onToggleCollapse}
      />
    </ConversationListProvider>
  );
};
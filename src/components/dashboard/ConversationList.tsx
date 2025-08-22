import { Clock, Inbox } from "lucide-react";
import { ConversationListProvider, useConversationList, type Conversation } from "@/contexts/ConversationListContext";
import { ConversationListHeader } from "./conversation-list/ConversationListHeader";
import { ConversationListItem } from "./conversation-list/ConversationListItem";
import { ConversationListDeleteDialog } from "./conversation-list/ConversationListDeleteDialog";
import { VirtualizedConversationList } from "./conversation-list/VirtualizedConversationList";
import { useOptimizedRealtimeSubscriptions } from "@/hooks/useOptimizedRealtimeSubscriptions";
import { useMemoryLeakPrevention } from "@/hooks/useMemoryLeakPrevention";
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from "react-i18next";

interface ConversationListProps {
  selectedTab: string;
  onSelectConversation: (conversation: Conversation) => void;
  selectedConversation?: Conversation;
  selectedInboxId: string;
  onToggleCollapse?: () => void;
}

const ConversationListContent = ({ onSelectConversation, selectedConversation, onToggleCollapse }: Omit<ConversationListProps, 'selectedTab' | 'selectedInboxId'>) => {
  const { filteredConversations, isLoading } = useConversationList();
  const { user } = useAuth();
  const { t } = useTranslation();

  // Memory leak prevention for this component
  const memoryUtils = useMemoryLeakPrevention('ConversationList', {
    enableLogging: import.meta.env.DEV,
    maxEventListeners: 15,
  });

  // Optimized realtime subscriptions
  useOptimizedRealtimeSubscriptions([
    {
      table: 'conversations',
      events: ['INSERT', 'UPDATE', 'DELETE'],
      throttleMs: 1000,
      batchUpdates: true,
    },
    {
      table: 'messages',
      events: ['INSERT'],
      throttleMs: 2000,
      batchUpdates: true,
    }
  ], !!user);

  // Use virtualized list for large datasets (>50 conversations)
  const shouldUseVirtualization = filteredConversations.length > 50;

  return (
    <div className="flex flex-col bg-gradient-surface h-full min-h-0">
      <ConversationListHeader onToggleCollapse={onToggleCollapse} />
      
      {/* Conversation List - Optimized rendering */}
      <div className="pane flex-1">
        {shouldUseVirtualization ? (
          <VirtualizedConversationList
            onSelectConversation={onSelectConversation}
            selectedConversation={selectedConversation}
          />
        ) : (
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
              <div className="space-y-2">
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
        )}
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
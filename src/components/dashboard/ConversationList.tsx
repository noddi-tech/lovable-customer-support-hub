import { Clock, Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ConversationListProvider, useConversationList, type Conversation } from "@/contexts/ConversationListContext";
import { ConversationListHeader } from "./conversation-list/ConversationListHeader";
import { ConversationListItem } from "./conversation-list/ConversationListItem";
import { ConversationListDeleteDialog } from "./conversation-list/ConversationListDeleteDialog";
import { VirtualizedConversationList } from "./conversation-list/VirtualizedConversationList";
import { SessionRecoveryBanner } from "@/components/conversations/SessionRecoveryBanner";
import { SessionDebugPanel } from "@/components/conversations/SessionDebugPanel";
import { AuthContextDebugger } from "@/components/conversations/AuthContextDebugger";
// Removed old realtime subscription hook - now using centralized system
import { useMemoryLeakPrevention } from "@/hooks/useMemoryLeakPrevention";
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from "react-i18next";
import { useState, useEffect } from 'react';

interface ConversationListProps {
  selectedTab: string;
  onSelectConversation: (conversation: Conversation) => void;
  selectedConversation?: Conversation;
  selectedInboxId: string;
  onToggleCollapse?: () => void;
}

const ConversationListContent = ({ onSelectConversation, selectedConversation, onToggleCollapse }: Omit<ConversationListProps, 'selectedTab' | 'selectedInboxId'>) => {
  const { filteredConversations, isLoading, hasSessionError } = useConversationList();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [showSessionBanner, setShowSessionBanner] = useState(false);

  // Memory leak prevention for this component
  const memoryUtils = useMemoryLeakPrevention('ConversationList', {
    enableLogging: import.meta.env.DEV,
    maxEventListeners: 15,
  });

  // Show session recovery banner if there are session issues and no conversations
  useEffect(() => {
    if (hasSessionError && filteredConversations.length === 0 && !isLoading) {
      setShowSessionBanner(true);
    } else if (filteredConversations.length > 0) {
      setShowSessionBanner(false);
    }
  }, [hasSessionError, filteredConversations.length, isLoading]);

  // Note: Real-time subscriptions are now centralized in useOptimizedCounts
  // to prevent duplicate subscriptions and improve performance

  // Use virtualized list for large datasets (temporarily disabled - fixing design mismatch)
  const shouldUseVirtualization = filteredConversations.length > 500;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Session Recovery Banner */}
      <SessionRecoveryBanner 
        show={showSessionBanner} 
        onHide={() => setShowSessionBanner(false)} 
      />
      
      {/* Header - only show when onToggleCollapse is provided */}
      {onToggleCollapse && (
        <ConversationListHeader onToggleCollapse={onToggleCollapse} />
      )}
      
      {/* Conversation List - Card-based layout */}
      <div className="pane flex-1 overflow-y-auto min-h-0">
        {import.meta.env.DEV && <AuthContextDebugger />}
        {import.meta.env.DEV && <SessionDebugPanel />}
        
        {shouldUseVirtualization ? (
          <VirtualizedConversationList
            onSelectConversation={onSelectConversation}
            selectedConversation={selectedConversation}
          />
        ) : (
          <div className="p-4 space-y-3">
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
              <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {/* Conversation Cards */}
                {filteredConversations.map((conversation) => (
                  <Card 
                    key={conversation.id}
                    className={`cursor-pointer border-border hover:shadow-md transition-all duration-200 ${
                      selectedConversation?.id === conversation.id 
                        ? 'ring-2 ring-ring bg-accent/50' 
                        : 'hover:bg-card/80'
                    }`}
                    onClick={() => onSelectConversation(conversation)}
                  >
                    <CardContent className="p-4">
                      <ConversationListItem 
                        conversation={conversation}
                        isSelected={selectedConversation?.id === conversation.id}
                        onSelect={onSelectConversation}
                      />
                    </CardContent>
                  </Card>
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
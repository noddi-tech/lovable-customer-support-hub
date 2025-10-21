import { Clock, Inbox } from "lucide-react";
import { ConversationListProvider, useConversationList, type Conversation } from "@/contexts/ConversationListContext";
import { ConversationListHeader } from "./conversation-list/ConversationListHeader";
import { ConversationListItem } from "./conversation-list/ConversationListItem";
import { ConversationListDeleteDialog } from "./conversation-list/ConversationListDeleteDialog";
import { VirtualizedConversationList } from "./conversation-list/VirtualizedConversationList";
import { BulkActionsBar } from "./conversation-list/BulkActionsBar";
import { SessionRecoveryBanner } from "@/components/conversations/SessionRecoveryBanner";
import { SessionSyncButton } from "@/components/conversations/SessionSyncButton";
import { SessionHealthMonitor } from "@/components/conversations/SessionHealthMonitor";
// Removed old realtime subscription hook - now using centralized system
import { useMemoryLeakPrevention } from "@/hooks/useMemoryLeakPrevention";
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from "react-i18next";
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';


interface ConversationListProps {
  selectedTab: string;
  onSelectConversation: (conversation: Conversation) => void;
  selectedConversation?: Conversation;
  selectedInboxId: string;
  onToggleCollapse?: () => void;
}

const ConversationListContent = ({ onSelectConversation, selectedConversation, onToggleCollapse, selectedInboxId }: Omit<ConversationListProps, 'selectedTab'>) => {
  const { 
    filteredConversations, 
    isLoading, 
    hasSessionError, 
    state, 
    dispatch,
    bulkMarkAsRead,
    bulkMarkAsUnread,
    bulkChangeStatus,
    bulkArchive,
    bulkDelete,
    bulkAssign,
    agents
  } = useConversationList();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [showSessionBanner, setShowSessionBanner] = useState(false);
  const queryClient = useQueryClient();

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

  // Use virtualized list for large datasets - Phase 3: Lower threshold for better UX
  const shouldUseVirtualization = filteredConversations.length > 100;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Session Recovery Banner */}
      <SessionRecoveryBanner 
        show={showSessionBanner} 
        onHide={() => setShowSessionBanner(false)} 
      />
      
      {/* Session Health Monitor */}
      <SessionHealthMonitor showDetails={import.meta.env.DEV && filteredConversations.length === 0} />
      
      {/* Session Sync Button */}
      <SessionSyncButton 
        onSyncSuccess={() => {
          setShowSessionBanner(false);
          // Only refresh conversation-related queries
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
          queryClient.invalidateQueries({ queryKey: ['inbox-counts'] });
          queryClient.invalidateQueries({ queryKey: ['all-counts'] });
        }}
        showAlert={hasSessionError && filteredConversations.length === 0}
      />
      
      {/* Header - always visible for Search, Filters, Merge, etc. */}
      <ConversationListHeader 
        onToggleCollapse={onToggleCollapse} 
        selectedInboxId={selectedInboxId}
        onInboxChange={(inboxId) => {
          // Update URL with new inbox selection
          const url = new URL(window.location.href);
          if (inboxId === 'all') {
            url.searchParams.delete('inbox');
          } else {
            url.searchParams.set('inbox', inboxId);
          }
          window.history.pushState({}, '', url.toString());
        }}
        bulkSelectionMode={state.bulkSelectionMode}
        onToggleBulkMode={() => dispatch({ type: 'TOGGLE_BULK_MODE' })}
      />
      
      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={state.selectedConversations.size}
        onClearSelection={() => dispatch({ type: 'CLEAR_BULK_SELECTION' })}
        onMarkAsRead={bulkMarkAsRead}
        onMarkAsUnread={bulkMarkAsUnread}
        onChangeStatus={bulkChangeStatus}
        onArchive={bulkArchive}
        onDelete={bulkDelete}
        onAssign={bulkAssign}
        agents={agents}
      />
      
      {/* Conversation List - Card-based layout */}
      <div className="pane flex-1 overflow-y-auto min-h-0 bg-white">
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
              <>
                {console.log('🔍 [ConversationList] Rendering conversations:', {
                  filteredCount: filteredConversations.length,
                  selectedInboxId,
                  filters: {
                    search: state.searchQuery,
                    status: state.statusFilter,
                    priority: state.priorityFilter,
                  }
                })}
                <div className="space-y-3">
                  {filteredConversations.map((conversation) => (
                    <ConversationListItem 
                      key={conversation.id}
                      conversation={conversation}
                      isSelected={selectedConversation?.id === conversation.id}
                      onSelect={onSelectConversation}
                      showBulkCheckbox={state.bulkSelectionMode}
                      isBulkSelected={state.selectedConversations.has(conversation.id)}
                      onBulkSelect={(id, selected) => {
                        dispatch({ type: 'TOGGLE_BULK_SELECTION', payload: { id, selected } });
                      }}
                    />
                  ))}
                </div>
              </>
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
        selectedInboxId={selectedInboxId}
      />
    </ConversationListProvider>
  );
};
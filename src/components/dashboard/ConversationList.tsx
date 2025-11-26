import { Clock, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "react-router-dom";
import { ConversationListProvider, useConversationList, type Conversation } from "@/contexts/ConversationListContext";
import { ConversationListHeader } from "./conversation-list/ConversationListHeader";
import { ConversationListDeleteDialog } from "./conversation-list/ConversationListDeleteDialog";
import { ConversationTable } from "./conversation-list/ConversationTable";
import { VirtualizedConversationTable } from "./conversation-list/VirtualizedConversationTable";
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
  const [searchParams, setSearchParams] = useSearchParams();

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
      
      {/* Session Sync Button - Less intrusive recovery option */}
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
          // Update URL with new inbox selection using React Router
          const newParams = new URLSearchParams(searchParams);
          if (inboxId === 'all') {
            newParams.delete('inbox');
          } else {
            newParams.set('inbox', inboxId);
          }
          setSearchParams(newParams, { replace: true });
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
      
      {/* Conversation List - Table layout */}
      <div className="pane flex-1 overflow-hidden min-h-0 bg-white">
        {shouldUseVirtualization ? (
          <VirtualizedConversationTable
            onSelectConversation={onSelectConversation}
            selectedConversation={selectedConversation}
          />
        ) : (
          <ConversationTable
            onSelectConversation={onSelectConversation}
            selectedConversation={selectedConversation}
          />
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
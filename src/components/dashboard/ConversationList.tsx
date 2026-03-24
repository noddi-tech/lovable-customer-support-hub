import { Clock, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "react-router-dom";
import { ConversationListProvider, useConversationList, type Conversation } from "@/contexts/ConversationListContext";
import { ConversationListHeader } from "./conversation-list/ConversationListHeader";
import { ConversationListDeleteDialog } from "./conversation-list/ConversationListDeleteDialog";
import { ConversationTable } from "./conversation-list/ConversationTable";
import { ArchiveConfirmDialog } from "./conversation-list/ArchiveConfirmDialog";
import { VirtualizedConversationTable } from "./conversation-list/VirtualizedConversationTable";
import { BulkActionsBar } from "./conversation-list/BulkActionsBar";
import { SessionRecoveryBanner } from "@/components/conversations/SessionRecoveryBanner";
import { SessionSyncButton } from "@/components/conversations/SessionSyncButton";
import { SessionHealthMonitor } from "@/components/conversations/SessionHealthMonitor";
// Removed old realtime subscription hook - now using centralized system
import { useMemoryLeakPrevention } from "@/hooks/useMemoryLeakPrevention";
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from "react-i18next";
import { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';


interface ConversationListProps {
  selectedTab: string;
  onSelectConversation: (conversation: Conversation) => void;
  selectedConversation?: Conversation;
  selectedInboxId: string;
  onToggleCollapse?: () => void;
  searchQuery?: string;
}

const ConversationListContent = ({ onSelectConversation, selectedConversation, onToggleCollapse, selectedInboxId, searchQuery }: Omit<ConversationListProps, 'selectedTab'>) => {
  const { 
    filteredConversations, 
    isLoading, 
    hasSessionError, 
    state, 
    dispatch,
    hasNextPage,
    isFetchingNextPage,
    bulkMarkAsRead,
    bulkMarkAsUnread,
    bulkChangeStatus,
    bulkArchive,
    bulkDelete,
    bulkAssign,
    agents,
    confirmArchive
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

  // Sync external searchQuery prop into ConversationListContext
  useEffect(() => {
    if (searchQuery !== undefined) {
      dispatch({ type: 'SET_SEARCH_QUERY', payload: searchQuery });
    }
  }, [searchQuery, dispatch]);

  // Note: Real-time subscriptions are now centralized in useOptimizedCounts
  // to prevent duplicate subscriptions and improve performance

  // Stable virtualization decision - use virtualization if there's potential for large dataset
  // This prevents switching between table types during bulk load
  const shouldUseVirtualization = filteredConversations.length > 50 || hasNextPage || isFetchingNextPage || hasSessionError || state.bulkSelectionMode;

  // Active filter chips
  const activeFilters = useMemo(() => {
    const filters: { key: string; label: string; onClear: () => void }[] = [];
    if (state.statusFilter && state.statusFilter !== 'all') {
      filters.push({
        key: 'status',
        label: `Status: ${state.statusFilter}`,
        onClear: () => dispatch({ type: 'SET_STATUS_FILTER', payload: 'all' }),
      });
    }
    if (state.priorityFilter && state.priorityFilter !== 'all') {
      filters.push({
        key: 'priority',
        label: `Priority: ${state.priorityFilter}`,
        onClear: () => dispatch({ type: 'SET_PRIORITY_FILTER', payload: 'all' }),
      });
    }
    return filters;
  }, [state.statusFilter, state.priorityFilter, dispatch]);

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
      
      {/* Active Filter Chips */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-b bg-muted/30">
          {activeFilters.map((filter) => (
            <Badge
              key={filter.key}
              variant="secondary"
              className="text-[10px] px-2 py-0.5 flex items-center gap-1 cursor-pointer hover:bg-secondary/80"
              onClick={filter.onClear}
            >
              {filter.label}
              <X className="w-3 h-3" />
            </Badge>
          ))}
          {activeFilters.length > 1 && (
            <button
              className="text-[10px] text-muted-foreground hover:text-foreground ml-1"
              onClick={() => {
                dispatch({ type: 'SET_STATUS_FILTER', payload: 'all' });
                dispatch({ type: 'SET_PRIORITY_FILTER', payload: 'all' });
              }}
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Conversation List - Table layout */}
      <div className="pane flex-1 flex flex-col overflow-hidden min-h-0 h-full bg-card">
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
      <ArchiveConfirmDialog
        open={state.archiveDialog.open}
        onOpenChange={(open) => {
          if (!open) dispatch({ type: 'CLOSE_ARCHIVE_DIALOG' });
        }}
        nonClosedCount={state.archiveDialog.nonClosedCount}
        totalCount={state.archiveDialog.totalCount}
        onArchiveOnly={() => confirmArchive(false)}
        onArchiveAndClose={() => confirmArchive(true)}
      />
    </div>
  );
};

export const ConversationList = ({ selectedTab, onSelectConversation, selectedConversation, selectedInboxId, onToggleCollapse, searchQuery }: ConversationListProps) => {
  return (
    <ConversationListProvider selectedTab={selectedTab} selectedInboxId={selectedInboxId}>
      <ConversationListContent 
        onSelectConversation={onSelectConversation}
        selectedConversation={selectedConversation}
        onToggleCollapse={onToggleCollapse}
        selectedInboxId={selectedInboxId}
        searchQuery={searchQuery}
      />
    </ConversationListProvider>
  );
};
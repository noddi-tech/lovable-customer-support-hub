import React from 'react';
import { InteractionsProvider, useInteractions } from '@/contexts/InteractionsContext';
import { ConversationListProvider } from '@/contexts/ConversationListContext';
import { StandardThreePanelLayout } from '@/components/layout/StandardThreePanelLayout';
import { InteractionsHeader } from './InteractionsHeader';
import { InteractionsSidebar } from './InteractionsSidebar';
import { InteractionsListView } from './InteractionsListView';
import { InteractionsDetailView } from './InteractionsDetailView';

const InteractionsInterfaceContent = () => {
  const { state, selectConversation, selectSection } = useInteractions();

  const handleBack = () => {
    selectConversation(null);
  };

  return (
    <ConversationListProvider selectedTab="all" selectedInboxId="">
      <StandardThreePanelLayout
        storageKey="interactions-interface"
        header={<InteractionsHeader />}
        sidebar={
          <InteractionsSidebar 
            selectedSection={state.selectedSection}
            onSectionChange={selectSection}
          />
        }
        listView={<InteractionsListView />}
        detailView={
          state.selectedConversationId ? (
            <InteractionsDetailView conversationId={state.selectedConversationId} />
          ) : null
        }
        showDetailView={!!state.selectedConversationId}
        onBack={handleBack}
      />
    </ConversationListProvider>
  );
};

// Main InteractionsInterface component with provider wrapper
export const InteractionsInterface = () => {
  return (
    <InteractionsProvider>
      <InteractionsInterfaceContent />
    </InteractionsProvider>
  );
};
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { NewConversationList } from './NewConversationList';
import { ConversationView } from './ConversationView';
import { ResponsiveLayout } from '@/components/layout';
import { useResponsive } from '@/contexts/ResponsiveContext';
import { Conversation } from '@/services/conversationsService';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export const NewDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const { showInspector, setShowInspector, isMobile } = useResponsive();

  const conversationIdFromUrl = searchParams.get('conversation');
  const selectedInboxId = localStorage.getItem('selectedInboxId') || 'all';

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    
    // On mobile, navigate to a full conversation view
    if (isMobile) {
      // TODO: Navigate to dedicated conversation page
      console.log('Mobile conversation select:', conversation.id);
    } else {
      setShowInspector(true);
    }
    
    // Update URL with conversation ID
    const newParams = new URLSearchParams(searchParams);
    newParams.set('conversation', conversation.id);
    setSearchParams(newParams, { replace: true });
  };

  const handleCloseConversation = () => {
    setSelectedConversation(null);
    setShowInspector(false);
    
    // Remove conversation ID from URL
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('conversation');
    setSearchParams(newParams, { replace: true });
  };

  const mainContent = (
    <NewConversationList
      selectedConversation={selectedConversation}
      onConversationSelect={handleConversationSelect}
      inboxId={selectedInboxId}
    />
  );

  const inspectorContent = selectedConversation && (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
        <h3 className="font-medium">Conversation Details</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCloseConversation}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <ConversationView
          conversationId={selectedConversation.id}
        />
      </div>
    </div>
  );

  return (
    <ResponsiveLayout
      sidebar={null} // No nested sidebar needed here
      main={mainContent}
      inspector={inspectorContent}
      showInspector={showInspector && !!selectedConversation}
      onToggleInspector={() => setShowInspector(!showInspector)}
    />
  );
};
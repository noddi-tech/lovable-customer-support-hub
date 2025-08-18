import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { NewConversationList } from './NewConversationList';
import { ConversationView } from './ConversationView';
import { Inspector } from '@/components/layout';
import { Conversation } from '@/services/conversationsService';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export const NewDashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showInspector, setShowInspector] = useState(false);

  const conversationIdFromUrl = searchParams.get('conversation');
  const selectedInboxId = localStorage.getItem('selectedInboxId') || 'all';

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setShowInspector(true);
    
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

  return (
    <div className="flex h-full">
      {/* Main conversation list */}
      <div className="flex-1 min-w-0">
        <NewConversationList
          selectedConversation={selectedConversation}
          onConversationSelect={handleConversationSelect}
          inboxId={selectedInboxId}
        />
      </div>

      {/* Inspector with conversation view */}
      {showInspector && selectedConversation && (
        <Inspector className="w-96 border-l">
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
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
        </Inspector>
      )}
    </div>
  );
};
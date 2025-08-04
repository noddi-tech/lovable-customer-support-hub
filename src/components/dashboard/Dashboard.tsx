import React, { useState } from 'react';
import { Header } from './Header';
import { InboxSidebar } from './InboxSidebar';
import { ConversationList } from './ConversationList';
import { ConversationView } from './ConversationView';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

type ConversationStatus = "open" | "pending" | "resolved" | "closed";
type ConversationPriority = "low" | "normal" | "high" | "urgent";
type ConversationChannel = "email" | "chat" | "phone" | "social";

interface Conversation {
  id: string;
  subject: string;
  status: ConversationStatus;
  priority: ConversationPriority;
  is_read: boolean;
  channel: ConversationChannel;
  updated_at: string;
  customer?: {
    id: string;
    full_name: string;
    email: string;
  };
  assigned_to?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

export const Dashboard: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showConversationList, setShowConversationList] = useState(true);
  const isMobile = useIsMobile();

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    if (isMobile) {
      setShowConversationList(false);
    }
  };

  const handleBackToList = () => {
    if (isMobile) {
      setShowConversationList(true);
    }
  };

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <div className={`
        ${isMobile ? 'fixed left-0 top-0 bottom-0 z-50 transform transition-transform' : ''}
        ${isMobile && !showSidebar ? '-translate-x-full' : 'translate-x-0'}
        w-64 border-r border-border bg-card
      `}>
        <InboxSidebar 
          selectedTab={selectedTab} 
          onTabChange={setSelectedTab}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobile && showSidebar && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversation List */}
        <div className={`
          ${isMobile ? (showConversationList ? 'flex' : 'hidden') : 'flex'}
          w-96 border-r border-border bg-background flex-col
        `}>
          <ConversationList 
            selectedTab={selectedTab}
            selectedConversation={selectedConversation}
            onSelectConversation={handleSelectConversation}
          />
        </div>
        
        {/* Conversation View */}
        <div className={`
          ${isMobile ? (showConversationList ? 'hidden' : 'flex') : 'flex'}
          flex-1 flex-col bg-background
        `}>
          {/* Mobile Header */}
          {isMobile && (
            <div className="p-4 border-b border-border bg-card flex items-center">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleBackToList}
                className="mr-2"
              >
                ← Back
              </Button>
              <h1 className="font-semibold">Noddi Support</h1>
            </div>
          )}

          <ConversationView 
            conversationId={selectedConversation?.id || null}
          />
        </div>
      </div>
    </div>
  );
};
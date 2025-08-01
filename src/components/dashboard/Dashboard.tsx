import React, { useState } from 'react';
import { Header } from './Header';
import { InboxSidebar } from './InboxSidebar';
import { ConversationList } from './ConversationList';
import { ConversationView } from './ConversationView';

export const Dashboard: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedConversation, setSelectedConversation] = useState<string>('1');

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header organizationName="Noddi Support" />
      <div className="flex-1 flex overflow-hidden">
        <InboxSidebar selectedTab={selectedTab} onTabChange={setSelectedTab} />
        <ConversationList 
          conversations={[]} 
          selectedConversation={selectedConversation}
          onSelectConversation={setSelectedConversation}
        />
        <ConversationView conversationId={selectedConversation} />
      </div>
    </div>
  );
};
import React, { useState } from 'react';
import { Header } from './Header';
import { InboxSidebar } from './InboxSidebar';
import { ConversationList } from './ConversationList';
import { ConversationView } from './ConversationView';
import { useIsMobile } from '@/hooks/use-mobile';

export const Dashboard: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedConversation, setSelectedConversation] = useState<string>('1');
  const [showSidebar, setShowSidebar] = useState(false);
  const [showConversationList, setShowConversationList] = useState(true);
  const isMobile = useIsMobile();
  const isTablet = window.innerWidth <= 1024;

  const handleSelectConversation = (id: string) => {
    setSelectedConversation(id);
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
    <div className="h-screen flex flex-col bg-background">
      <Header 
        organizationName="Noddi Support" 
        onMenuClick={() => setShowSidebar(!showSidebar)}
        showMenuButton={isMobile}
        onBackClick={isMobile && !showConversationList ? handleBackToList : undefined}
      />
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Sidebar Overlay */}
        {isMobile && showSidebar && (
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowSidebar(false)}
          />
        )}
        
        {/* Sidebar */}
        <div className={`
          ${isMobile ? 'fixed left-0 top-16 bottom-0 z-50 transform transition-transform' : ''}
          ${isMobile && !showSidebar ? '-translate-x-full' : 'translate-x-0'}
          ${!isMobile && isTablet ? 'w-16' : !isMobile ? 'w-64' : 'w-64'}
        `}>
          <InboxSidebar 
            selectedTab={selectedTab} 
            onTabChange={setSelectedTab}
          />
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Conversation List */}
          <div className={`
            ${isMobile ? (showConversationList ? 'flex' : 'hidden') : 'flex'}
            ${isTablet && !isMobile ? 'w-80' : 'w-96'}
            flex-col
          `}>
            <ConversationList 
              conversations={[]} 
              selectedConversation={selectedConversation}
              onSelectConversation={handleSelectConversation}
            />
          </div>
          
          {/* Conversation View */}
          <div className={`
            ${isMobile ? (showConversationList ? 'hidden' : 'flex') : 'flex'}
            flex-1 flex-col
          `}>
            <ConversationView 
              conversationId={selectedConversation}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
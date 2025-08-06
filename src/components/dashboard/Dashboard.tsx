import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Header } from './Header';
import { InboxSidebar } from './InboxSidebar';
import { ConversationList } from './ConversationList';
import { NotificationsList } from '@/components/notifications/NotificationsList';
import { ConversationView } from './ConversationView';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  const [searchParams] = useSearchParams();
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showConversationList, setShowConversationList] = useState(true);
  const isMobile = useIsMobile();

  // Get conversation ID from URL parameters
  const conversationIdFromUrl = searchParams.get('conversation');
  const messageIdFromUrl = searchParams.get('message');

  // Fetch specific conversation if conversation ID is in URL
  const { data: urlConversation } = useQuery({
    queryKey: ['conversation', conversationIdFromUrl],
    queryFn: async () => {
      if (!conversationIdFromUrl) return null;
      
      const { data, error } = await supabase.rpc('get_conversations');
      if (error) throw error;
      
      const foundConversation = data?.find((conv: any) => conv.id === conversationIdFromUrl);
      
      if (!foundConversation) return null;
      
      // Transform the API response to match our Conversation interface
      return {
        id: foundConversation.id,
        subject: foundConversation.subject || 'Untitled Conversation',
        status: foundConversation.status as ConversationStatus,
        priority: foundConversation.priority as ConversationPriority,
        is_read: foundConversation.is_read,
        channel: foundConversation.channel as ConversationChannel,
        updated_at: foundConversation.updated_at,
        customer: foundConversation.customer ? {
          id: (foundConversation.customer as any).id,
          full_name: (foundConversation.customer as any).full_name,
          email: (foundConversation.customer as any).email,
        } : undefined,
        assigned_to: foundConversation.assigned_to ? {
          id: (foundConversation.assigned_to as any).id,
          full_name: (foundConversation.assigned_to as any).full_name,
          avatar_url: (foundConversation.assigned_to as any).avatar_url,
        } : undefined,
      } as Conversation;
    },
    enabled: !!conversationIdFromUrl,
  });

  // Effect to auto-select conversation from URL and switch away from notifications
  useEffect(() => {
    // If there's a conversation ID in the URL, we should be in conversation view, not notifications
    if (conversationIdFromUrl) {
      // Always switch away from notifications if we have a conversation ID
      if (selectedTab === 'notifications') {
        setSelectedTab('all');
      }
      
      // Set the conversation if we have it loaded
      if (urlConversation && (!selectedConversation || selectedConversation.id !== urlConversation.id)) {
        setSelectedConversation(urlConversation);
        if (isMobile) {
          setShowConversationList(false);
        }
      }
    }
  }, [conversationIdFromUrl, urlConversation, selectedConversation, selectedTab, isMobile]);

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    if (isMobile) {
      setShowConversationList(false);
    }
  };

  const handleTabChange = (tab: string) => {
    console.log('Dashboard handleTabChange called with:', tab);
    console.log('Current selectedTab before change:', selectedTab);
    setSelectedTab(tab);
    console.log('setSelectedTab called, new tab should be:', tab);
  };

  const handleBackToList = () => {
    if (isMobile) {
      setShowConversationList(true);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-surface">
      {/* Header */}
      <Header 
        organizationName="Noddi Support"
        showMenuButton={isMobile}
        onMenuClick={() => setShowSidebar(!showSidebar)}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex bg-gradient-surface">
        {/* Sidebar */}
      <div className={`
        ${isMobile ? 'fixed left-0 top-0 bottom-0 z-50 transform transition-transform' : ''}
        ${isMobile && !showSidebar ? '-translate-x-full' : 'translate-x-0'}
        w-64 border-r border-border bg-card/80 backdrop-blur-sm shadow-surface
      `}>
        <InboxSidebar 
          selectedTab={selectedTab} 
          onTabChange={handleTabChange}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobile && showSidebar && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setShowSidebar(false)}
        />
      )}

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
        {/* Show Notifications List if notifications tab is selected */}
        {selectedTab === 'notifications' ? (
          <div className="flex-1 flex flex-col bg-gradient-surface">
            {/* Mobile Header */}
            {isMobile && (
              <div className="p-4 border-b border-border bg-card/80 backdrop-blur-sm shadow-surface flex items-center">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedTab('all')}
                  className="mr-2"
                >
                  ← Back
                </Button>
                <h1 className="font-semibold">Notifications</h1>
              </div>
            )}
            <NotificationsList />
          </div>
        ) : (
          <>
            {/* Conversation List */}
            <div className={`
              ${isMobile ? (showConversationList ? 'flex' : 'hidden') : 'flex'}
              w-96 border-r border-border bg-gradient-surface flex-col
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
              flex-1 flex-col bg-gradient-surface
            `}>
              {/* Mobile Header */}
              {isMobile && (
                <div className="p-4 border-b border-border bg-card/80 backdrop-blur-sm shadow-surface flex items-center">
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
          </>
        )}
        </div>
      </div>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Header } from './Header';
import { InboxSidebar } from './InboxSidebar';
import { ConversationList } from './ConversationList';
import { NotificationsList } from '@/components/notifications/NotificationsList';
import { ConversationView } from './ConversationView';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showConversationList, setShowConversationList] = useState(true);
  const [selectedInboxId, setSelectedInboxId] = useState<string>(() => localStorage.getItem('selectedInboxId') || 'all');
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  // Fetch inboxes to resolve selected inbox name
  const { data: inboxes = [] } = useQuery({
    queryKey: ['inboxes'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_inboxes');
      if (error) throw error;
      return data as any[];
    },
  });

  const selectedInboxName = selectedInboxId === 'all'
    ? 'All Inboxes'
    : (inboxes.find((i: any) => i.id === selectedInboxId)?.name || 'Inbox');

// Sync header inbox selector with sidebar inbox selection
useEffect(() => {
  if (selectedTab.startsWith('inbox-')) {
    setSelectedInboxId(selectedTab.replace('inbox-', ''));
  } else if (selectedTab === 'all') {
    setSelectedInboxId('all');
  }
}, [selectedTab]);

// Persist inbox selection
useEffect(() => {
  if (selectedInboxId) {
    localStorage.setItem('selectedInboxId', selectedInboxId);
  }
}, [selectedInboxId]);

  const markConversationRead = async (id: string) => {
    try {
      await supabase.from('conversations').update({ is_read: true }).eq('id', id);
    } catch (e) {
      console.error('Failed to mark conversation read:', e);
    } finally {
      queryClient.setQueryData(['conversations'], (old: any) =>
        Array.isArray(old) ? old.map((c: any) => (c.id === id ? { ...c, is_read: true } : c)) : old
      );
      queryClient.setQueryData(['conversation', id], (old: any) => (old ? { ...old, is_read: true } : old));
      queryClient.invalidateQueries({ queryKey: ['conversation-counts'] });
    }
  };

  // Get conversation ID from URL parameters
  const conversationIdFromUrl = searchParams.get('conversation');
  const messageIdFromUrl = searchParams.get('message');
  const hasTimestamp = searchParams.get('t');

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
    if (conversationIdFromUrl && hasTimestamp) {
      // This indicates we just clicked "View" from notifications, so switch to conversation view
      if (selectedTab === 'notifications') {
        console.log('Auto-switching from notifications to conversation view due to View button click');
        setSelectedTab('all');
      }
      
      // Set the conversation if we have it loaded
      if (urlConversation && (!selectedConversation || selectedConversation.id !== urlConversation.id)) {
        setSelectedConversation(urlConversation);
        if (isMobile) {
          setShowConversationList(false);
        }
      }
    } else if (conversationIdFromUrl && urlConversation) {
      // Just set the conversation without forcing tab change (manual navigation)
      if (!selectedConversation || selectedConversation.id !== urlConversation.id) {
        setSelectedConversation(urlConversation);
        if (isMobile) {
          setShowConversationList(false);
        }
      }
    }
  }, [conversationIdFromUrl, urlConversation?.id, selectedConversation?.id, selectedTab, isMobile, hasTimestamp]);

  const handleSelectConversation = (conversation: Conversation) => {
    console.log('handleSelectConversation called with:', conversation.id);

    // If a different conversation was open and unread, mark it as read on exit
    if (
      selectedConversation &&
      !selectedConversation.is_read &&
      selectedConversation.id !== conversation.id
    ) {
      void markConversationRead(selectedConversation.id);
    }

    // Now select the new conversation without marking it read yet
    setSelectedConversation(conversation);

    // Update URL to reflect the selected conversation
    navigate(`/?conversation=${conversation.id}`, { replace: true });
    
    if (isMobile) {
      setShowConversationList(false);
    }
  };

  const handleTabChange = (tab: string) => {
    console.log('Dashboard handleTabChange called with:', tab);
    console.log('Current selectedTab before change:', selectedTab);
    
    // If manually switching to notifications, clear URL parameters to avoid conflicts
    if (tab === 'notifications') {
      console.log('Manually switching to notifications, clearing URL parameters');
      navigate('/', { replace: true });
    }
    
    setSelectedTab(tab);
    console.log('setSelectedTab called, new tab should be:', tab);
  };

  const handleBackToList = () => {
    if (selectedConversation && !selectedConversation.is_read) {
      void markConversationRead(selectedConversation.id);
      setSelectedConversation({ ...selectedConversation, is_read: true });
    }
    if (isMobile) {
      setShowConversationList(true);
    }
  };

  // Debug logging
  console.log('Dashboard render - selectedTab:', selectedTab, 'conversationIdFromUrl:', conversationIdFromUrl, 'hasTimestamp:', !!hasTimestamp);
  return (
    <div className="h-screen flex flex-col bg-gradient-surface">
      {/* Header */}
      <Header 
        organizationName={selectedInboxName}
        showMenuButton={isMobile}
        onMenuClick={() => setShowSidebar(!showSidebar)}
        selectedInboxId={selectedInboxId}
        onInboxChange={(id) => setSelectedInboxId(id)}
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
                selectedInboxId={selectedInboxId}
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
                  <h1 className="font-semibold">{selectedInboxName}</h1>
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
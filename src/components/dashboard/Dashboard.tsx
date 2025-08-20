import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { InboxSidebar } from './InboxSidebar';
import { ConversationList } from './ConversationList';
import { NotificationsList } from '@/components/notifications/NotificationsList';
import { ConversationView } from './ConversationView';
import { Button } from '@/components/ui/button';
import { ResponsiveLayout } from '@/components/ui/responsive-layout';
import { MobileDrawer } from '@/components/ui/mobile-drawer';
import { BottomTabs, type BottomTabItem } from '@/components/ui/bottom-tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Megaphone, Settings, Wrench, Menu, Info } from 'lucide-react';

type ConversationStatus = "open" | "pending" | "resolved" | "closed";
type ConversationPriority = "low" | "normal" | "high" | "urgent";
type ConversationChannel = "email" | "chat" | "social";

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
  // Safely access search params - handle case where router context might not be ready
  let searchParams: URLSearchParams;
  let navigate: (path: string, options?: any) => void;
  
  try {
    const [params] = useSearchParams();
    searchParams = params;
    navigate = useNavigate();
  } catch (error) {
    // Fallback when router context is not available
    console.warn('Router context not available, using fallback');
    searchParams = new URLSearchParams(window.location.search);
    navigate = (path: string) => {
      window.history.pushState({}, '', path);
    };
  }
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showConversationList, setShowConversationList] = useState(true);
  const [showConversationListDesktop, setShowConversationListDesktop] = useState<boolean>(() => {
    const saved = localStorage.getItem('showConversationListDesktop');
    return saved ? JSON.parse(saved) : true;
  });
  const [showRightDrawer, setShowRightDrawer] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState('interactions');
  const [selectedInboxId, setSelectedInboxId] = useState<string>(() => localStorage.getItem('selectedInboxId') || 'all');
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

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

// Persist desktop conversation list state
useEffect(() => {
  localStorage.setItem('showConversationListDesktop', JSON.stringify(showConversationListDesktop));
}, [showConversationListDesktop]);

// Track viewport width for responsive panel management
useEffect(() => {
  const handleResize = () => {
    setViewportWidth(window.innerWidth);
  };
  
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);

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

  const handleBackToList = () => {
    if (selectedConversation && !selectedConversation.is_read) {
      void markConversationRead(selectedConversation.id);
      setSelectedConversation({ ...selectedConversation, is_read: true });
    }
    if (isMobile) {
      setShowConversationList(true);
    }
    // Clear selected conversation and navigate to clean URL
    setSelectedConversation(null);
    navigate('/', { replace: true });
  };

// Keyboard shortcut for toggling conversation list and back navigation
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    // Toggle conversation list with Ctrl+Shift+L
    if (event.ctrlKey && event.shiftKey && event.key === 'L' && !isMobile) {
      event.preventDefault();
      setShowConversationListDesktop(prev => !prev);
    }
    // Back to inbox with Escape key
    if (event.key === 'Escape' && selectedConversation) {
      event.preventDefault();
      handleBackToList();
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [isMobile, selectedConversation, handleBackToList]);

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
        } else {
          setShowConversationListDesktop(false);
        }
      }
    } else if (conversationIdFromUrl && urlConversation) {
      // Just set the conversation without forcing tab change (manual navigation)
      if (!selectedConversation || selectedConversation.id !== urlConversation.id) {
        setSelectedConversation(urlConversation);
        if (isMobile) {
          setShowConversationList(false);
        } else {
          setShowConversationListDesktop(false);
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
    } else {
      // Auto-collapse conversation list on desktop when selecting a conversation
      // But only on smaller screens to prevent content overflow
      if (viewportWidth < 1400) {
        setShowConversationListDesktop(false);
      }
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

  // Bottom tab items for mobile
  const bottomTabItems: BottomTabItem[] = [
    {
      id: 'interactions',
      label: t('dashboard.bottomTabs.interactions'),
      icon: MessageCircle,
    },
    {
      id: 'marketing',
      label: t('dashboard.bottomTabs.marketing'),
      icon: Megaphone,
    },
    {
      id: 'ops',
      label: t('dashboard.bottomTabs.ops'),
      icon: Wrench,
    },
    {
      id: 'settings',
      label: t('dashboard.bottomTabs.settings'),
      icon: Settings,
    },
  ];

  // Debug logging
  console.log('Dashboard render - selectedTab:', selectedTab, 'conversationIdFromUrl:', conversationIdFromUrl, 'hasTimestamp:', !!hasTimestamp);
  
  return (
    <ResponsiveLayout
      header={
        <Header 
          organizationName={selectedInboxName}
          showMenuButton={isMobile}
          onMenuClick={() => setShowSidebar(!showSidebar)}
          selectedInboxId={selectedInboxId}
          onInboxChange={(id) => setSelectedInboxId(id)}
          showConversationList={isMobile ? showConversationList : showConversationListDesktop}
          onToggleConversationList={() => {
            if (isMobile) {
              setShowConversationList(!showConversationList);
            } else {
              const newValue = !showConversationListDesktop;
              setShowConversationListDesktop(newValue);
              localStorage.setItem('showConversationListDesktop', JSON.stringify(newValue));
            }
          }}
          selectedConversation={selectedConversation}
        />
      }
      className={`bg-gradient-surface ${!isMobile ? (showConversationListDesktop ? 'list-expanded' : 'list-collapsed') : ''}`}
      sidebar={!isMobile ? (
        <InboxSidebar 
          selectedTab={selectedTab} 
          onTabChange={handleTabChange}
          selectedInboxId={selectedInboxId}
        />
      ) : undefined}
      leftDrawer={
        <MobileDrawer
          isOpen={showSidebar}
          onClose={() => setShowSidebar(false)}
          side="left"
          title={t('dashboard.navigation.menu')}
        >
          <InboxSidebar 
            selectedTab={selectedTab} 
            onTabChange={(tab) => {
              handleTabChange(tab);
              setShowSidebar(false);
            }}
            selectedInboxId={selectedInboxId}
          />
        </MobileDrawer>
      }
      rightDrawer={
        <MobileDrawer
          isOpen={showRightDrawer}
          onClose={() => setShowRightDrawer(false)}
          side="right"
          title={t('dashboard.customerInfo.title', 'Customer Info')}
        >
          <div className="p-4">
            <p className="text-muted-foreground">
              {t('dashboard.customerInfo.placeholder', 'Customer details and actions will appear here.')}
            </p>
          </div>
        </MobileDrawer>
      }
      bottomTabs={
        <BottomTabs
          items={bottomTabItems}
          activeTab={activeBottomTab}
          onTabChange={setActiveBottomTab}
        />
      }
    >
      {/* Show Notifications List if notifications tab is selected */}
      {selectedTab === 'notifications' ? (
        <div className="detail-pane flex flex-col bg-gradient-surface">
          {/* Mobile Header */}
          {isMobile && (
            <div className="flex-shrink-0 p-4 border-b border-border bg-card/80 backdrop-blur-sm shadow-surface flex items-center">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedTab('all')}
                className="mr-2"
              >
                {t('dashboard.navigation.back')}
              </Button>
              <h1 className="font-semibold">{t('dashboard.navigation.notifications')}</h1>
            </div>
          )}
          <div className="flex-1 min-h-0 overflow-y-auto -webkit-overflow-scrolling-touch">
            <NotificationsList />
          </div>
        </div>
      ) : (
        <>
          {/* Conversation List - as direct grid item */}
          <div className={`
            ${isMobile 
              ? (showConversationList ? 'flex w-full' : 'hidden') 
              : showConversationListDesktop ? 'list-pane' : 'list-pane-collapsed'
            }
            flex flex-col bg-gradient-surface
          `}>
            <ConversationList 
              selectedTab={selectedTab}
              selectedConversation={selectedConversation}
              onSelectConversation={handleSelectConversation}
              selectedInboxId={selectedInboxId}
              isCollapsed={!isMobile && !showConversationListDesktop}
              onToggleCollapse={() => setShowConversationListDesktop(!showConversationListDesktop)}
            />
          </div>
          
          {/* Conversation View - as direct grid item */}
          <div className={`
            ${isMobile ? (showConversationList ? 'hidden' : 'flex w-full') : 'detail-pane'}
            flex flex-col bg-gradient-surface
          `}>
            {/* Mobile Header */}
            {isMobile && (
              <div className="flex-shrink-0 p-4 border-b border-border bg-card/80 backdrop-blur-sm shadow-surface flex items-center justify-between">
                <div className="flex items-center">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleBackToList}
                    className="mr-2"
                  >
                    {t('dashboard.navigation.back')}
                  </Button>
                  <h1 className="font-semibold ellipsis">{selectedInboxName}</h1>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowRightDrawer(true)}
                  className="p-2"
                >
                  <Info className="h-4 w-4" />
                </Button>
              </div>
            )}

            <ConversationView 
              conversationId={selectedConversation?.id || null}
            />
          </div>
        </>
      )}
    </ResponsiveLayout>
  );
};
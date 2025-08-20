import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { InboxSidebar } from './InboxSidebar';
import { AppSidebar } from './AppSidebar';
import { ConversationList } from './ConversationList';
import { ConversationView } from './ConversationView';
import { Button } from '@/components/ui/button';
import { ResponsiveLayout } from '@/components/ui/responsive-layout';
import { MobileDrawer } from '@/components/ui/mobile-drawer';
import { BottomTabs, type BottomTabItem } from '@/components/ui/bottom-tabs';
import { useIsMobile, useIsTablet, useIsDesktop } from '@/hooks/use-responsive';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { MessageCircle as MessageCircleIcon, Megaphone, Settings, Wrench, Menu, Info } from 'lucide-react';

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
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();
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

  // Effect to auto-select conversation from URL  
  useEffect(() => {
    if (conversationIdFromUrl && urlConversation) {
      // Set the conversation
      if (!selectedConversation || selectedConversation.id !== urlConversation.id) {
        setSelectedConversation(urlConversation);
        if (isMobile) {
          setShowConversationList(false);
        } else {
          setShowConversationListDesktop(false);
        }
      }
    }
  }, [conversationIdFromUrl, urlConversation?.id, selectedConversation?.id, isMobile]);

  const handleSelectConversation = (conversation: Conversation) => {
    console.log('Selected conversation:', conversation.id);
    // Mark previous conversation as read when selecting a new one
    if (selectedConversation && selectedConversation.id !== conversation.id) {
      markConversationRead(selectedConversation.id);
    }
    
    setSelectedConversation(conversation);
    navigate(`?conversation=${conversation.id}`, { replace: true });
    
    // Hide conversation list when selecting on mobile or tablet
    if (isMobile) {
      setShowConversationList(false);
    } else if (isTablet) {
      setShowConversationListDesktop(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setSelectedTab(tab);
  };

  // Bottom tab items for mobile
  const bottomTabItems: BottomTabItem[] = [
    {
      id: 'interactions',
      label: t('dashboard.bottomTabs.interactions'),
      icon: MessageCircleIcon,
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
  console.log('Dashboard render - selectedTab:', selectedTab, 'conversationIdFromUrl:', conversationIdFromUrl);
  
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <ResponsiveLayout
          header={
            <div className="flex items-center">
              {!isMobile && <SidebarTrigger className="mr-4" />}
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
            </div>
          }
          className={cn(
            "bg-gradient-surface",
            !isMobile && (showConversationListDesktop ? 'list-expanded' : 'list-collapsed'),
            isMobile && "has-bottom-tabs"
          )}
          sidebar={!isMobile ? (
            <AppSidebar 
              selectedTab={selectedTab}
              onTabChange={handleTabChange}
              selectedInboxId={selectedInboxId}
              context="text"
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
          {/* Mobile Conversation List - shown as full screen on mobile */}
          {isMobile && showConversationList && (
            <div className="flex flex-col bg-gradient-surface h-full">
              <ConversationList 
                selectedTab={selectedTab}
                selectedConversation={selectedConversation}
                onSelectConversation={handleSelectConversation}
                selectedInboxId={selectedInboxId}
                onToggleCollapse={() => setShowConversationList(false)}
              />
            </div>
          )}
          
          {/* Conversation List - Desktop/Tablet grid item */}
          {!isMobile && showConversationListDesktop && (
            <div className="list-pane">
              <ConversationList 
                selectedTab={selectedTab}
                selectedConversation={selectedConversation}
                onSelectConversation={handleSelectConversation}
                selectedInboxId={selectedInboxId}
                onToggleCollapse={() => setShowConversationListDesktop(!showConversationListDesktop)}
              />
            </div>
          )}
          
          {/* Conversation View - Main content area */}
          {(!isMobile || !showConversationList) && (
            <div className={cn(
              "flex flex-col bg-gradient-surface",
              isMobile ? "w-full" : "detail-pane"
            )}>
              {/* Mobile Back Button */}
              {isMobile && selectedConversation && (
                <div className="flex-shrink-0 p-4 border-b border-border bg-card/80 backdrop-blur-sm shadow-surface flex items-center justify-between">
                  <div className="flex items-center">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setSelectedConversation(null);
                        navigate('/', { replace: true });
                        setShowConversationList(true);
                      }}
                      className="mr-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h2 className="font-semibold text-lg ellipsis">
                      {selectedConversation.subject}
                    </h2>
                  </div>
                </div>
              )}
              
              {/* Conversation Content */}
              {selectedConversation ? (
                <ConversationView conversationId={selectedConversation.id} />
              ) : (
                <div className="flex-1 flex items-center justify-center text-center p-8">
                  <div className="max-w-md">
                    <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-2">{t('dashboard.conversationView.noConversationSelected')}</h3>
                    <p className="text-muted-foreground">{t('dashboard.conversationView.selectConversationToStart')}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </ResponsiveLayout>
      </div>
    </SidebarProvider>
  );
};
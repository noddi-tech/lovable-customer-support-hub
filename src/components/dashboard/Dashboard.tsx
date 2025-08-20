import React, { useState, useEffect, useCallback } from 'react';
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
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { useFocusManagement, useAriaLiveRegion } from '@/hooks/use-focus-management';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LayoutDebugger } from '@/components/debug/LayoutDebugger';

import { MessageCircle as MessageCircleIcon, Megaphone, Settings, Wrench } from 'lucide-react';

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

export const Dashboard = () => {
  // Use hooks properly - no try-catch around hooks
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get conversation ID from URL
  const conversationIdFromUrl = searchParams.get('conversation');
  
  // State management
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showConversationList, setShowConversationList] = useState(true);
  const [showConversationListDesktop, setShowConversationListDesktop] = useState(true); // Default to true
  const [showRightDrawer, setShowRightDrawer] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState('interactions');
  const [selectedInboxId, setSelectedInboxId] = useState('all');
  
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { saveFocus, restoreFocus, focusFirstFocusableElement } = useFocusManagement();
  const { announce } = useAriaLiveRegion();

  // Load saved preferences once on mount - with debugging and reset bad values
  useEffect(() => {
    console.log('Loading localStorage preferences...');
    const savedConversationListDesktop = localStorage.getItem('showConversationListDesktop');
    const savedInboxId = localStorage.getItem('selectedInboxId');
    
    console.log('Raw localStorage values:', { savedConversationListDesktop, savedInboxId });
    
    // Clear any false values that hide conversation list on desktop - this is likely the bug
    if (savedConversationListDesktop === 'false') {
      console.log('Clearing problematic localStorage value that hides conversation list');
      localStorage.removeItem('showConversationListDesktop');
      setShowConversationListDesktop(true); // Force to true on desktop
    } else if (savedConversationListDesktop !== null) {
      const parsed = JSON.parse(savedConversationListDesktop);
      console.log('Setting showConversationListDesktop to:', parsed);
      setShowConversationListDesktop(parsed);
    }
    
    if (savedInboxId) {
      console.log('Setting selectedInboxId to:', savedInboxId);
      setSelectedInboxId(savedInboxId);
    }
  }, []);

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

  // Handle tab changes
  const handleTabChange = useCallback((tab: string) => {
    console.log('Changing tab to:', tab);
    setSelectedTab(tab);
    
    // Save inbox selection to localStorage when switching to inbox tabs
    if (tab.startsWith('inbox-')) {
      const inboxId = tab.replace('inbox-', '');
      setSelectedInboxId(inboxId);
      localStorage.setItem('selectedInboxId', inboxId);
    } else if (tab === 'all') {
      setSelectedInboxId('all');
      localStorage.setItem('selectedInboxId', 'all');
    }
    
    // Clear conversation selection when changing tabs
    setSelectedConversation(null);
    
    // Update URL to remove conversation parameter
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('conversation');
    setSearchParams(newParams, { replace: true });
    
    // Show conversation list on mobile when changing tabs
    if (isMobile) {
      setShowConversationList(true);
    }
  }, [searchParams, setSearchParams, isMobile]);

  // Handle conversation selection
  const handleSelectConversation = useCallback((conversation: Conversation) => {
    console.log('Selecting conversation:', conversation.id);
    setSelectedConversation(conversation);
    
    // Update URL with conversation ID
    const newParams = new URLSearchParams(searchParams);
    newParams.set('conversation', conversation.id);
    setSearchParams(newParams, { replace: true });
    
    // On mobile, hide conversation list when selecting a conversation
    if (isMobile) {
      setShowConversationList(false);
    }
    
    // Mark conversation as read (simplified for now)
    // This should ideally be handled by the ConversationView component
  }, [searchParams, setSearchParams, isMobile]);

  // Bottom tab items for mobile
  const bottomTabItems: BottomTabItem[] = [
    {
      id: 'interactions',
      label: 'Interactions',
      icon: MessageCircleIcon,
    },
    {
      id: 'marketing',
      label: 'Marketing',
      icon: Megaphone,
    },
    {
      id: 'ops',
      label: 'Ops',
      icon: Wrench,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
    },
  ];

  // Debug logging
  console.log('Dashboard render - selectedTab:', selectedTab, 'conversationIdFromUrl:', conversationIdFromUrl);
  console.log('Layout state - showConversationListDesktop:', showConversationListDesktop, 'isMobile:', isMobile);
  
  const layoutClassName = cn(
    "bg-gradient-surface",
    !isMobile && (showConversationListDesktop ? 'list-expanded' : 'list-collapsed'),
    isMobile && "has-bottom-tabs"
  );
  
  console.log('Layout className:', layoutClassName);
  
  return (
    <div className="h-full">
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
                const newValue = !showConversationList;
                setShowConversationList(newValue);
                announce(newValue ? 'Conversation list opened' : 'Conversation list closed');
              } else {
                const newValue = !showConversationListDesktop;
                setShowConversationListDesktop(newValue);
                localStorage.setItem('showConversationListDesktop', JSON.stringify(newValue));
                announce(newValue ? 'Conversation list expanded' : 'Conversation list collapsed');
              }
            }}
            selectedConversation={selectedConversation}
          />
        }
        className={layoutClassName}
        leftDrawer={
          <MobileDrawer
            isOpen={showSidebar}
            onClose={() => setShowSidebar(false)}
            side="left"
            title="Menu"
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
            title="Customer Info"
          >
            <div className="p-4">
              <p className="text-muted-foreground">
                Customer details and actions will appear here.
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
                      announce('Returned to conversation list');
                      
                      // Focus the first conversation after returning
                      setTimeout(() => {
                        const firstConversation = document.querySelector('.conversation-item');
                        if (firstConversation) {
                          (firstConversation as HTMLElement).focus();
                        }
                      }, 100);
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
                  <h3 className="font-semibold text-lg mb-2">{t('dashboard.conversationView.noConversationSelected', 'No conversation selected')}</h3>
                  <p className="text-muted-foreground">{t('dashboard.conversationView.selectConversation', 'Select a conversation from the list to start viewing messages.')}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </ResponsiveLayout>
      
      {/* Debug components in development */}
      <LayoutDebugger 
        showConversationList={isMobile ? showConversationList : showConversationListDesktop}
        showSidebar={showSidebar}
        className={layoutClassName}
      />
    </div>
  );
};
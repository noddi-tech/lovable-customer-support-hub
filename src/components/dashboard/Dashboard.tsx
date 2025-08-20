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
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
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
    <SidebarProvider>
      <div className={cn("flex h-full w-full", layoutClassName)}>
        <AppSidebar 
          selectedTab={selectedTab}
          onTabChange={handleTabChange}
          selectedInboxId={selectedInboxId}
          context="text"
        />
        
        <SidebarInset className="flex-1">
          <div className="flex h-14 items-center border-b px-4">
            <SidebarTrigger className="mr-4" />
            <span className="font-medium">Text</span>
          </div>
          
          <ResponsiveLayout 
            className="flex-1"
          >
            <div className={cn(
              "flex flex-col bg-gradient-surface",
              isMobile ? "w-full" : "list-pane"
            )}>
              <ConversationList 
                selectedConversation={selectedConversation}
                onSelectConversation={handleSelectConversation}
                selectedInboxId={selectedInboxId}
                selectedTab={selectedTab}
              />
            </div>
            
            <div className={cn(
              "flex flex-col bg-gradient-surface",
              isMobile ? "w-full" : "detail-pane"
            )}>
              {selectedConversation ? (
                <ConversationView conversationId={selectedConversation.id} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <div className="max-w-md">
                    <h2 className="text-2xl font-semibold mb-4">{t('dashboard.conversationView.noConversationSelected', 'No conversation selected')}</h2>
                    <p className="text-muted-foreground">{t('dashboard.conversationView.selectConversation', 'Select a conversation from the list to start viewing messages.')}</p>
                  </div>
                </div>
              )}
            </div>
          </ResponsiveLayout>

          {/* Debug components in development */}
          <LayoutDebugger 
            showConversationList={isMobile ? showConversationList : showConversationListDesktop}
            showSidebar={showSidebar}
            className={layoutClassName}
          />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};
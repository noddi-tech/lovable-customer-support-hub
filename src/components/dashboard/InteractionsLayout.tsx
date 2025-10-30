import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, Sidebar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConversationList } from './ConversationList';
import { ConversationView } from './ConversationView';
import { VoiceInterface } from './VoiceInterface';
import { useIsMobile, useIsTablet, useIsDesktop } from '@/hooks/use-responsive';
import { useTranslation } from "react-i18next";
import { cn } from '@/lib/utils';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useResizablePanels } from '@/hooks/useResizablePanels';

// Define conversation types
type ConversationStatus = "open" | "pending" | "resolved" | "closed";
type ConversationPriority = "low" | "normal" | "high" | "urgent";
type ConversationChannel = "email" | "chat" | "social" | "facebook" | "instagram" | "whatsapp";

interface Customer {
  id: string;
  full_name: string;
  email: string;
}

interface Conversation {
  id: string;
  subject: string;
  status: ConversationStatus;
  priority: ConversationPriority;
  is_read: boolean;
  is_archived?: boolean;
  channel: ConversationChannel;
  updated_at: string;
  received_at?: string;
  inbox_id?: string;
  customer?: Customer;
  assigned_to?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  thread_ids?: string[];
  thread_count?: number;
  _fetchIds?: string | string[];
}

interface InteractionsLayoutProps {
  activeSubTab: string;
  selectedTab: string;
  onTabChange: (tab: string) => void;
  selectedInboxId: string;
}

export const InteractionsLayout: React.FC<InteractionsLayoutProps> = ({
  activeSubTab,
  selectedTab,
  onTabChange,
  selectedInboxId
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showConversationList, setShowConversationList] = useState(true);
  const [showConversationListDesktop, setShowConversationListDesktop] = useState(true);
  
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();
  const { t } = useTranslation();
  
  // Panel persistence with optimized proportions
  const { getPanelSize, updatePanelSize } = useResizablePanels({
    storageKey: 'interactions-layout',
    defaultSizes: {
      conversationList: isMobile ? 100 : isTablet ? 32 : 28,
      conversationView: isMobile ? 100 : isTablet ? 68 : 72
    },
    minSizes: {
      conversationList: isMobile ? 100 : 20,
      conversationView: isMobile ? 100 : 30
    },
    maxSizes: {
      conversationList: isMobile ? 100 : 60,
      conversationView: isMobile ? 100 : 80
    }
  });
  
  // Get conversation ID from URL (using 'c' parameter)
  const conversationIdFromUrl = searchParams.get('c');
  
  console.log('[EnhancedInteractionsLayout] URL conversation ID:', conversationIdFromUrl);

  // Fetch conversation metadata from URL
  const { data: urlConversation, isLoading: urlConvLoading } = useQuery({
    queryKey: ['conversation-from-url', conversationIdFromUrl],
    queryFn: async () => {
      if (!conversationIdFromUrl) return null;
      console.log('[EnhancedInteractionsLayout] Fetching conversation from URL:', conversationIdFromUrl);
      const { data, error } = await supabase
        .from('conversations')
        .select('*, customer:customers(*)')
        .eq('id', conversationIdFromUrl)
        .single();
      
      if (error) {
        console.error('[EnhancedInteractionsLayout] Error fetching URL conversation:', error);
        return null;
      }
      
      console.log('[EnhancedInteractionsLayout] Fetched URL conversation:', {
        id: data?.id,
        subject: data?.subject
      });
      
      return data;
    },
    enabled: !!conversationIdFromUrl && !selectedConversation,
    staleTime: 30_000,
  });

  // Sync URL conversation with state
  useEffect(() => {
    if (urlConversation && conversationIdFromUrl && !selectedConversation) {
      console.log('[EnhancedInteractionsLayout] Auto-selecting conversation from URL:', {
        conversationId: urlConversation.id,
        subject: urlConversation.subject,
        _fetchIds: urlConversation.id
      });
      
      setSelectedConversation({
        ...urlConversation,
        _fetchIds: urlConversation.id
      } as Conversation);
    }
  }, [urlConversation, conversationIdFromUrl, selectedConversation]);

  // Handle conversation selection
  const handleSelectConversation = useCallback((conversation: Conversation) => {
    // If this is a grouped thread, prepare to fetch from all thread IDs
    const conversationIdsToFetch = conversation.thread_ids && conversation.thread_ids.length > 1
      ? conversation.thread_ids
      : conversation.id;
    
    console.log('[EnhancedInteractionsLayout] Selected threaded conversation:', {
      conversationId: conversation.id,
      threadCount: conversation.thread_count,
      threadIds: conversation.thread_ids
    });
    
    setSelectedConversation({
      ...conversation,
      _fetchIds: conversationIdsToFetch
    });
    
    // Update URL with conversation ID (using 'c' parameter)
    const newParams = new URLSearchParams(searchParams);
    newParams.set('c', conversation.id);
    setSearchParams(newParams, { replace: true });
    
    // On mobile, hide conversation list when selecting a conversation
    if (isMobile) {
      setShowConversationList(false);
    }
  }, [searchParams, setSearchParams, isMobile]);

  // Handle conversation list toggle
  const handleToggleConversationList = useCallback(() => {
    if (isDesktop) {
      setShowConversationListDesktop(!showConversationListDesktop);
    } else {
      setShowConversationList(!showConversationList);
    }
  }, [isDesktop, showConversationList, showConversationListDesktop]);

  // Determine visibility logic
  const shouldShowConversationList = (() => {
    if (isMobile) {
      return !selectedConversation || showConversationList;
    }
    return showConversationListDesktop;
  })();

  // Render VoiceInterface if active sub-tab is 'voice'
  if (activeSubTab === 'voice') {
    return <VoiceInterface />;
  }

  // Responsive resizing settings
  const enableResizing = isDesktop || isTablet;

  if (isMobile) {
    // Mobile: Stack layout without resizing
    return (
      <div className="flex flex-col flex-1 min-h-0">
        {shouldShowConversationList ? (
          <div className="flex flex-col bg-card border-b border-border min-h-0 flex-1">
            <ConversationList 
              selectedConversation={selectedConversation}
              onSelectConversation={handleSelectConversation}
              selectedInboxId={selectedInboxId}
              selectedTab={selectedTab}
              onToggleCollapse={undefined}
            />
          </div>
        ) : (
          <div className="flex flex-col bg-background min-h-0 flex-1">
            {selectedConversation ? (
              <div className="flex-1 min-h-0">
                <ConversationView 
                  conversationId={selectedConversation.id}
                  conversationIds={selectedConversation._fetchIds}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-center p-8 bg-card m-4 rounded-lg">
                <MessageCircle className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {t('interactions.noConversationSelected')}
                </h3>
                <p className="text-muted-foreground max-w-md">
                  {t('interactions.selectConversationToStart')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0">
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Conversation List Panel */}
        {shouldShowConversationList && (
          <>
            <ResizablePanel 
              defaultSize={getPanelSize('conversationList')}
              minSize={getPanelSize('conversationList') < 100 ? 20 : 100}
              maxSize={getPanelSize('conversationList') < 100 ? 60 : 100}
              onResize={(size) => updatePanelSize('conversationList', size)}
              className="flex flex-col bg-card border-r border-border/30 min-h-0"
            >
              <ConversationList 
                selectedConversation={selectedConversation}
                onSelectConversation={handleSelectConversation}
                selectedInboxId={selectedInboxId}
                selectedTab={selectedTab}
                onToggleCollapse={isDesktop ? handleToggleConversationList : undefined}
              />
            </ResizablePanel>
            
            {enableResizing && <ResizableHandle withHandle />}
          </>
        )}
        
        {/* Conversation View Panel */}
        <ResizablePanel 
          className="flex flex-col bg-background min-h-0"
          minSize={shouldShowConversationList ? 25 : 100}
        >
          {/* Show/Hide Conversation List Button - Desktop only */}
          {isDesktop && !shouldShowConversationList && (
            <div className="p-4 border-b border-border bg-card">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleToggleConversationList}
                className="flex items-center gap-2"
              >
                <Sidebar className="h-4 w-4" />
                <span>Show Conversations</span>
              </Button>
            </div>
          )}
          
          {selectedConversation ? (
            <div className="flex-1 min-h-0">
              <ConversationView 
                conversationId={selectedConversation.id}
                conversationIds={selectedConversation._fetchIds}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-center p-8 bg-card m-4 rounded-lg">
              <MessageCircle className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t('interactions.noConversationSelected')}
              </h3>
              <p className="text-muted-foreground max-w-md">
                {t('interactions.selectConversationToStart')}
              </p>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};
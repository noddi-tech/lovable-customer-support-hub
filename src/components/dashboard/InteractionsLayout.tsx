import React, { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ConversationList } from './ConversationList';
import { ConversationView } from './ConversationView';
import { VoiceInterface } from './VoiceInterface';
import { Button } from '@/components/ui/button';
import { ResponsiveLayout } from '@/components/ui/responsive-layout';
import { useIsMobile, useIsTablet, useIsDesktop } from '@/hooks/use-responsive';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Sidebar } from 'lucide-react';

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
  
  // Get conversation ID from URL
  const conversationIdFromUrl = searchParams.get('conversation');

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
  }, [searchParams, setSearchParams, isMobile]);

  // Handle conversation list toggle
  const handleToggleConversationList = useCallback(() => {
    if (isDesktop) {
      const newValue = !showConversationListDesktop;
      setShowConversationListDesktop(newValue);
      localStorage.setItem('showConversationListDesktop', JSON.stringify(newValue));
    } else {
      setShowConversationList(!showConversationList);
    }
  }, [isDesktop, showConversationList, showConversationListDesktop]);

  // If voice interface is active, render it
  if (activeSubTab === 'voice') {
    return <VoiceInterface />;
  }

  // Text interface layout
  const shouldShowConversationList = isMobile ? showConversationList : showConversationListDesktop;
  
  // Debug logging
  console.log('=== InteractionsLayout Debug ===');
  console.log('activeSubTab:', activeSubTab);
  console.log('shouldShowConversationList:', shouldShowConversationList);
  console.log('selectedConversation:', selectedConversation);
  console.log('isMobile:', isMobile, 'isTablet:', isTablet, 'isDesktop:', isDesktop);
  
  return (
    <div className="h-full w-full flex bg-background" style={{ border: '2px solid red' }}>
      {/* Debug: Add visible border to container */}
      <ResponsiveLayout className="flex-1 min-h-0">
        {/* Conversation List */}
        {shouldShowConversationList && (
          <div 
            className={cn(
              "flex flex-col bg-card border-r border-border",
              isMobile ? "w-full" : "list-pane min-w-[380px] max-w-[420px]"
            )}
            style={{ border: '2px solid blue', minHeight: '400px' }}
          >
            <div className="p-2 bg-accent text-accent-foreground text-xs">
              DEBUG: ConversationList Container
            </div>
            <ConversationList 
              selectedConversation={selectedConversation}
              onSelectConversation={handleSelectConversation}
              selectedInboxId={selectedInboxId}
              selectedTab={selectedTab}
              onToggleCollapse={isDesktop ? handleToggleConversationList : undefined}
            />
          </div>
        )}
        
        {/* Conversation View */}
        <div 
          className={cn(
            "flex flex-col bg-card",
            isMobile ? "w-full" : "detail-pane flex-1"
          )}
          style={{ border: '2px solid green', minHeight: '400px' }}
        >
          <div className="p-2 bg-accent text-accent-foreground text-xs">
            DEBUG: ConversationView Container - Selected: {selectedConversation?.id || 'None'}
          </div>
          
          {/* Show/Hide Conversation List Button - Desktop only */}
          {isDesktop && !shouldShowConversationList && (
            <div className="p-2 border-b border-border">
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
            <ConversationView conversationId={selectedConversation.id} />
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-center p-8">
              <div className="max-w-md">
                <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h2 className="text-2xl font-semibold mb-4">
                  {t('interactions.noConversationSelected', 'No conversation selected')}
                </h2>
                <p className="text-muted-foreground">
                  {t('interactions.selectConversation', 'Select a conversation from the list to start viewing messages.')}
                </p>
              </div>
            </div>
          )}
        </div>
      </ResponsiveLayout>
    </div>
  );
};
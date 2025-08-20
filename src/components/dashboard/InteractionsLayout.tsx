import React, { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageCircle, Sidebar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConversationList } from './ConversationList';
import { ConversationView } from './ConversationView';
import { VoiceInterface } from './VoiceInterface';
import { useIsMobile, useIsTablet, useIsDesktop } from '@/hooks/use-responsive';
import { useTranslation } from "react-i18next";
import { cn } from '@/lib/utils';

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

  return (
    <div className="flex flex-1 min-h-0 bg-background">
      {/* Conversation List Pane */}
      {shouldShowConversationList && (
        <div className={cn(
          "flex flex-col bg-card border-r border-border min-h-0",
          isMobile ? "w-full" : "w-[400px] flex-shrink-0"
        )}>
          <ConversationList 
            selectedConversation={selectedConversation}
            onSelectConversation={handleSelectConversation}
            selectedInboxId={selectedInboxId}
            selectedTab={selectedTab}
            onToggleCollapse={isDesktop ? handleToggleConversationList : undefined}
          />
        </div>
      )}
      
      {/* Conversation View Pane */}
      <div className={cn(
        "flex flex-col bg-background min-h-0",
        isMobile ? "w-full" : "flex-1 min-w-0"
      )}>
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
            <ConversationView conversationId={selectedConversation.id} />
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
    </div>
  );
};
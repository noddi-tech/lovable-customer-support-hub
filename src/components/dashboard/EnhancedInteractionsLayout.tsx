import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageCircle, Sidebar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContentPane } from '@/components/ui/content-pane';
import { ConversationList } from './ConversationList';
import { ConversationView } from './ConversationView';
import { VoiceInterface } from './VoiceInterface';
import { OptimizedInteractionsSidebar } from './OptimizedInteractionsSidebar';
import { MobileSidebarDrawer } from './MobileSidebarDrawer';
import { useIsMobile, useIsTablet, useIsDesktop } from '@/hooks/use-responsive';
import { useTranslation } from "react-i18next";
import { ResponsiveFlex, ResponsiveContainer, AdaptiveSection } from '@/components/admin/design/components/layouts';

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

interface EnhancedInteractionsLayoutProps {
  activeSubTab: string;
  selectedTab: string;
  onTabChange: (tab: string) => void;
  selectedInboxId: string;
}

export const EnhancedInteractionsLayout: React.FC<EnhancedInteractionsLayoutProps> = ({
  activeSubTab,
  selectedTab,
  onTabChange,
  selectedInboxId
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  
  // Get conversation ID from URL
  const conversationIdFromUrl = searchParams.get('conversation');

  // Load conversation from URL when available
  useEffect(() => {
    if (conversationIdFromUrl && !selectedConversation) {
      // Create a mock conversation object from URL ID
      // In a real app, you'd fetch the conversation data
      const urlConversation: Conversation = {
        id: conversationIdFromUrl,
        subject: 'Conversation from URL',
        status: 'open',
        priority: 'normal',
        is_read: false,
        channel: 'email',
        updated_at: new Date().toISOString()
      };
      setSelectedConversation(urlConversation);
    }
  }, [conversationIdFromUrl, selectedConversation]);

  // Handle conversation selection
  const handleSelectConversation = useCallback((conversation: Conversation) => {
    console.log('Selecting conversation:', conversation.id);
    setSelectedConversation(conversation);
    
    // Update URL with conversation ID
    const newParams = new URLSearchParams(searchParams);
    newParams.set('conversation', conversation.id);
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Handle conversation list toggle
  const handleToggleConversationList = useCallback(() => {
    setSelectedConversation(null);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('conversation');
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Simple toggle logic: show conversation list only when no conversation is selected
  const shouldShowConversationList = !selectedConversation;

  // Render VoiceInterface if active sub-tab is 'voice'
  if (activeSubTab === 'voice') {
    return (
      <ContentPane className="h-full">
        <VoiceInterface />
      </ContentPane>
    );
  }

  // Mobile layout: Single pane with stacking
  if (isMobile) {
    return (
      <AdaptiveSection className="h-full flex flex-col" padding="0">
        <ResponsiveFlex alignment="center" gap="2" className="p-2 border-b border-border">
          <MobileSidebarDrawer selectedTab={selectedTab} onTabChange={onTabChange} />
          <h2 className="text-sm font-medium">
            {t('sidebar.inbox', 'Inbox')}
          </h2>
        </ResponsiveFlex>
        {shouldShowConversationList ? (
          <ContentPane variant="card" className="flex-1">
            <ConversationList
              selectedConversation={selectedConversation}
              onSelectConversation={handleSelectConversation}
              selectedInboxId={selectedInboxId}
              selectedTab={selectedTab}
              onToggleCollapse={handleToggleConversationList}
            />
          </ContentPane>
        ) : (
          <ContentPane className="flex-1">
            {selectedConversation ? (
              <AdaptiveSection className="h-full">
                <ConversationView conversationId={selectedConversation.id} />
              </AdaptiveSection>
            ) : (
              <EmptyConversationState />
            )}
          </ContentPane>
        )}
      </AdaptiveSection>
    );
  }

  // Desktop & Tablet: Sidebar + full-screen toggle layout
  return (
    <ResponsiveFlex className="h-full" wrap={false}>
      <AdaptiveSection className="hidden md:flex h-full">
        <OptimizedInteractionsSidebar
          selectedTab={selectedTab}
          onTabChange={onTabChange}
          selectedInboxId={selectedInboxId}
        />
      </AdaptiveSection>
      <ContentPane className="h-full p-0 flex-1">
        {shouldShowConversationList ? (
          // Full screen conversation list
          <ContentPane variant="bordered" className="h-full">
            <ConversationList
              selectedConversation={selectedConversation}
              onSelectConversation={handleSelectConversation}
              selectedInboxId={selectedInboxId}
              selectedTab={selectedTab}
              onToggleCollapse={undefined}
            />
          </ContentPane>
        ) : (
          // Full screen conversation view with back button
          <ContentPane className="h-full relative">
            <AdaptiveSection className="absolute top-4 left-4 z-10">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedConversation(null);
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete('conversation');
                  setSearchParams(newParams, { replace: true });
                }}
                className="flex items-center gap-2 bg-background/95 backdrop-blur-sm"
              >
                <Sidebar className="h-4 w-4" />
                <span>Back to Inbox</span>
              </Button>
            </AdaptiveSection>

            {selectedConversation ? (
              <AdaptiveSection className="h-full">
                <ConversationView conversationId={selectedConversation.id} />
              </AdaptiveSection>
            ) : (
              <EmptyConversationState />
            )}
          </ContentPane>
        )}
      </ContentPane>
    </ResponsiveFlex>
  );
};

// Empty state component
const EmptyConversationState: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <ResponsiveFlex 
      direction="col" 
      alignment="center" 
      justify="center" 
      className="h-full text-center"
      as="section"
    >
      <ResponsiveContainer padding="8" center>
        <MessageCircle className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {t('interactions.noConversationSelected', 'No conversation selected')}
        </h3>
        <p className="text-muted-foreground max-w-md">
          {t('interactions.selectConversationToStart', 'Select a conversation from the list to start viewing messages and details.')}
        </p>
      </ResponsiveContainer>
    </ResponsiveFlex>
  );
};
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
      <ResponsiveContainer className="flex-1 overflow-y-auto">
        <ResponsiveFlex direction="col" className="flex-1" gap="0">
          <ResponsiveFlex alignment="center" gap="2" className="p-2 border-b border-border">
            <MobileSidebarDrawer selectedTab={selectedTab} onTabChange={onTabChange} />
            <h2 className="text-sm font-medium">
              {t('sidebar.inbox', 'Inbox')}
            </h2>
          </ResponsiveFlex>
          {shouldShowConversationList ? (
            <div className="flex-1 overflow-y-auto">
              <ConversationList
                selectedConversation={selectedConversation}
                onSelectConversation={handleSelectConversation}
                selectedInboxId={selectedInboxId}
                selectedTab={selectedTab}
                onToggleCollapse={handleToggleConversationList}
              />
            </div>
          ) : (
            <ResponsiveFlex className="flex-1" wrap={false}>
              <div className="flex-1 overflow-y-auto">
                {selectedConversation ? (
                  <ConversationView conversationId={selectedConversation.id} />
                ) : (
                  <EmptyConversationState />
                )}
              </div>
              {/* Mobile Actions Sidebar - 25% width */}
              <div className="w-1/4 bg-muted/30 border-l border-border flex flex-col">
                <div className="p-3 border-b border-border">
                  <h3 className="font-medium text-sm text-foreground">Actions</h3>
                </div>
                <div className="flex-1 p-3 flex flex-col gap-2">
                  <button className="w-full px-2 py-1 text-xs bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90 transition-colors">
                    Reply
                  </button>
                  <button className="w-full px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded font-medium hover:bg-secondary/90 transition-colors">
                    Forward
                  </button>
                  <button className="w-full px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded font-medium hover:bg-secondary/90 transition-colors">
                    Archive
                  </button>
                </div>
              </div>
            </ResponsiveFlex>
          )}
        </ResponsiveFlex>
      </ResponsiveContainer>
    );
  }

  // Desktop & Tablet: Sidebar + full-screen toggle layout
  return (
    <ResponsiveContainer className="flex-1 overflow-y-auto">
      <ResponsiveFlex className="flex-1" wrap={false}>
        <AdaptiveSection className="hidden md:flex">
          <OptimizedInteractionsSidebar
            selectedTab={selectedTab}
            onTabChange={onTabChange}
            selectedInboxId={selectedInboxId}
          />
        </AdaptiveSection>
        <div className="flex-1 overflow-y-auto h-[calc(100vh-6rem)]">
          {shouldShowConversationList ? (
            // Full screen conversation list
            <div className="h-full overflow-y-auto">
              <ConversationList
                selectedConversation={selectedConversation}
                onSelectConversation={handleSelectConversation}
                selectedInboxId={selectedInboxId}
                selectedTab={selectedTab}
                onToggleCollapse={undefined}
              />
            </div>
          ) : (
            // Full screen conversation view - let ConversationView handle its own layout
            <div className="h-full overflow-y-auto">
              {/* Back Button */}
              <div className="absolute top-4 left-4 z-10">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedConversation(null);
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete('conversation');
                    setSearchParams(newParams, { replace: true });
                  }}
                  className="flex items-center gap-2 bg-background/95 backdrop-blur-sm border-border"
                >
                  <Sidebar className="h-4 w-4" />
                  <span>Back to Inbox</span>
                </Button>
              </div>

              {/* Main conversation content with proper padding for back button */}
              <div className="pt-16 h-full">
                {selectedConversation ? (
                  <ConversationView conversationId={selectedConversation.id} />
                ) : (
                  <EmptyConversationState />
                )}
              </div>
            </div>
          )}
        </div>
      </ResponsiveFlex>
    </ResponsiveContainer>
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
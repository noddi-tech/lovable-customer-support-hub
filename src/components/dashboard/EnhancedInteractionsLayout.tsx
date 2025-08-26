import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageCircle, Sidebar, RefreshCw, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
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
  
  // Get conversation ID from URL using ?c=<id>
  const conversationIdFromUrl = searchParams.get('c');

  // Load conversation from URL when available, or clear when URL param is removed
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
    } else if (!conversationIdFromUrl && selectedConversation) {
      // Clear selected conversation when URL param is removed
      setSelectedConversation(null);
    }
  }, [conversationIdFromUrl, selectedConversation]);

  // Handle conversation selection
  const handleSelectConversation = useCallback((conversation: Conversation) => {
    console.log('Selecting conversation:', conversation.id);
    setSelectedConversation(conversation);
    
    // Update URL with conversation ID using ?c=<id> format
    const newParams = new URLSearchParams(searchParams);
    newParams.set('c', conversation.id);
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Handle conversation list toggle (Back button)
  const handleToggleConversationList = useCallback(() => {
    setSelectedConversation(null);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('c');
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

  // Desktop & Tablet: Clean card-based layout
  return (
    <div className="h-full w-full flex flex-col min-h-0">
      {shouldShowConversationList ? (
        // Conversation List with Card wrapper
        <Card className="h-full flex flex-col border-border">
          <CardHeader className="flex-shrink-0 pb-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t('conversations.title', 'Conversations')}</h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto min-h-0 p-0">
            <ConversationList
              selectedConversation={selectedConversation}
              onSelectConversation={handleSelectConversation}
              selectedInboxId={selectedInboxId}
              selectedTab={selectedTab}
              onToggleCollapse={undefined}
            />
          </CardContent>
        </Card>
      ) : (
        // Conversation View with Back button and Card wrapper
        <div className="h-full flex flex-col min-h-0">
          <div className="flex-shrink-0 mb-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleToggleConversationList}
              className="mb-2"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t('conversations.backToInbox', 'Back to Inbox')}
            </Button>
          </div>
          <Card className="flex-1 flex flex-col border-border overflow-hidden">
            <div className="flex-1 overflow-y-auto min-h-0">
              {selectedConversation ? (
                <ConversationView conversationId={selectedConversation.id} />
              ) : (
                <EmptyConversationState />
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
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
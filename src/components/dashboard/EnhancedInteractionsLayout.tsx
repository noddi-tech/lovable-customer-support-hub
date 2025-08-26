import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ContentPane } from '@/components/ui/content-pane';
import { ConversationList } from './ConversationList';
import { ConversationView } from './ConversationView';
import { VoiceInterface } from './VoiceInterface';
import { MobileSidebarDrawer } from './MobileSidebarDrawer';
import { useIsMobile } from '@/hooks/use-responsive';
import { useTranslation } from "react-i18next";

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

  // Render VoiceInterface if active sub-tab is 'voice'
  if (activeSubTab === 'voice') {
    return (
      <ContentPane className="h-full">
        <VoiceInterface />
      </ContentPane>
    );
  }

  // Mobile layout: Single column (detail if ?c, else list) with back button
  if (isMobile) {
    return (
      <div className="h-full flex flex-col min-h-0 bg-background">
        <div className="flex items-center gap-2 p-3 border-b border-border bg-background">
          <MobileSidebarDrawer selectedTab={selectedTab} onTabChange={onTabChange} />
          <h2 className="text-sm font-medium">
            {t('sidebar.inbox', 'Inbox')}
          </h2>
        </div>
        
        {selectedConversation ? (
          <div className="flex-1 overflow-auto min-h-0">
            <ConversationView conversationId={selectedConversation.id} />
          </div>
        ) : (
          <div className="flex-1 overflow-auto min-h-0">
            <ConversationList
              selectedConversation={selectedConversation}
              onSelectConversation={handleSelectConversation}
              selectedInboxId={selectedInboxId}
              selectedTab={selectedTab}
            />
          </div>
        )}
      </div>
    );
  }

  // Desktop & Tablet: Master-list-detail layout (always two panes)
  return (
    <div className="h-full min-h-0 grid gap-0 sm:grid-cols-1 md:grid-cols-[380px_minmax(0,1fr)] xl:grid-cols-[420px_minmax(0,1fr)] bg-background">
      {/* Left pane: Vertical conversation list */}
      <aside className="min-h-0 overflow-auto border-r border-border bg-background">
        <div className="p-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-foreground/70">
              {t('conversations.title', 'Conversations')}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <ConversationList
            selectedConversation={selectedConversation}
            onSelectConversation={handleSelectConversation}
            selectedInboxId={selectedInboxId}
            selectedTab={selectedTab}
          />
        </div>
      </aside>

      {/* Right pane: Conversation detail or placeholder */}
      <section className="min-h-0 overflow-auto p-4">
        {selectedConversation ? (
          <Card className="h-full border-border">
            <div className="h-full overflow-auto min-h-0">
              <ConversationView conversationId={selectedConversation.id} />
            </div>
          </Card>
        ) : (
          <Card className="h-full border-border">
            <CardContent className="h-full grid place-items-center text-foreground/60 p-6">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">
                  {t('interactions.noConversationSelected', 'Select a conversation')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('interactions.selectConversationToStart', 'Choose a conversation from the list to view messages and details.')}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
};
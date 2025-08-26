import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { VoiceInterface } from './VoiceInterface';
import { useIsMobile } from '@/hooks/use-responsive';
import { useTranslation } from "react-i18next";
import { MasterDetailShell } from '@/components/admin/design/components/layouts/MasterDetailShell';
import { EntityListRow } from '@/components/admin/design/components/lists/EntityListRow';
import { ReplySidebar } from '@/components/admin/design/components/detail/ReplySidebar';
import { InboxList } from '@/components/admin/design/components/layouts/InboxList';
import { ConversationView } from './ConversationView';
import { useInteractionsNavigation } from '@/hooks/useInteractionsNavigation';

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
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const navigation = useInteractionsNavigation();
  
  // Get state from URL navigation
  const { conversationId, inbox } = navigation.currentState;
  const isDetail = !!conversationId;

  // Mock conversation data - in real app, this would come from API
  const mockConversations = useMemo(() => [
    {
      id: 'conv-1',
      subject: 'Order #12345 - Shipping Question',
      preview: 'Hi, I was wondering about the shipping status of my recent order. Could you please provide an update?',
      customer: { name: 'John Smith', email: 'john@example.com', initials: 'JS' },
      status: 'open' as const,
      priority: 'normal' as const,
      channel: 'email' as const,
      updatedAt: '2 hours ago',
      isUnread: true
    },
    {
      id: 'conv-2', 
      subject: 'Product Return Request',
      preview: 'I need to return the blue sweater I ordered last week. It doesn\'t fit properly.',
      customer: { name: 'Sarah Johnson', email: 'sarah@example.com', initials: 'SJ' },
      status: 'pending' as const,
      priority: 'high' as const,
      channel: 'chat' as const,
      updatedAt: '1 day ago',
      isUnread: false
    },
    {
      id: 'conv-3',
      subject: 'Technical Support Needed',
      preview: 'The mobile app keeps crashing when I try to view my order history. This is very frustrating.',
      customer: { name: 'Mike Chen', email: 'mike@example.com', initials: 'MC' },
      status: 'resolved' as const,
      priority: 'urgent' as const,
      channel: 'email' as const,
      updatedAt: '3 days ago',
      isUnread: false
    }
  ], []);

  // Find selected conversation
  const selectedConversation = conversationId ? 
    mockConversations.find(c => c.id === conversationId) : null;

  // Handlers
  const handleConversationSelect = useCallback((conversation: any) => {
    navigation.navigateToConversation(conversation.id);
  }, [navigation]);

  const handleBack = useCallback(() => {
    navigation.clearConversation();
  }, [navigation]);

  const handleInboxSelect = useCallback((inboxId: string) => {
    navigation.navigateToInbox(inboxId);
  }, [navigation]);

  const handleSendReply = useCallback(async (text: string) => {
    console.log('Sending reply:', text);
    // In real app, send to API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }, []);

  // Render VoiceInterface if active sub-tab is 'voice'
  if (activeSubTab === 'voice') {
    return <VoiceInterface />;
  }

  // Render inbox list
  const renderInboxList = () => (
    <InboxList
      selectedInbox={inbox || selectedInboxId || 'all'}
      onInboxSelect={handleInboxSelect}
    />
  );

  // Render conversation list
  const renderConversationList = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Conversations</h2>
      </div>
      
      <div className="space-y-2">
        {mockConversations.map((conversation) => (
          <EntityListRow
            key={conversation.id}
            subject={conversation.subject}
            preview={conversation.preview}
            avatar={{
              fallback: conversation.customer.initials,
              alt: conversation.customer.name
            }}
            selected={conversation.id === conversationId}
            onClick={() => handleConversationSelect(conversation)}
            badges={[
              ...(conversation.isUnread ? [{ label: 'Unread', variant: 'default' as const }] : []),
              { label: conversation.priority, variant: conversation.priority === 'urgent' ? 'destructive' as const : 'secondary' as const },
              { label: conversation.status, variant: 'outline' as const }
            ]}
            meta={[
              { label: 'From', value: conversation.customer.name },
              { label: 'Channel', value: conversation.channel },
              { label: 'Updated', value: conversation.updatedAt }
            ]}
          />
        ))}
      </div>
    </div>
  );

  // Render message thread
  const renderMessageThread = () => {
    if (!selectedConversation) return null;

    return (
      <Card className="h-full">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-semibold mb-2">{selectedConversation.subject}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{selectedConversation.customer.name}</span>
                <span>•</span>
                <span>{selectedConversation.updatedAt}</span>
              </div>
            </div>
            
            <div className="border-t border-border pt-4">
              <ConversationView conversationId={selectedConversation.id} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render reply sidebar
  const renderReplySidebar = () => {
    if (!selectedConversation) return null;

    return (
      <ReplySidebar
        conversationId={selectedConversation.id}
        status={selectedConversation.status}
        priority={selectedConversation.priority}
        onSendReply={handleSendReply}
        placeholder={`Reply to ${selectedConversation.customer.name}...`}
      />
    );
  };

  return (
    <MasterDetailShell
      left={renderInboxList()}
      center={renderConversationList()}
      detailLeft={renderMessageThread()}
      detailRight={renderReplySidebar()}
      isDetail={isDetail}
      onBack={handleBack}
      backButtonLabel={t('interactions.backToInbox', 'Back to Inbox')}
    />
  );
};
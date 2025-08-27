import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { VoiceInterface } from './VoiceInterface';
import { useIsMobile } from '@/hooks/use-responsive';
import { useTranslation } from "react-i18next";
import { MasterDetailShell } from '@/components/admin/design/components/layouts/MasterDetailShell';
import { EntityListRow } from '@/components/admin/design/components/lists/EntityListRow';
import { ReplySidebar } from '@/components/admin/design/components/detail/ReplySidebar';
import { InboxList } from '@/components/admin/design/components/layouts/InboxList';
import { ConversationView } from './ConversationView';
import { useInteractionsNavigation } from '@/hooks/useInteractionsNavigation';
import { useAccessibleInboxes, useConversations, useThread, useReply } from '@/hooks/useInteractionsData';
import type { ConversationRow } from '@/types/interactions';
import { formatDistanceToNow } from 'date-fns';

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
  const [searchQuery, setSearchQuery] = useState('');
  
  // Get state from URL navigation
  const { conversationId, inbox, status, search } = navigation.currentState;
  const isDetail = !!conversationId;
  
  // Get accessible inboxes and set default if needed
  const { data: inboxes = [] } = useAccessibleInboxes();
  
  // Determine effective inbox ID
  const effectiveInboxId = inbox || selectedInboxId || inboxes[0]?.id || 'all';
  const effectiveStatus = status || 'all';
  const effectiveSearch = search || searchQuery;

  // Set default inbox if none selected
  useEffect(() => {
    if (!inbox && !selectedInboxId && inboxes.length > 0) {
      navigation.setInbox(inboxes[0].id);
    }
  }, [inbox, selectedInboxId, inboxes, navigation]);

  // Get conversations and thread data
  const { data: conversations = [], isLoading: conversationsLoading } = useConversations({
    inboxId: effectiveInboxId,
    status: effectiveStatus,
    q: effectiveSearch
  });
  
  const { data: thread, isLoading: threadLoading } = useThread(conversationId);
  const replyMutation = useReply(conversationId || '', effectiveInboxId, effectiveStatus, effectiveSearch);

  // Find selected conversation
  const selectedConversation = conversationId ? 
    conversations.find(c => c.id === conversationId) : null;

  // Handlers
  const handleConversationSelect = useCallback((conversation: ConversationRow) => {
    navigation.openConversation(conversation.id);
  }, [navigation]);

  const handleBack = useCallback(() => {
    navigation.backToList();
  }, [navigation]);

  const handleInboxSelect = useCallback((inboxId: string) => {
    navigation.setInbox(inboxId);
  }, [navigation]);

  const handleStatusSelect = useCallback((status: any) => {
    navigation.setStatus(status);
  }, [navigation]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    // Debounced search will be handled by the navigation hook
    const timeoutId = setTimeout(() => {
      navigation.setSearch(value);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [navigation]);

  const handleSendReply = useCallback(async (text: string) => {
    if (!conversationId) return;
    await replyMutation.mutateAsync(text);
  }, [conversationId, replyMutation]);

  // Render VoiceInterface if active sub-tab is 'voice'
  if (activeSubTab === 'voice') {
    return <VoiceInterface />;
  }

  // Render inbox list with search
  const renderInboxList = () => (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="px-2">
        <Input
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="bg-background border-border focus-visible:ring-ring"
        />
      </div>
      
      {/* Inbox and Filter List */}
      <InboxList
        selectedInbox={effectiveInboxId}
        selectedStatus={effectiveStatus}
        onInboxSelect={handleInboxSelect}
        onStatusSelect={handleStatusSelect}
      />
    </div>
  );

  // Render conversation list (single column only)
  const renderConversationList = () => {
    if (conversationsLoading) {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Conversations</h2>
          </div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 border border-border rounded-lg bg-card">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (conversations.length === 0) {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Conversations</h2>
          </div>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No conversations found</h3>
            <p className="text-sm text-muted-foreground">
              {effectiveSearch ? 'Try adjusting your search or filters.' : 'No conversations match the current filter.'}
            </p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Conversations</h2>
          <span className="text-sm text-muted-foreground">{conversations.length} conversations</span>
        </div>
        
        {/* Single column list - never a grid */}
        <div className="space-y-2">
          {conversations.map((conversation) => (
            <EntityListRow
              key={conversation.id}
              subject={conversation.subject}
              preview={conversation.preview}
              avatar={{
                fallback: conversation.fromName?.split(' ').map(n => n[0]).join('').toUpperCase() || '?',
                alt: conversation.fromName || 'Unknown'
              }}
              selected={conversation.id === conversationId}
              onClick={() => handleConversationSelect(conversation)}
              badges={[
                ...(conversation.unread ? [{ label: 'Unread', variant: 'default' as const }] : []),
                ...(conversation.priority && conversation.priority !== 'normal' ? [{
                  label: conversation.priority,
                  variant: conversation.priority === 'urgent' ? 'destructive' as const : 'secondary' as const
                }] : []),
                { label: conversation.status, variant: 'outline' as const }
              ]}
              meta={[
                { label: 'From', value: conversation.fromName || 'Unknown' },
                { label: 'Channel', value: conversation.channel },
                { label: 'Updated', value: formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: true }) }
              ]}
            />
          ))}
        </div>
      </div>
    );
  };

  // Render message thread
  const renderMessageThread = () => {
    if (!conversationId || !thread) {
      if (threadLoading) {
        return (
          <Card className="h-full">
            <CardContent className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      }
      return null;
    }

    return (
      <Card className="h-full">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-semibold mb-2">{thread.subject}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{thread.customer?.full_name || 'Unknown Customer'}</span>
                <span>•</span>
                <span>{thread.customer?.email}</span>
              </div>
            </div>
            
            <div className="border-t border-border pt-4">
              <ConversationView conversationId={conversationId} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render reply sidebar
  const renderReplySidebar = () => {
    if (!conversationId || !thread) return null;

    return (
      <ReplySidebar
        conversationId={conversationId}
        status={(selectedConversation?.status === 'archived' ? 'closed' : selectedConversation?.status) || 'open'}
        priority={selectedConversation?.priority || 'normal'}
        onSendReply={handleSendReply}
        placeholder={`Reply to ${thread.customer?.full_name || 'customer'}...`}
        isLoading={replyMutation.isPending}
      />
    );
  };

  return (
    <div id="interactions-root">
      <MasterDetailShell
        left={renderInboxList()}
        center={renderConversationList()}
        detailLeft={renderMessageThread()}
        detailRight={renderReplySidebar()}
        isDetail={isDetail}
        onBack={handleBack}
        backButtonLabel={t('interactions.backToInbox', 'Back to Inbox')}
      />
    </div>
  );
};
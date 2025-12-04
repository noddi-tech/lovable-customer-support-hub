import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { VoiceDashboard } from './voice/VoiceDashboard';
import { useTranslation } from "react-i18next";
import { MasterDetailShell } from '@/components/admin/design/components/layouts/MasterDetailShell';
import { InboxList } from '@/components/layout/InboxList';
import { ConversationView } from './ConversationView';
import { ConversationList } from './ConversationList';
import { ResponsiveContainer } from '@/components/admin/design/components/layouts/ResponsiveContainer';
import { useInteractionsNavigation } from '@/hooks/useInteractionsNavigation';
import { useAccessibleInboxes, useConversations, useThread, useReply } from '@/hooks/useInteractionsData';
import type { ConversationRow } from '@/types/interactions';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getCustomerDisplay } from '@/utils/customerDisplayName';

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
  const navigation = useInteractionsNavigation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dev-only performance monitoring
  useEffect(() => {
    if (import.meta.env.DEV && import.meta.env.VITE_PERF_LOG === '1') {
      performance.mark('enhanced-interactions-layout-mount-start');
      
      return () => {
        performance.mark('enhanced-interactions-layout-mount-end');
        performance.measure(
          'enhanced-interactions-layout-mount',
          'enhanced-interactions-layout-mount-start',
          'enhanced-interactions-layout-mount-end'
        );
        
        const measure = performance.getEntriesByName('enhanced-interactions-layout-mount')[0];
        if (measure) {
          // eslint-disable-next-line no-console
          console.log(`EnhancedInteractionsLayout mount time: ${measure.duration.toFixed(2)}ms`);
        }
        
        // Cleanup
        performance.clearMarks('enhanced-interactions-layout-mount-start');
        performance.clearMarks('enhanced-interactions-layout-mount-end');
        performance.clearMeasures('enhanced-interactions-layout-mount');
      };
    }
  }, []);
  
  // Get state from URL navigation
  const { conversationId, inbox, status, search } = navigation.currentState;
  const isDetail = !!conversationId;
  
  // Read thread IDs from URL if present
  const threadParam = new URLSearchParams(window.location.search).get('thread');
  const conversationIds = threadParam ? threadParam.split(',') : conversationId;
  
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

  // Mark conversation as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from('conversations')
        .update({ is_read: true })
        .eq('id', conversationId)
        .eq('is_read', false); // Only update if currently unread
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['inboxCounts'] });
      queryClient.invalidateQueries({ queryKey: ['all-counts'] });
    }
  });

  // Handlers
  const handleConversationSelect = useCallback((conversation: ConversationRow) => {
    const conv = conversation as any;
    const conversationIdsToFetch = conv.thread_ids && conv.thread_ids.length > 1 
      ? conv.thread_ids 
      : conversation.id;
    
    navigation.openConversation(conversation.id, conversationIdsToFetch);
    
    // Mark as read if it's unread
    if (conversation.unread) {
      markAsReadMutation.mutate(conversation.id);
    }
    
    // Log thread selection for debugging
    if (conv.thread_ids && conv.thread_ids.length > 1) {
      console.log('[EnhancedInteractionsLayout] Selected threaded conversation:', {
        conversationId: conversation.id,
        threadCount: conv.thread_count,
        threadIds: conv.thread_ids,
        _fetchIds: conversationIdsToFetch
      });
    }
  }, [navigation, markAsReadMutation]);

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

  // Render VoiceDashboard if active sub-tab is 'voice'
  if (activeSubTab === 'voice') {
    return (
      <ResponsiveContainer 
        padding={{ sm: '4', md: '6', lg: '8' }}
        maxWidth="7xl"
        center={true}
        className="py-6"
      >
        <VoiceDashboard />
      </ResponsiveContainer>
    );
  }
  
  // Render specific voice pages
  if (activeSubTab === 'voice-analytics' || activeSubTab === 'voice-settings') {
    // These are handled at the Index.tsx level
    return null;
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

  // Render conversation list with full functionality
  const renderConversationList = () => {
    return (
      <ConversationList
        selectedTab={effectiveStatus}
        onSelectConversation={(conversation) => handleConversationSelect(conversation as any)}
        selectedConversation={selectedConversation as any}
        selectedInboxId={effectiveInboxId}
        onToggleCollapse={() => {}}
      />
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

    // Smart customer display to prevent duplicate email
    const customerDisplay = getCustomerDisplay(thread.customer?.full_name, thread.customer?.email);

    return (
      <Card className="h-full">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-semibold mb-2">{thread.subject}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{customerDisplay.displayName}</span>
                {customerDisplay.showEmail && customerDisplay.email && (
                  <>
                    <span>•</span>
                    <span>{customerDisplay.email}</span>
                  </>
                )}
              </div>
            </div>
            
            <div className="border-t border-border pt-4">
              <ConversationView conversationId={conversationId} conversationIds={conversationIds} showSidePanel={true} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <MasterDetailShell
      left={renderInboxList()}
      center={renderConversationList()}
      detailLeft={renderMessageThread()}
      detailRight={null}
      isDetail={isDetail}
      onBack={handleBack}
      backButtonLabel={t('interactions.backToInbox', 'Back to Inbox')}
    />
  );
};
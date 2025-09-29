import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageCircle, RefreshCw, GitMerge, Filter, Move, CheckCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { VoiceInterface } from './VoiceInterface';
import { ThreadMerger } from './ThreadMerger';
import { ConversationMigrator } from './ConversationMigrator';
import { useIsMobile } from '@/hooks/use-responsive';
import { useTranslation } from "react-i18next";
import { MasterDetailShell } from '@/components/admin/design/components/layouts/MasterDetailShell';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EntityListRow } from '@/components/admin/design/components/lists/EntityListRow';
import { InboxList } from '@/components/admin/design/components/layouts/InboxList';
import { ConversationSidebar } from './ConversationSidebar';
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
  const [showMerger, setShowMerger] = useState(false);
  const [showMigrator, setShowMigrator] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const queryClient = useQueryClient();
  
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

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('conversations')
        .update({ is_read: true })
        .eq('inbox_id', effectiveInboxId)
        .eq('is_read', false);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['inbox-counts'] });
      toast.success('All conversations marked as read');
    },
    onError: (error) => {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    },
  });

  const unreadCount = useMemo(() => {
    return conversations?.filter(c => c.unread).length || 0;
  }, [conversations]);

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

      {/* Action Buttons Row */}
      <div className="px-2 flex flex-wrap gap-2">
        {/* Filters Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="flex-1 min-w-0">
              <Filter className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Filters</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Priority</label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Merge Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMerger(true)}
          className="flex-1 min-w-0"
        >
          <GitMerge className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Merge</span>
        </Button>

        {/* Migrate Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMigrator(true)}
          className="flex-1 min-w-0"
        >
          <Move className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Migrate</span>
        </Button>

        {/* Mark All Read Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => markAllAsReadMutation.mutate()}
          disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
          className="flex-1 min-w-0 relative"
        >
          <CheckCheck className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Mark Read</span>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1 text-xs">
              {unreadCount}
            </Badge>
          )}
        </Button>
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

  // Render conversation sidebar (without reply functionality)
  const renderConversationSidebar = () => {
    if (!conversationId || !thread) return null;

    return (
      <ConversationSidebar
        conversationId={conversationId}
        customer={thread.customer}
        status={(selectedConversation?.status === 'archived' ? 'closed' : selectedConversation?.status) || 'open'}
        priority={selectedConversation?.priority || 'normal'}
      />
    );
  };

  return (
    <>
      <MasterDetailShell
        left={renderInboxList()}
        center={renderConversationList()}
        detailLeft={renderMessageThread()}
        detailRight={renderConversationSidebar()}
        isDetail={isDetail}
        onBack={handleBack}
        backButtonLabel={t('interactions.backToInbox', 'Back to Inbox')}
      />
      
      {/* Thread Merger Dialog */}
      <Dialog open={showMerger} onOpenChange={setShowMerger}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Merge Split Email Threads</DialogTitle>
          </DialogHeader>
          <ThreadMerger 
            inboxId={effectiveInboxId}
            onMergeComplete={() => setShowMerger(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Conversation Migrator Dialog */}
      <Dialog open={showMigrator} onOpenChange={setShowMigrator}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Migrate Conversations</DialogTitle>
          </DialogHeader>
          <ConversationMigrator 
            sourceInboxId={effectiveInboxId}
            onMigrationComplete={() => setShowMigrator(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
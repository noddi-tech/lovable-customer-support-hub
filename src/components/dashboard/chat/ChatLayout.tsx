import React, { useState } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { LiveChatQueue } from '@/components/conversations/LiveChatQueue';
import { ChatFilters, type ChatFilterType } from './ChatFilters';
import { ChatConversationList } from './ChatConversationList';
import { ChatEmptyState } from './ChatEmptyState';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MessageCircle } from 'lucide-react';

// Use ConversationView which handles fetching internally
const ConversationView = React.lazy(() => 
  import('@/components/dashboard/ConversationView').then(m => ({ default: m.ConversationView }))
);

export const ChatLayout: React.FC = () => {
  const navigate = useNavigate();
  const { filter: urlFilter } = useParams<{ filter?: string }>();
  const [searchParams] = useSearchParams();
  const selectedConversationId = searchParams.get('c');
  const { profile } = useAuth();
  const organizationId = profile?.organization_id;

  // Map URL filter to our filter type
  const currentFilter: ChatFilterType = 
    urlFilter === 'waiting' ? 'waiting' :
    urlFilter === 'ended' ? 'ended' :
    urlFilter === 'all' ? 'all' :
    'active';

  // Fetch counts for filter badges
  const { data: counts } = useQuery({
    queryKey: ['chat-counts', organizationId],
    queryFn: async () => {
      if (!organizationId) return { active: 0, waiting: 0, ended: 0, all: 0 };

      // Count widget conversations by status
      const [activeResult, endedResult, allResult] = await Promise.all([
        supabase
          .from('conversations')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('channel', 'widget')
          .eq('status', 'open')
          .is('deleted_at', null),
        supabase
          .from('conversations')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('channel', 'widget')
          .in('status', ['closed', 'resolved'])
          .is('deleted_at', null),
        supabase
          .from('conversations')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('channel', 'widget')
          .is('deleted_at', null),
      ]);

      // Count waiting sessions
      const { count: waitingCount } = await supabase
        .from('widget_chat_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'waiting');

      return {
        active: activeResult.count || 0,
        waiting: waitingCount || 0,
        ended: endedResult.count || 0,
        all: allResult.count || 0,
      };
    },
    enabled: !!organizationId,
    refetchInterval: 10000,
  });

  const handleFilterChange = (filter: ChatFilterType) => {
    // Preserve the selected conversation when changing filters
    const params = selectedConversationId ? `?c=${selectedConversationId}` : '';
    navigate(`/interactions/chat/${filter}${params}`);
  };

  const handleSelectChat = (conversationId: string) => {
    navigate(`/interactions/chat/${currentFilter}?c=${conversationId}`);
  };

  const handleBack = () => {
    navigate(`/interactions/chat/${currentFilter}`);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-background">
        <MessageCircle className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">Live Chat</h1>
      </div>

      {/* Main content */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left panel: Filters, Queue, and List */}
        <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
          <div className="flex flex-col h-full border-r">
            {/* Chat Filters */}
            <ChatFilters
              currentFilter={currentFilter}
              onFilterChange={handleFilterChange}
              counts={counts}
            />

            {/* Live Chat Queue - Prominent position */}
            <LiveChatQueue 
              className="border-b"
              compact={false}
            />

            {/* Chat Conversation List */}
            <ChatConversationList
              filter={currentFilter}
              selectedId={selectedConversationId || undefined}
              onSelect={handleSelectChat}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right panel: Selected Chat View */}
        <ResizablePanel defaultSize={65}>
          {selectedConversationId ? (
            <React.Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            }>
              <ConversationView
                conversationId={selectedConversationId}
                showSidePanel={false}
              />
            </React.Suspense>
          ) : (
            <ChatEmptyState />
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

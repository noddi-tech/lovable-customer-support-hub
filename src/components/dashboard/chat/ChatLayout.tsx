import React, { useState } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { LiveChatQueue } from '@/components/conversations/LiveChatQueue';
import { ChatFilters, type ChatFilterType } from './ChatFilters';
import { ChatConversationList } from './ChatConversationList';
import { ChatEmptyState } from './ChatEmptyState';
import { ChatCaseSidePanel } from './ChatCaseSidePanel';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MessageCircle } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-responsive';

// Direct import - lazy loading was causing context provider issues
import { ConversationView } from '@/components/dashboard/ConversationView';

export const ChatLayout: React.FC = () => {
  const navigate = useNavigate();
  const { filter: urlFilter, conversationId: selectedConversationId } = useParams<{ filter?: string; conversationId?: string }>();
  const [searchParams] = useSearchParams();
  const highlightMessageId = searchParams.get('m');
  const { profile } = useAuth();
  const isMobile = useIsMobile();
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
          .in('status', ['open', 'pending']) // Include pending in active count
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
    // Navigate to filter list view (no conversation in path)
    navigate(`/interactions/chat/${filter}`);
  };

  const handleSelectChat = (conversationId: string) => {
    navigate(`/interactions/chat/conversations/${conversationId}`);
  };

  const handleBack = () => {
    navigate(-1);
  };

  // ============ MOBILE: single column, list <-> conversation ============
  if (isMobile) {
    if (selectedConversationId) {
      return (
        <div className="flex flex-col h-full bg-card overflow-hidden">
          <ConversationView
            conversationId={selectedConversationId}
            showSidePanel={false}
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b bg-card">
          <SidebarTrigger className="shrink-0 h-8 w-8" />
          <MessageCircle className="h-4 w-4 text-primary shrink-0" />
          <h1 className="text-base font-semibold truncate">Live Chat</h1>
        </div>

        <ChatFilters
          currentFilter={currentFilter}
          onFilterChange={handleFilterChange}
          counts={counts}
        />

        <LiveChatQueue className="border-b" compact />

        <div className="flex-1 min-h-0 overflow-hidden">
          <ChatConversationList
            filter={currentFilter}
            selectedId={undefined}
            onSelect={handleSelectChat}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-card">
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

        {/* Middle panel: Selected Chat View */}
        <ResizablePanel defaultSize={45}>
          {selectedConversationId ? (
            <ConversationView
              conversationId={selectedConversationId}
              showSidePanel={false}
            />
          ) : (
            <ChatEmptyState />
          )}
        </ResizablePanel>

        {selectedConversationId && (
          <>
            <ResizableHandle withHandle />
            {/* Right panel: case + unified customer history */}
            <ResizablePanel defaultSize={20} minSize={15} maxSize={35}>
              <ChatCaseSidePanel
                conversationId={selectedConversationId}
                className="h-full overflow-y-auto border-l bg-background"
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
};

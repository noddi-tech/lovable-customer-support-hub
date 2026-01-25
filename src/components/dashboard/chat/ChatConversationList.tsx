import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageCircle, Search } from 'lucide-react';
import { ChatListItem } from './ChatListItem';
import type { ChatFilterType } from './ChatFilters';

interface ChatConversation {
  id: string;
  subject: string | null;
  preview_text: string | null;
  status: string;
  updated_at: string;
  is_read: boolean;
  customer: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
  session?: {
    id: string;
    status: string;
    visitor_name: string | null;
    visitor_email: string | null;
  } | null;
}

interface ChatConversationListProps {
  filter: ChatFilterType;
  selectedId?: string;
  onSelect: (conversationId: string) => void;
}

export const ChatConversationList: React.FC<ChatConversationListProps> = ({
  filter,
  selectedId,
  onSelect,
}) => {
  const { profile } = useAuth();
  const organizationId = profile?.organization_id;
  const [searchQuery, setSearchQuery] = useState('');

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['chat-conversations', organizationId, filter],
    queryFn: async (): Promise<ChatConversation[]> => {
      if (!organizationId) return [];

      // Query conversations with channel = 'widget'
      let query = supabase
        .from('conversations')
        .select(`
          id,
          subject,
          preview_text,
          status,
          updated_at,
          is_read,
          customer:customers(id, full_name, email)
        `)
        .eq('organization_id', organizationId)
        .eq('channel', 'widget')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(100);

      // Apply filter based on conversation status
      if (filter === 'active') {
        query = query.in('status', ['open', 'pending']); // Include pending in active
      } else if (filter === 'ended') {
        query = query.in('status', ['closed', 'resolved']);
      }
      // 'waiting' and 'all' require session status check which we'll filter client-side

      const { data, error } = await query;

      if (error) {
        console.error('[ChatConversationList] Error fetching:', error);
        throw error;
      }

      // Get session info for each conversation
      const conversationIds = (data || []).map(c => c.id);
      
      const { data: sessions } = await supabase
        .from('widget_chat_sessions')
        .select('id, conversation_id, status, visitor_name, visitor_email')
        .in('conversation_id', conversationIds);

      const sessionMap = new Map(
        (sessions || []).map(s => [s.conversation_id, s])
      );

      let result = (data || []).map(conv => ({
        ...conv,
        session: sessionMap.get(conv.id) || null,
      }));

      // Filter by session status for 'waiting'
      if (filter === 'waiting') {
        result = result.filter(c => c.session?.status === 'waiting');
      }

      return result;
    },
    enabled: !!organizationId,
    refetchInterval: 5000, // Poll every 5 seconds for real-time updates
  });

  // Filter conversations by search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    
    const query = searchQuery.toLowerCase();
    return conversations.filter(conv => {
      const name = conv.session?.visitor_name || conv.customer?.full_name || '';
      const email = conv.session?.visitor_email || conv.customer?.email || '';
      const preview = conv.preview_text || '';
      
      return (
        name.toLowerCase().includes(query) ||
        email.toLowerCase().includes(query) ||
        preview.toLowerCase().includes(query)
      );
    });
  }, [conversations, searchQuery]);

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Input */}
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      {filteredConversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center px-4">
          <MessageCircle className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-sm font-medium text-foreground mb-1">
            {searchQuery ? 'No matching chats' : 'No chats found'}
          </h3>
          <p className="text-xs text-muted-foreground max-w-[200px]">
            {searchQuery 
              ? 'Try a different search term'
              : filter === 'waiting' 
                ? 'No visitors are waiting for a chat' 
                : filter === 'active'
                  ? 'No active chat sessions'
                  : 'Chat conversations will appear here'}
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-1 p-2">
            {filteredConversations.map((conv) => (
              <ChatListItem
                key={conv.id}
                conv={conv}
                isSelected={selectedId === conv.id}
                onSelect={() => onSelect(conv.id)}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

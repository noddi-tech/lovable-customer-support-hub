import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageCircle, User } from 'lucide-react';
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
        query = query.eq('status', 'open');
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

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <MessageCircle className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-sm font-medium text-foreground mb-1">
          No chats found
        </h3>
        <p className="text-xs text-muted-foreground max-w-[200px]">
          {filter === 'waiting' 
            ? 'No visitors are waiting for a chat' 
            : filter === 'active'
            ? 'No active chat sessions'
            : 'Chat conversations will appear here'}
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-1 p-2">
        {conversations.map((conv) => {
          const customerName = conv.session?.visitor_name || conv.customer?.full_name || 'Visitor';
          const customerEmail = conv.session?.visitor_email || conv.customer?.email;
          const isWaiting = conv.session?.status === 'waiting';
          const isActive = conv.session?.status === 'active';
          const initial = customerName.charAt(0).toUpperCase();

          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors",
                selectedId === conv.id
                  ? "bg-accent border-accent-foreground/20"
                  : "hover:bg-muted/50 border-transparent",
                !conv.is_read && "bg-primary/5"
              )}
            >
              {/* Avatar with status indicator */}
              <div className="relative shrink-0">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="text-sm bg-primary/10">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                {/* Status dot */}
                {(isWaiting || isActive) && (
                  <div className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
                    isWaiting ? "bg-yellow-500 animate-pulse" : "bg-green-500"
                  )} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-sm font-medium truncate",
                    !conv.is_read && "font-semibold"
                  )}>
                    {customerName}
                  </span>
                  {isWaiting && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-yellow-50 text-yellow-700 border-yellow-300">
                      WAITING
                    </Badge>
                  )}
                  {isActive && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-300 animate-pulse">
                      LIVE
                    </Badge>
                  )}
                </div>
                {customerEmail && (
                  <span className="text-xs text-muted-foreground truncate block">
                    {customerEmail}
                  </span>
                )}
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                  {conv.preview_text || 'No messages yet'}
                </p>
              </div>

              {/* Time */}
              <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: false })}
              </span>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
};

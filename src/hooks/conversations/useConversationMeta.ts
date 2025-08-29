import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ConversationMeta {
  id: string;
  subject: string;
  customer: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  messageCount: number;
  newestMessageId: string | null;
  lastUpdated: string;
  status: string;
  priority: string;
  isRead: boolean;
}

/**
 * Hook to get conversation metadata (without full message list)
 * Optimized for fast initial render
 */
export function useConversationMeta(conversationId?: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['conversation-meta', conversationId, user?.id],
    queryFn: async (): Promise<ConversationMeta | null> => {
      if (!conversationId) return null;
      
      // Get conversation with customer info
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select(`
          id,
          subject,
          status,
          priority,
          is_read,
          updated_at,
          customer:customers(id, full_name, email)
        `)
        .eq('id', conversationId)
        .single();
      
      if (convError) throw convError;
      
      // Get message count and newest message ID
      const { count, error: countError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId);
        
      if (countError) throw countError;
      
      // Get newest message ID for scroll anchoring
      const { data: newestMessage } = await supabase
        .from('messages')
        .select('id')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      return {
        id: conversation.id,
        subject: conversation.subject || 'No Subject',
        customer: conversation.customer,
        messageCount: count || 0,
        newestMessageId: newestMessage?.id || null,
        lastUpdated: conversation.updated_at,
        status: conversation.status,
        priority: conversation.priority,
        isRead: conversation.is_read
      };
    },
    enabled: !!conversationId && !!user,
    staleTime: 60 * 1000, // 1 minute - meta changes less frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}
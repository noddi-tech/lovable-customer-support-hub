import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { normalizeMessage, deduplicateMessages, createNormalizationContext, type NormalizedMessage, type NormalizationContext } from '@/lib/normalizeMessage';

const INITIAL_VISIBLE_COUNT = 3;
const PAGE_SIZE = 10;

interface Message {
  id: string;
  content: string;
  content_type: string;
  sender_type: 'customer' | 'agent';
  sender_id: string | null;
  is_internal: boolean;
  attachments: any;
  created_at: string;
  email_subject?: string;
  email_headers?: any;
}

interface MessagesPage {
  messages: NormalizedMessage[];
  hasMore: boolean;
  totalCount: number;
  normalizedCount: number;
  totalNormalizedEstimated: number;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Hook for progressive message loading with infinite query
 * Shows newest messages first, loads older on demand
 */
export function useConversationMessages(conversationId?: string, normalizationContext?: NormalizationContext) {
  const { user } = useAuth();
  
  // Create default normalization context if none provided
  const defaultContext = createNormalizationContext({
    currentUserEmail: user?.email || undefined,
    // TODO: Add agent emails from organization data when available
    agentEmails: [],
    agentPhones: [],
  });
  
  const ctx = normalizationContext || defaultContext;
  
  return useInfiniteQuery({
    queryKey: ['conversation-messages', conversationId, user?.id],
    queryFn: async ({ pageParam = 0 }): Promise<MessagesPage> => {
      if (!conversationId) {
        return { messages: [], hasMore: false, totalCount: 0, normalizedCount: 0, totalNormalizedEstimated: 0, confidence: 'high' as const };
      }
      
      // For initial page, get newest messages
      // For subsequent pages, get older messages
      const isInitialPage = pageParam === 0;
      const limit = isInitialPage ? INITIAL_VISIBLE_COUNT : PAGE_SIZE;
      
      // Get total count first
      const { count: totalCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId);
      
      // Calculate offset for pagination
      // We're loading from newest to oldest, so offset from end
      const offset = isInitialPage ? 0 : INITIAL_VISIBLE_COUNT + (pageParam - 1) * PAGE_SIZE;
      
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          content_type,
          sender_type,
          sender_id,
          is_internal,
          attachments,
          created_at,
          email_subject,
          email_headers
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
        
      if (error) throw error;
      
      // Normalize messages and ensure proper typing
      const rawMessages = (messages || []).reverse().map(msg => ({
        ...msg,
        sender_type: msg.sender_type as 'customer' | 'agent'
      }));
      
      // Normalize messages using the context
      const normalizedMessages = rawMessages.map(msg => normalizeMessage(msg, ctx));
      
      // Deduplicate to prevent issues with duplicate content
      const dedupedMessages = deduplicateMessages(normalizedMessages);
      
      const hasMore = (totalCount || 0) > offset + limit;
      
      // Calculate confidence based on normalization ratio
      const normalizationRatio = rawMessages.length > 0 ? dedupedMessages.length / rawMessages.length : 1;
      let confidence: 'high' | 'medium' | 'low' = 'high';
      
      if (normalizationRatio < 0.7) {
        confidence = 'low';
      } else if (normalizationRatio < 0.9) {
        confidence = 'medium';
      }
      
      // Estimate total normalized based on current ratio
      const estimatedNormalized = totalCount && rawMessages.length > 0 
        ? Math.round((totalCount || 0) * (dedupedMessages.length / rawMessages.length))
        : totalCount || 0;

      return {
        messages: dedupedMessages,
        hasMore,
        totalCount: totalCount || 0,
        normalizedCount: dedupedMessages.length,
        totalNormalizedEstimated: estimatedNormalized,
        confidence
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length : undefined;
    },
    enabled: !!conversationId && !!user,
    staleTime: 10 * 1000, // 10 seconds - messages change frequently
    gcTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to get flattened message list from infinite query
 */
export function useConversationMessagesList(conversationId?: string, normalizationContext?: NormalizationContext) {
  const query = useConversationMessages(conversationId, normalizationContext);
  
  const allMessages = query.data?.pages.flatMap(page => page.messages) || [];
  const totalCount = query.data?.pages[0]?.totalCount || 0;
  const normalizedCount = query.data?.pages.reduce((sum, page) => sum + page.normalizedCount, 0) || 0;
  const totalNormalizedEstimated = query.data?.pages[0]?.totalNormalizedEstimated || 0;
  const confidence = query.data?.pages[0]?.confidence || 'high';
  const hasNextPage = query.hasNextPage;
  const isFetchingNextPage = query.isFetchingNextPage;
  const fetchNextPage = query.fetchNextPage;
  
  return {
    messages: allMessages,
    totalCount,
    normalizedCount,
    totalNormalizedEstimated,
    confidence,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading: query.isLoading,
    error: query.error
  };
}
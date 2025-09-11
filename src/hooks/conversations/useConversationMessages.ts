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
  confidence: 'high' | 'low';
  oldestLoadedAt?: string;
}

/**
 * Hook for progressive message loading with infinite query
 * Shows newest messages first, loads older on demand
 * Implements robust cross-page deduplication
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
    queryFn: async ({ pageParam }: { pageParam: number | string | undefined }): Promise<MessagesPage> => {
      if (!conversationId) {
        return { 
          messages: [], 
          hasMore: false, 
          totalCount: 0, 
          normalizedCount: 0, 
          totalNormalizedEstimated: 0, 
          confidence: 'high' as const 
        };
      }
      
      const isInitialPage = typeof pageParam === 'number' ? pageParam === 0 : !pageParam;
      const limit = isInitialPage ? INITIAL_VISIBLE_COUNT : PAGE_SIZE;
      
      // For pagination beyond first page, use timestamp cursor to prevent overlap
      let query = supabase
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
          email_headers,
          external_id,
          email_message_id
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      // For subsequent pages, add cursor to prevent overlap
      if (!isInitialPage && typeof pageParam === 'string') {
        query = query.lt('created_at', pageParam);
      }
      
      const { data: messages, error } = await query;
      if (error) throw error;
      
      // Get total count only on first page
      let totalCount = 0;
      if (isInitialPage) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conversationId);
        totalCount = count || 0;
      }
      
      // Normalize messages and ensure proper typing
      const rawMessages = (messages || []).map(msg => ({
        ...msg,
        sender_type: msg.sender_type as 'customer' | 'agent'
      }));
      
      // Normalize messages using the context
      const normalizedMessages = rawMessages.map(msg => normalizeMessage(msg, ctx));
      
      // Track oldest loaded timestamp for cursor
      const oldestLoadedAt = rawMessages.length > 0 
        ? rawMessages[rawMessages.length - 1].created_at 
        : undefined;
      
      const hasMore = rawMessages.length === limit;
      
      // Calculate confidence only on first page
      let confidence: 'high' | 'low' = 'high';
      let estimatedNormalized = totalCount;
      
      if (isInitialPage && rawMessages.length >= 20) {
        const normalizationRatio = normalizedMessages.length / rawMessages.length;
        confidence = (normalizationRatio >= 0.3 && normalizationRatio <= 1.0) ? 'high' : 'low';
        estimatedNormalized = Math.round(totalCount * normalizationRatio);
      } else if (isInitialPage && rawMessages.length > 0) {
        confidence = 'low';
      }

      return {
        messages: normalizedMessages,
        hasMore,
        totalCount,
        normalizedCount: normalizedMessages.length,
        totalNormalizedEstimated: estimatedNormalized,
        confidence,
        oldestLoadedAt
      };
    },
    initialPageParam: 0 as number | string,
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore && lastPage.oldestLoadedAt ? lastPage.oldestLoadedAt : undefined;
    },
    enabled: !!conversationId && !!user,
    staleTime: 10 * 1000, // 10 seconds - messages change frequently
    gcTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to get flattened message list from infinite query with cross-page deduplication
 */
export function useConversationMessagesList(conversationId?: string, normalizationContext?: NormalizationContext) {
  const query = useConversationMessages(conversationId, normalizationContext);
  
  // Flatten all messages and apply cross-page deduplication
  const allRawMessages = query.data?.pages.flatMap((page: MessagesPage) => page.messages) || [];
  const allMessages = deduplicateMessages(allRawMessages);
  
  // Sort newest first for display
  const sortedMessages = [...allMessages].sort((a, b) => {
    const timeA = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : a.createdAt;
    const timeB = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : b.createdAt;
    return timeB - timeA; // DESC order (newest first)
  });
  
  const totalCount = query.data?.pages[0]?.totalCount || 0;
  const normalizedCountLoaded = allMessages.length;
  const totalNormalizedEstimated = query.data?.pages[0]?.totalNormalizedEstimated || 0;
  const confidence = query.data?.pages[0]?.confidence || ('high' as const);
  const hasNextPage = query.hasNextPage;
  const isFetchingNextPage = query.isFetchingNextPage;
  const fetchNextPage = query.fetchNextPage;
  
  return {
    messages: sortedMessages,
    totalCount,
    normalizedCountLoaded,
    totalNormalizedEstimated,
    confidence,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading: query.isLoading,
    error: query.error
  };
}
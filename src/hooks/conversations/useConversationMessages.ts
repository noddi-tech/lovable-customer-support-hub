import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { normalizeMessage, deduplicateMessages, createNormalizationContext, type NormalizedMessage, type NormalizationContext } from '@/lib/normalizeMessage';

const INITIAL_VISIBLE_COUNT = 3;
const PAGE_SIZE = 20;

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
  oldestCursor: null | string;
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
    queryKey: ['conversation-messages', conversationId],
    initialPageParam: null as null | string, // null = first page, else ISO cursor
    queryFn: async ({ pageParam }) => {
      if (!conversationId) {
        return { 
          messages: [], 
          hasMore: false, 
          totalCount: 0, 
          normalizedCount: 0, 
          totalNormalizedEstimated: 0, 
          confidence: 'high' as const, 
          oldestCursor: null as null | string 
        };
      }

      const isFirst = pageParam === null;
      const take = isFirst ? INITIAL_VISIBLE_COUNT : PAGE_SIZE;

      // Base query (DESC by created_at) + cursor
      let q = supabase.from('messages')
        .select(`
          id, content, content_type, sender_type, sender_id, is_internal, attachments,
          created_at, email_subject, email_headers, external_id, email_message_id
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(take + 1);               // fetch one extra to detect "has more"

      if (!isFirst && pageParam) q = q.lt('created_at', pageParam); // strictly older

      const { data: rows, error } = await q;
      if (error) throw error;

      // totalCount only once
      let totalCount = 0;
      if (isFirst) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conversationId);
        totalCount = count || 0;
      }

      // Slice to kept items and compute next cursor
      const hasMore = rows.length > take;
      const kept = rows.slice(0, take);
      const oldestCursor = kept.length ? kept[kept.length - 1].created_at : null;

      // normalize
      const rawMessages = kept.map(r => ({ ...r, sender_type: r.sender_type as 'customer' | 'agent' }));
      const normalized = rawMessages.map(r => normalizeMessage(r, ctx));

      // confidence estimate only on first page
      let confidence: 'high' | 'low' = 'high';
      let totalNormalizedEstimated = totalCount;
      if (isFirst) {
        const ratio = rows.length ? normalized.length / rows.length : 1;
        confidence = (rows.length >= 20 && ratio >= 0.3 && ratio <= 1.0) ? 'high' : 'low';
        totalNormalizedEstimated = Math.round((totalCount || 0) * (ratio || 1));
      }

      return {
        messages: normalized,
        hasMore,
        totalCount,
        normalizedCount: normalized.length,
        totalNormalizedEstimated,
        confidence,
        oldestCursor,
      };
    },
    getNextPageParam: (last) => (last.hasMore && last.oldestCursor ? last.oldestCursor : undefined),
    enabled: !!conversationId,
    staleTime: 10_000,
    gcTime: 120_000,
  });
}

/**
 * Hook to get flattened message list from infinite query with cross-page deduplication
 */
export function useConversationMessagesList(conversationId?: string, ctx?: NormalizationContext) {
  const q = useConversationMessages(conversationId, ctx);

  const flat = q.data?.pages.flatMap(p => p.messages) ?? [];
  // one global pass
  const seen = new Set<string>();
  const deduped = flat.filter(m => (seen.has(m.dedupKey) ? false : (seen.add(m.dedupKey), true)));

  // After flattening and cross-page deduplication, just sort - no segmentation
  const messages = deduped.sort((a, b) =>
    (new Date(b.createdAt).getTime()) - (new Date(a.createdAt).getTime())
  );

  const totalCount = q.data?.pages[0]?.totalCount || 0;
  const normalizedCountLoaded = messages.length;
  const totalNormalizedEstimated = q.data?.pages[0]?.totalNormalizedEstimated || 0;
  const confidence = q.data?.pages[0]?.confidence || 'high';

  return {
    messages,
    totalCount,
    normalizedCountLoaded,
    totalNormalizedEstimated,
    confidence,
    hasNextPage: q.hasNextPage,
    isFetchingNextPage: q.isFetchingNextPage,
    fetchNextPage: q.fetchNextPage,
    isLoading: q.isLoading,
    error: q.error,
  };
}
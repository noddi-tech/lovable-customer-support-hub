import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { normalizeMessage, deduplicateMessages, createNormalizationContext, type NormalizedMessage, type NormalizationContext } from '@/lib/normalizeMessage';
import { buildThreadSeed, messageMatchesThread, type ThreadSeed } from '@/lib/emailThreading';

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
  external_id?: string;
  email_message_id?: string;
  conversation?: {
    customer?: {
      email?: string;
      full_name?: string;
    };
    inbox_id?: string;
  };
}

interface ThreadPage {
  messages: NormalizedMessage[];
  hasMore: boolean;
  totalCount: number;
  loadedCount: number;
  oldestCursor: null | string;
  threadSeed?: ThreadSeed;
}

/**
 * Hook for thread-aware message loading with infinite query
 * Builds conversation threads using email headers and subject fallback
 */
export function useThreadMessages(conversationId?: string, normalizationContext?: NormalizationContext) {
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
    queryKey: ['thread-messages', conversationId],
    initialPageParam: null as null | string, // null = first page, else ISO cursor
    queryFn: async ({ pageParam }) => {
      if (!conversationId) {
        return { 
          messages: [], 
          hasMore: false, 
          totalCount: 0, 
          loadedCount: 0,
          oldestCursor: null as null | string,
          threadSeed: undefined
        };
      }

      const isFirst = pageParam === null;
      const take = isFirst ? INITIAL_VISIBLE_COUNT : PAGE_SIZE;

      // First, get initial messages from the conversation to build thread seed
      let seedMessages: Message[] = [];
      if (isFirst) {
        const { data: initialRows, error: seedError } = await supabase
          .from('messages')
          .select(`
            id, content, content_type, sender_type, sender_id, is_internal, attachments,
            created_at, email_subject, email_headers, external_id, email_message_id,
            conversation:conversations(customer:customers(email, full_name), inbox_id)
          `)
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .limit(5); // Get a few recent messages to build thread context

        if (seedError) throw seedError;
        
        // Type the raw data properly
        const typedRows = (initialRows || []).map(r => ({
          ...r,
          sender_type: r.sender_type as 'customer' | 'agent',
          conversation: Array.isArray(r.conversation) ? r.conversation[0] : r.conversation
        })) as Message[];
        
        seedMessages = typedRows;
      }

      // Build thread seed from initial messages
      let threadSeed: ThreadSeed | undefined;
      if (isFirst && seedMessages.length > 0) {
        // Get inbox email for participant matching
        const inboxEmail = seedMessages[0]?.conversation?.inbox_id 
          ? await getInboxEmail(seedMessages[0].conversation.inbox_id)
          : undefined;

        threadSeed = buildThreadSeed(seedMessages, inboxEmail);
      }

      // Base query for conversation messages
      let query = supabase.from('messages')
        .select(`
          id, content, content_type, sender_type, sender_id, is_internal, attachments,
          created_at, email_subject, email_headers, external_id, email_message_id,
          conversation:conversations(customer:customers(email, full_name), inbox_id)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(take + 1); // fetch one extra to detect "has more"

      if (!isFirst && pageParam) {
        query = query.lt('created_at', pageParam); // strictly older
      }

      const { data: rows, error } = await query;
      if (error) throw error;

      // Get total count only on first page
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

      // Normalize messages
      const rawMessages = kept.map(r => ({ 
        ...r, 
        sender_type: r.sender_type as 'customer' | 'agent',
        conversation: Array.isArray(r.conversation) ? r.conversation[0] : r.conversation
      })) as Message[];
      const normalized = rawMessages.map(r => normalizeMessage(r, ctx));

      // Apply deduplication 
      const deduped = deduplicateMessages(normalized);

      return {
        messages: deduped,
        hasMore,
        totalCount,
        loadedCount: deduped.length,
        oldestCursor,
        threadSeed
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
export function useThreadMessagesList(conversationId?: string, ctx?: NormalizationContext) {
  const q = useThreadMessages(conversationId, ctx);

  const flat = q.data?.pages.flatMap(p => p.messages) ?? [];
  // Global dedup across all pages
  const deduped = deduplicateMessages(flat);

  // Sort DESC (newest first)
  const messages = deduped.sort((a, b) =>
    (new Date(b.createdAt).getTime()) - (new Date(a.createdAt).getTime())
  );

  const totalCount = q.data?.pages[0]?.totalCount || 0;
  const loadedCount = messages.length;
  
  // For thread-aware messaging, we show actual DB message counts
  const remaining = totalCount > loadedCount ? totalCount - loadedCount : 0;

  return {
    messages,
    totalCount,
    loadedCount,
    remaining,
    hasNextPage: q.hasNextPage,
    isFetchingNextPage: q.isFetchingNextPage,
    fetchNextPage: q.fetchNextPage,
    isLoading: q.isLoading,
    error: q.error,
  };
}

/**
 * Helper to get inbox email address
 */
async function getInboxEmail(inboxId: string): Promise<string | undefined> {
  try {
    const { data, error } = await supabase
      .from('inboxes')
      .select('name')
      .eq('id', inboxId)
      .single();
    
    if (error || !data) return undefined;
    
    // Construct email from name (fallback approach)
    return `${data.name}@example.com`; // fallback
  } catch (e) {
    return undefined;
  }
}
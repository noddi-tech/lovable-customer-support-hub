import { useThreadMessages } from "./useThreadMessages";
import { NormalizationContext, expandQuotedMessagesToCards } from "@/lib/normalizeMessage";
import { ENABLE_QUOTED_EXTRACTION } from "@/lib/parseQuotedEmail";

export function useThreadMessagesList(conversationId?: string, context?: NormalizationContext) {
  const q = useThreadMessages(conversationId);

  const pages = q.data?.pages ?? [];
  const raw = pages.flatMap(p => p.rows);

  // Dedup strictly by Message-ID/external_id/db id – normalizeMessage should supply dedupKey
  const seen = new Set<string>();
  const dedupedMessages = raw.filter(m => {
    const key = m.dedupKey || m.id;
    if (seen.has(key)) {
      console.log('[Dedup] ❌ REMOVING duplicate:', {
        key,
        messageId: m.id,
        dedupKey: m.dedupKey,
        subject: m.subject
      });
      return false;
    }
    seen.add(key);
    console.log('[Dedup] ✅ KEEPING message:', {
      key,
      messageId: m.id,
      dedupKey: m.dedupKey,
      subject: m.subject
    });
    return true;
  });

  // Optionally expand quoted messages into separate cards for thread view
  const expandedMessages = ENABLE_QUOTED_EXTRACTION && context
    ? expandQuotedMessagesToCards(dedupedMessages, context)
    : dedupedMessages;

  console.log('[Thread Expansion]', {
    enabled: ENABLE_QUOTED_EXTRACTION,
    hasContext: !!context,
    originalCount: dedupedMessages.length,
    expandedCount: expandedMessages.length,
    added: expandedMessages.length - dedupedMessages.length
  });

  // Sort by creation time (newest first)
  const messages = expandedMessages.sort((a,b) => {
    const ta = +new Date(a.createdAt);
    const tb = +new Date(b.createdAt);
    return tb - ta; // newest first
  });

  const totalCount = pages[0]?.totalCount ?? 0;
  const loadedCount = messages.length;
  const confidence = pages[0]?.confidence ?? 'high';
  
  // Only show numeric remaining when confidence is high
  const estimatedNormalized = confidence === 'high' ? totalCount : loadedCount;
  const rawRemaining = Math.max(estimatedNormalized - loadedCount, 0);
  
  // Clamp remaining to reasonable limits and hide when confidence is low
  const remaining = confidence === 'high' && rawRemaining <= 500 ? rawRemaining : 0;

  return {
    messages,
    totalCount,
    loadedCount,
    remaining,
    confidence,
    estimatedNormalized,
    hasNextPage: q.hasNextPage,
    isFetchingNextPage: q.isFetchingNextPage,
    fetchNextPage: q.fetchNextPage,
    isLoading: q.isLoading,
    error: q.error,
  };
}
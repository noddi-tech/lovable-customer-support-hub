import { useMemo } from "react";
import { useThreadMessages } from "./useThreadMessages";
import { NormalizationContext, NormalizedMessage, expandQuotedMessagesToCards } from "@/lib/normalizeMessage";
import { ENABLE_QUOTED_EXTRACTION } from "@/lib/parseQuotedEmail";
import { logger } from "@/utils/logger";

/**
 * Normalize message body for echo comparison:
 * strip HTML, collapse whitespace, lowercase, take first 200 chars.
 */
function normalizeForEcho(body: string): string | null {
  const text = body
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return text.length > 20 ? text.substring(0, 200) : null;
}

/**
 * Filter Google Groups forwarding echoes:
 * When an agent reply is forwarded back through Google Groups,
 * it appears as a new inbound message with identical content.
 * Detect and remove these by comparing inbound content against
 * recent outbound messages within a short time window.
 */
function filterForwardingEchoes(messages: NormalizedMessage[]): NormalizedMessage[] {
  const ECHO_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  const outboundHashes = new Map<string, number>();
  for (const m of messages) {
    if (m.direction === 'outbound' && !m.isInternalNote) {
      const hash = normalizeForEcho(m.visibleBody);
      if (hash) {
        outboundHashes.set(hash, new Date(m.createdAt).getTime());
      }
    }
  }

  if (outboundHashes.size === 0) return messages;

  return messages.filter(m => {
    if (m.direction !== 'inbound') return true;
    const hash = normalizeForEcho(m.visibleBody);
    if (!hash) return true;
    const outboundTime = outboundHashes.get(hash);
    if (outboundTime === undefined) return true;
    const inboundTime = new Date(m.createdAt).getTime();
    if (inboundTime >= outboundTime && (inboundTime - outboundTime) < ECHO_WINDOW_MS) {
      logger.debug('Filtering forwarding echo', {
        messageId: m.id,
        timeDiffMs: inboundTime - outboundTime
      }, 'EchoFilter');
      return false;
    }
    return true;
  });
}

export function useThreadMessagesList(conversationIds?: string | string[], context?: NormalizationContext) {
  const q = useThreadMessages(conversationIds);

  // Extract pages for metadata calculations
  const pages = q.data?.pages ?? [];

  // Memoize expensive processing to prevent re-running on every render
  const messages = useMemo(() => {
    logger.time('useThreadMessagesList processing', 'useThreadMessagesList');
    logger.debug('useMemo RUNNING - processing messages', { 
      pagesCount: pages.length,
      hasContext: !!context,
      contextRef: context ? 'has context' : 'no context'
    }, 'useThreadMessagesList');
    
    const raw = pages.flatMap(p => p.rows);

    // Dedup strictly by Message-ID/external_id/db id – normalizeMessage should supply dedupKey
    const seen = new Set<string>();
    const dedupedMessages = raw.filter(m => {
      const key = m.dedupKey || m.id;
      if (seen.has(key)) {
        logger.debug('Removing duplicate message', {
          key,
          messageId: m.id,
          dedupKey: m.dedupKey,
          subject: m.subject
        }, 'Dedup');
        return false;
      }
      seen.add(key);
      logger.debug('Keeping message', {
        key,
        messageId: m.id,
        dedupKey: m.dedupKey,
        subject: m.subject
      }, 'Dedup');
      return true;
    });

    // Optionally expand quoted messages into separate cards for thread view
    const expandedMessages = ENABLE_QUOTED_EXTRACTION && context
      ? expandQuotedMessagesToCards(dedupedMessages, context)
      : dedupedMessages;

    logger.debug('Thread expansion stats', {
      enabled: ENABLE_QUOTED_EXTRACTION,
      hasContext: !!context,
      originalCount: dedupedMessages.length,
      expandedCount: expandedMessages.length,
      added: expandedMessages.length - dedupedMessages.length
    }, 'Thread');

    // Sort by creation time (newest first)
    const sorted = expandedMessages.sort((a,b) => {
      const ta = +new Date(a.createdAt);
      const tb = +new Date(b.createdAt);
      return tb - ta; // newest first
    });
    
    logger.timeEnd('useThreadMessagesList processing', 'useThreadMessagesList');
    logger.debug('useMemo COMPLETE', { 
      resultCount: sorted.length 
    }, 'useThreadMessagesList');
    
    return sorted;
  }, [pages, context]); // Only re-run when pages data changes

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
import { useMemo } from "react";
import { useThreadMessages } from "./useThreadMessages";
import { NormalizationContext, NormalizedMessage, expandQuotedMessagesToCards } from "@/lib/normalizeMessage";
import { ENABLE_QUOTED_EXTRACTION } from "@/lib/parseQuotedEmail";
import { logger } from "@/utils/logger";

/**
 * Strip HTML tags, collapse whitespace, lowercase for content comparison.
 */
function stripToText(body: string): string | null {
  const text = body
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return text.length > 30 ? text : null;
}

/**
 * Filter Google Groups forwarding echoes:
 * When an agent reply is forwarded back through Google Groups,
 * it appears as a new inbound message containing the agent's text
 * (often with forwarding headers prepended).
 * Uses substring matching — if the first 80 chars of an outbound
 * message appear inside an inbound message, it's an echo.
 */
function filterForwardingEchoes(messages: NormalizedMessage[]): NormalizedMessage[] {
  // Collect ONLY agent/outbound message texts — we only filter inbound messages
  // that are echoes of earlier AGENT replies (not customer messages).
  // This prevents hiding legitimate customer follow-ups that quote earlier emails.
  const agentTexts: { text: string; time: number; id: string }[] = [];
  for (const m of messages) {
    if (m.isInternalNote) continue;
    if (m.direction !== 'outbound' && m.authorType !== 'agent') continue;
    const text = stripToText(m.visibleBody);
    if (text) {
      agentTexts.push({ text, time: new Date(m.createdAt).getTime(), id: m.id });
    }
  }

  if (agentTexts.length === 0) return messages;

  return messages.filter(m => {
    // Only filter inbound/customer messages
    if (m.direction !== 'inbound') return true;
    if (m.authorType !== 'customer') return true;
    const inboundText = stripToText(m.visibleBody);
    if (!inboundText) return true;
    const inboundTime = new Date(m.createdAt).getTime();

    // Only compare against earlier AGENT messages
    for (const agentMsg of agentTexts) {
      if (agentMsg.time >= inboundTime) continue;
      if (agentMsg.id === m.id) continue;
      // Only filter if the inbound message is very similar in length (within 30%)
      // This catches true forwarding echoes but preserves customer replies that quote the agent
      const lengthRatio = inboundText.length / agentMsg.text.length;
      if (lengthRatio < 0.7 || lengthRatio > 1.3) continue;
      const searchKey = agentMsg.text.substring(0, 120);
      if (inboundText.includes(searchKey)) {
        logger.debug('Filtering forwarding echo (near-identical inbound copy of agent reply)', {
          messageId: m.id,
          matchedAgainst: agentMsg.id,
          lengthRatio: lengthRatio.toFixed(2),
        }, 'EchoFilter');
        return false;
      }
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

    // Filter Google Groups forwarding echoes (inbound copies of outbound replies)
    const echoFiltered = filterForwardingEchoes(dedupedMessages);

    // Optionally expand quoted messages into separate cards for thread view
    const expandedMessages = ENABLE_QUOTED_EXTRACTION && context
      ? expandQuotedMessagesToCards(echoFiltered, context)
      : echoFiltered;

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
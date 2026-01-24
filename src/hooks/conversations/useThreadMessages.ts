import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createNormalizationContext, normalizeMessage, NormalizedMessage } from "@/lib/normalizeMessage";
import { canonicalizeEmail, normalizeSubject, extractMessageIds } from "@/lib/emailThreading";
import { useAuth } from "@/hooks/useAuth";
import { useSimpleRealtimeSubscriptions } from "@/hooks/useSimpleRealtimeSubscriptions";
import { logger } from "@/utils/logger";

const INITIAL = 20;
const PAGE = 25;

/**
 * Build the exact same filter for both select and count.
 */
function applyThreadFilter(q: any, seed: {
  messageIds: string[];
  references: string[];
  normSubject: string;
  participants: string[];
  windowDays: number;
}) {
  const sinceIso = new Date(Date.now() - seed.windowDays * 24 * 60 * 60 * 1000).toISOString();

  // For simple thread filtering, we'll use basic Supabase filters
  // This is a simplified version - in practice you might need more complex JSON queries
  return q.gte('created_at', sinceIso);
}

export function useThreadMessages(conversationIds?: string | string[]) {
  const { user } = useAuth();

  // Normalize to array and log
  const ids = conversationIds 
    ? (Array.isArray(conversationIds) ? conversationIds : [conversationIds])
    : [];
  
  logger.debug('Fetching thread messages', {
    conversationIds: ids,
    count: ids.length,
    isThread: ids.length > 1
  }, 'useThreadMessages');

  // Real-time subscription for messages
  useSimpleRealtimeSubscriptions(
    ids.length > 0 ? [{ 
      table: 'messages', 
      queryKey: 'thread-messages'
    }] : [],
    ids.length > 0
  );

  return useInfiniteQuery({
    queryKey: ["thread-messages", ...(ids.length > 0 ? ids : ['none']), user?.id],
    initialPageParam: null as string | null, // created_at cursor
    queryFn: async ({ pageParam }) => {
      if (ids.length === 0) {
        return {
          rows: [] as NormalizedMessage[],
          oldestCursor: null as string | null,
          hasMore: false,
          totalCount: 0,
        };
      }

      // 1) Seed from newest few rows of these conversation(s)
      // Note: We intentionally do NOT join profiles here - sender_id is not a proper FK to profiles.id
      // Agent names are resolved via normalizeMessage using email headers or stored sender info
      const seedSel = supabase
        .from("messages")
        .select("id, email_headers, email_subject, created_at, sender_type, sender_id, content, content_type, is_internal, attachments, external_id, conversation:conversations(customer:customers(email, full_name), email_account:email_accounts(email_address), inbox:inboxes(sender_display_name, inbound_routes(group_email)))")
        .in("conversation_id", ids)
        .order("created_at", { ascending: false })
        .limit(5);

      const { data: seedRows, error: seedErr } = await seedSel;
      if (seedErr) throw seedErr;

      // Extract thread seed
      const messageIds: string[] = [];
      const references: string[] = [];
      let normSubject = "";
      for (const r of seedRows ?? []) {
        const { messageId, inReplyTo, references: refs } = extractMessageIds(r.email_headers);
        if (messageId) messageIds.push(messageId);
        if (inReplyTo) references.push(inReplyTo);
        if (refs?.length) references.push(...refs);
        if (!normSubject && r.email_subject) normSubject = normalizeSubject(r.email_subject);
      }

      // Participants (email list) – use what you store on conversation or seed headers
      const participants: string[] = [];

      // 2) Build base query (DESC newest first); add cursor for older pages
      // Note: We do NOT join profiles via FK - sender_id may be auth user_id, not profiles.id
      // Agent display names are resolved in normalizeMessage from email headers or agent lookup
      let base = supabase
        .from("messages")
        .select("id, email_message_id, email_thread_id, email_headers, email_subject, created_at, sender_type, sender_id, content, content_type, is_internal, is_pinned, attachments, external_id, conversation:conversations(customer:customers(email, full_name), email_account:email_accounts(email_address), inbox:inboxes(sender_display_name, inbound_routes(group_email)))")
        .in("conversation_id", ids) // Filter by conversation(s)
        .order("created_at", { ascending: false })
        .limit(pageParam ? PAGE : INITIAL);

      // Note: Removed applyThreadFilter - it was adding a 90-day window that hid older messages
      // The conversation_id filter is sufficient for fetching all messages in a conversation

      if (pageParam) {
        base = base.lt("created_at", pageParam); // older than cursor
      }

      const { data: rows, error } = await base;
      if (error) throw error;

      logger.info('DB query executed', {
        queryingConversations: ids,
        conversationCount: ids.length,
        isThreaded: ids.length > 1,
        messagesReturned: rows?.length || 0,
        pageParam: pageParam || 'initial'
      }, 'useThreadMessages');

      // 3) Count once (first page) using the EXACT same filter for thread-aware counting
      let totalCount = 0;
      if (!pageParam) {
        let countQ = supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .in("conversation_id", ids);
        
        // Apply the same thread filter to get accurate count
        // Note: No date filter - count all messages in the conversation(s)
        
        const { count, error: cErr } = await countQ;
        if (cErr) throw cErr;
        totalCount = count ?? 0;
        
        logger.debug('Count query executed', { 
          conversationIds: ids,
          isThreaded: ids.length > 1,
          totalCount,
          messageIds: messageIds.length,
          references: references.length,
          normSubject: normSubject || 'none'
        }, 'useThreadMessages');
      }

      // Type the conversation data properly
      const typedRows = (rows ?? []).map(r => ({
        ...r,
        sender_type: r.sender_type as 'customer' | 'agent',
        conversation: Array.isArray(r.conversation) ? r.conversation[0] : r.conversation
      }));

      // Extract conversation customer info for normalization context
      const conversationData = typedRows[0]?.conversation;
      const customerData = conversationData?.customer;
      const emailAccountData = conversationData?.email_account;
      const inboxData = conversationData?.inbox as { sender_display_name?: string; inbound_routes?: { group_email?: string }[] } | undefined;
      // Fallback chain: email_account.email_address → inbound_routes.group_email (NOT sender_display_name which is a name, not email)
      const inboundRouteEmail = inboxData?.inbound_routes?.[0]?.group_email;
      const inboxEmail = emailAccountData?.email_address || inboundRouteEmail;
      
      // Create conversation-specific normalization context
      const ctx = createNormalizationContext({
        currentUserEmail: user?.email,
        inboxEmail: inboxEmail,
        agentEmails: [], 
        agentPhones: [],
        agentDomains: ['noddi.no'], // helps classify agents
        conversationCustomerEmail: customerData?.email,
        conversationCustomerName: customerData?.full_name,
      });

      const normalized = typedRows.map(r => normalizeMessage(r, ctx));
      const oldestCursor = rows?.length ? rows[rows.length - 1].created_at : null;
      const hasMore = !!rows?.length && rows.length === (pageParam ? PAGE : INITIAL);

      // Confidence assessment: if first page has fewer than 10 messages, mark as low confidence
      let confidence: 'high' | 'low' = 'high';
      if (!pageParam && rows && rows.length < 10) {
        confidence = 'low';
        logger.debug('Low confidence - small initial page', {
          conversationIds: ids,
          isThreaded: ids.length > 1,
          initialRowCount: rows.length
        }, 'useThreadMessages');
      }

      return { rows: normalized, oldestCursor, hasMore, totalCount, confidence };
    },
    getNextPageParam: (last) => (last.hasMore ? last.oldestCursor : undefined),
    enabled: ids.length > 0,
    staleTime: 10_000,
    gcTime: 120_000,
    refetchInterval: 10_000, // Fallback polling every 10s in case realtime fails
    refetchIntervalInBackground: false, // Only when tab is focused
  });
}
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createNormalizationContext, normalizeMessage, NormalizedMessage } from "@/lib/normalizeMessage";
import { canonicalizeEmail, normalizeSubject, extractMessageIds } from "@/lib/emailThreading";
import { useAuth } from "@/hooks/useAuth";
import { useSimpleRealtimeSubscriptions } from "@/hooks/useSimpleRealtimeSubscriptions";

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
  
  // Debug logging flag
  const isDebugMode = import.meta.env.VITE_UI_PROBE === '1';
  
  // Debug: Log what we're fetching
  if (isDebugMode || ids.length > 1) {
    console.log('[useThreadMessages] Fetching with:', {
      conversationIds: ids,
      count: ids.length,
      isThread: ids.length > 1,
      firstId: ids[0],
      allIds: ids
    });
  }

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
      const seedSel = supabase
        .from("messages")
        .select("id, email_headers, email_subject, created_at, sender_type, sender_id, content, content_type, is_internal, attachments, external_id, conversation:conversations(customer:customers(email, full_name), email_account:email_accounts(email_address))")
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
      let base = supabase
        .from("messages")
        .select("id, email_message_id, email_thread_id, email_headers, email_subject, created_at, sender_type, sender_id, content, content_type, is_internal, attachments, external_id, conversation:conversations(customer:customers(email, full_name), email_account:email_accounts(email_address))")
        .in("conversation_id", ids) // Filter by conversation(s)
        .order("created_at", { ascending: false })
        .limit(pageParam ? PAGE : INITIAL);

      base = applyThreadFilter(base, {
        messageIds: [...new Set(messageIds)],
        references: [...new Set(references)],
        normSubject,
        participants,
        windowDays: 90,
      });

      if (pageParam) {
        base = base.lt("created_at", pageParam); // older than cursor
      }

      const { data: rows, error } = await base;
      if (error) throw error;

      // Debug logging - track raw DB response
      console.log('[useThreadMessages] DB query executed:', {
        queryingConversations: ids,
        conversationCount: ids.length,
        isThreaded: ids.length > 1,
        messagesReturned: rows?.length || 0,
        pageParam: pageParam || 'initial',
        messages: rows?.map(r => ({
          id: r.id,
          conversation_id: (r as any).conversation_id,
          email_message_id: r.email_message_id,
          external_id: r.external_id,
          subject: r.email_subject,
          created_at: r.created_at
        }))
      });

      // Debug logging for pagination
      if (isDebugMode && rows) {
        console.debug('[useThreadMessages] page fetched', {
          conversationIds: ids,
          isThreadedFetch: ids.length > 1,
          isInitialPage: !pageParam,
          limit: pageParam ? PAGE : INITIAL,
          rowsReturned: rows.length,
          firstFiveRows: rows.slice(0, 5).map(r => ({
            id: r.id,
            created_at: r.created_at,
            sender_type: r.sender_type,
            from: (r.email_headers as any)?.['from'] || (r.email_headers as any)?.['From'],
            external_id: r.external_id
          }))
        });
      }

      // 3) Count once (first page) using the EXACT same filter for thread-aware counting
      let totalCount = 0;
      if (!pageParam) {
        let countQ = supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .in("conversation_id", ids);
        
        // Apply the same thread filter to get accurate count
        countQ = applyThreadFilter(countQ, {
          messageIds: [...new Set(messageIds)],
          references: [...new Set(references)],
          normSubject,
          participants,
          windowDays: 90,
        });
        
        const { count, error: cErr } = await countQ;
        if (cErr) throw cErr;
        totalCount = count ?? 0;
        
        // Debug logging
        if (isDebugMode) {
          console.debug('[useThreadMessages] count query', { 
            conversationIds: ids,
            isThreadedFetch: ids.length > 1,
            totalCount,
            messageIds: messageIds.length,
            references: references.length,
            normSubject: normSubject || 'none'
          });
        }
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
      const inboxEmail = emailAccountData?.email_address;
      
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
        if (isDebugMode) {
          console.debug('[useThreadMessages] low confidence due to small initial page', {
            conversationIds: ids,
            isThreadedFetch: ids.length > 1,
            initialRowCount: rows.length
          });
        }
      }

      return { rows: normalized, oldestCursor, hasMore, totalCount, confidence };
    },
    getNextPageParam: (last) => (last.hasMore ? last.oldestCursor : undefined),
    enabled: ids.length > 0,
    staleTime: 10_000,
    gcTime: 120_000,
  });
}
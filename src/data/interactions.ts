import { supabase } from '@/integrations/supabase/client';
import type { 
  Inbox, 
  InboxCounts, 
  ConversationRow, 
  ConversationThread, 
  Message,
  StatusFilter,
  InboxId,
  ConversationId 
} from '@/types/interactions';
import { logger } from '@/utils/logger';

// Auth error codes that indicate authentication issues
const AUTH_ERROR_CODES = [
  'JWT expired',
  'refresh_token_not_found', 
  'PGRST301',
  'PGRST116',
  'insufficient_permissions',
  'auth.uid()'
];

export const isAuthError = (error: any): boolean => {
  if (!error) return false;
  
  const message = error?.message?.toLowerCase() || '';
  const code = error?.code || '';
  
  // Check for explicit auth error codes
  if (AUTH_ERROR_CODES.some(authCode => 
    code.includes(authCode) || message.includes(authCode.toLowerCase())
  )) {
    return true;
  }
  
  // Check for auth-related error messages
  return message.includes('jwt expired') ||
         message.includes('refresh_token_not_found') ||
         message.includes('auth.uid()') ||
         message.includes('session') ||
         message.includes('authentication') ||
         message.includes('unauthorized') ||
         message.includes('null');
};

/**
 * Get accessible inboxes for the current user
 */
export async function listAccessibleInboxes(): Promise<Inbox[]> {
  try {
    const { data, error } = await supabase.rpc('get_inboxes');
    
    if (error) {
      logger.error('Error fetching inboxes', error, 'listAccessibleInboxes');
      
      // Return empty array for auth errors instead of throwing
      if (isAuthError(error)) {
        logger.warn('Auth error detected, returning empty inboxes', error);
        return [];
      }
      
      throw error;
    }
    
    return (data || []).map((inbox: any) => ({
      id: inbox.id,
      name: inbox.name,
      color: inbox.color,
      is_active: inbox.is_active
    }));
  } catch (error) {
    logger.error('Failed to list accessible inboxes', error, 'listAccessibleInboxes');
    
    // Return empty array for auth errors
    if (isAuthError(error)) {
      return [];
    }
    
    return [];
  }
}

/**
 * Get conversation counts for a specific inbox
 */
export async function getInboxCounts(inboxId: InboxId): Promise<InboxCounts> {
  try {
    // Use inbox-specific counts when a specific inbox is selected
    if (inboxId && inboxId !== 'all') {
      const { data, error } = await supabase.rpc('get_inbox_counts', { inbox_uuid: inboxId });
      
      if (error) {
        logger.error('Error fetching inbox-specific counts', error, 'getInboxCounts');
        throw error;
      }
      
      const result = data?.[0];
      if (!result) {
        return {
          inboxId,
          total: 0,
          unread: 0,
          assigned: 0,
          pending: 0,
          closed: 0,
          archived: 0
        };
      }
      
      return {
        inboxId,
        total: Number(result.conversations_all) || 0,
        unread: Number(result.conversations_unread) || 0,
        assigned: Number(result.conversations_assigned) || 0,
        pending: Number(result.conversations_pending) || 0,
        closed: Number(result.conversations_closed) || 0,
        archived: Number(result.conversations_archived) || 0,
      };
    } else {
      // Use global counts for 'all' inboxes
      const { data, error } = await supabase.rpc('get_all_counts');
      
      if (error) {
        logger.error('Error fetching global counts', error, 'getInboxCounts');
        throw error;
      }
      
      const result = data?.[0];
      if (!result) {
        return {
          inboxId,
          total: 0,
          unread: 0,
          assigned: 0,
          pending: 0,
          closed: 0,
          archived: 0
        };
      }
      
      return {
        inboxId,
        total: Number(result.conversations_all) || 0,
        unread: Number(result.conversations_unread) || 0,
        assigned: Number(result.conversations_assigned) || 0,
        pending: Number(result.conversations_pending) || 0,
        closed: Number(result.conversations_closed) || 0,
        archived: Number(result.conversations_archived) || 0,
      };
    }
  } catch (error) {
    logger.error('Failed to get inbox counts', error, 'getInboxCounts');
    return {
      inboxId,
      total: 0,
      unread: 0,
      assigned: 0,
      pending: 0,
      closed: 0,
      archived: 0
    };
  }
}

/**
 * List conversations with filtering
 */
export async function listConversations(params: {
  inboxId?: InboxId;
  status: StatusFilter;
  q?: string;
  page?: number;
  cursor?: string;
  priority?: string;
  assigneeId?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<ConversationRow[]> {
  try {
    const { inboxId, status, q, page = 1 } = params;
    
    // Try emergency recovery function first with inbox filter
    const inboxUuid = (inboxId && inboxId !== 'all') ? inboxId : null;
    
    let query = supabase.rpc('get_conversations_with_session_recovery', { 
      inbox_uuid: inboxUuid 
    });
    
    const { data: recoveryData, error: recoveryError } = await query;
    
    if (recoveryError) {
      console.error('Emergency recovery failed:', recoveryError);
      
      // Fallback to original method
      let fallbackQuery = supabase.rpc('get_conversations').select('*');
      
      const { data: fallbackData, error: fallbackError } = await fallbackQuery.limit(50);
      
      if (fallbackError) {
        logger.error('Error fetching conversations (fallback)', fallbackError, 'listConversations');
        if (isAuthError(fallbackError)) {
          logger.warn('Auth error detected, returning empty conversations', fallbackError);
          return [];
        }
        throw fallbackError;
      }
      
      // Apply filters on fallback data
      let conversations = (fallbackData || []).map((conv: any) => ({
        id: conv.id,
        subject: conv.subject || 'No subject',
        preview: conv.preview_text || conv.subject || 'No preview',
        fromName: conv.customer?.full_name,
        channel: conv.channel,
        updatedAt: conv.updated_at,
        unread: !conv.is_read,
        priority: conv.priority,
        status: conv.status,
        assignee: conv.assigned_to?.full_name,
        customerId: conv.customer?.id,
        inboxId: conv.inbox_id,
        isArchived: conv.is_archived,
        firstResponseAt: conv.first_response_at,
        slaBreachAt: conv.sla_breach_at,
        slaStatus: conv.first_response_at 
          ? 'met' 
          : conv.sla_breach_at && new Date(conv.sla_breach_at) < new Date()
            ? 'breached'
            : conv.sla_breach_at && new Date(conv.sla_breach_at).getTime() - new Date().getTime() < 2 * 60 * 60 * 1000
              ? 'at_risk'
              : 'on_track'
      })) as ConversationRow[];
      
      return applyFilters(conversations, params);
    }
    
    // Process recovery data with filters
    let conversations = (recoveryData || []).map((conv: any) => ({
      id: conv.id,
      subject: conv.subject || 'No subject',
      preview: conv.preview_text || conv.subject || 'No preview',
      fromName: conv.customer?.full_name,
      channel: conv.channel,
      updatedAt: conv.updated_at,
      unread: !conv.is_read,
      priority: conv.priority,
      status: conv.status,
      assignee: conv.assigned_to?.full_name,
      customerId: conv.customer?.id,
      inboxId: conv.inbox_id,
      isArchived: conv.is_archived,
      firstResponseAt: conv.first_response_at,
      slaBreachAt: conv.sla_breach_at,
      slaStatus: conv.first_response_at 
        ? 'met' 
        : conv.sla_breach_at && new Date(conv.sla_breach_at) < new Date()
          ? 'breached'
          : conv.sla_breach_at && new Date(conv.sla_breach_at).getTime() - new Date().getTime() < 2 * 60 * 60 * 1000
            ? 'at_risk'
            : 'on_track'
    })) as ConversationRow[];
    
    // Log session debugging info
    if (recoveryData && recoveryData.length > 0) {
      logger.debug('Session recovery data loaded', {
        session_uid: recoveryData[0]?.session_uid,
        organization_id: recoveryData[0]?.organization_id,
        total_conversations: recoveryData.length,
        inbox_filter: inboxUuid
      }, 'SessionRecovery');
    }
    
    return applyFilters(conversations, params);
  } catch (error) {
    logger.error('Failed to list conversations', error, 'listConversations');
    
    // Return empty array for auth errors
    if (isAuthError(error)) {
      return [];
    }
    
    return [];
  }
}

// Helper function to apply filters
function applyFilters(conversations: ConversationRow[], params: {
  inboxId?: InboxId;
  status: StatusFilter;
  q?: string;
  page?: number;
  priority?: string;
  assigneeId?: string;
  dateFrom?: string;
  dateTo?: string;
}): ConversationRow[] {
  let filtered = conversations;
  
  // Apply inbox filter
  if (params.inboxId && params.inboxId !== 'all') {
    filtered = filtered.filter(c => c.inboxId === params.inboxId);
  }
  
  // Apply status filter
  if (params.status !== 'all') {
    switch (params.status) {
      case 'unread':
        filtered = filtered.filter(c => c.unread);
        break;
      case 'assigned':
        filtered = filtered.filter(c => !!c.assignee);
        break;
      case 'pending':
        filtered = filtered.filter(c => c.status === 'pending');
        break;
      case 'closed':
        filtered = filtered.filter(c => c.status === 'closed');
        break;
      case 'archived':
        filtered = filtered.filter(c => c.isArchived);
        break;
    }
  }
  
  // Apply priority filter
  if (params.priority && params.priority !== 'all') {
    filtered = filtered.filter(c => c.priority === params.priority);
  }
  
  // Apply assignee filter
  if (params.assigneeId) {
    filtered = filtered.filter(c => c.customerId === params.assigneeId);
  }
  
  // Apply date range filter
  if (params.dateFrom) {
    const fromDate = new Date(params.dateFrom);
    filtered = filtered.filter(c => new Date(c.updatedAt) >= fromDate);
  }
  
  if (params.dateTo) {
    const toDate = new Date(params.dateTo);
    toDate.setHours(23, 59, 59, 999); // End of day
    filtered = filtered.filter(c => new Date(c.updatedAt) <= toDate);
  }
  
  // Apply search
  if (params.q) {
    const query = params.q.toLowerCase();
    filtered = filtered.filter(c => 
      c.subject.toLowerCase().includes(query) ||
      c.preview.toLowerCase().includes(query) ||
      c.fromName?.toLowerCase().includes(query)
    );
  }
  
  return filtered;
}

/**
 * Get conversation thread with messages
 */
export async function getThread(
  conversationId: ConversationId, 
  options?: { 
    limit?: number; 
    offset?: number; 
    maxMessages?: number 
  }
): Promise<ConversationThread | null> {
  try {
    const limit = options?.limit || 100; // Default to 100 messages per load
    const offset = options?.offset || 0;
    const maxMessages = options?.maxMessages || 1000; // Hard limit to prevent issues
    
    // Fetch conversation details
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*, customer:customers(*)')
      .eq('id', conversationId)
      .single();
    
    if (convError) {
      logger.error('Error fetching conversation', convError, 'getThread');
      throw convError;
    }
    
    // Get total message count first
    const { count: totalCount, error: countError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId);
    
    if (countError) {
      logger.error('Error counting messages', countError, 'getThread');
    }
    
    // Warn if conversation has too many messages
    if (totalCount && totalCount > maxMessages) {
      logger.warn('Conversation has excessive messages', {
        conversationId,
        totalCount,
        maxMessages,
        loadingLimit: Math.min(limit, maxMessages)
      }, 'getThread');
    }
    
    // Fetch messages with pagination (limit to maxMessages)
    const effectiveLimit = Math.min(limit, maxMessages - offset);
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .range(offset, offset + effectiveLimit - 1);
    
    if (messagesError) {
      logger.error('Error fetching messages', messagesError, 'getThread');
      throw messagesError;
    }
    
    return {
      id: conversationId,
      subject: conversation?.subject,
      customer: conversation?.customer,
      messages: (messages || []).map((msg: any) => ({
        id: msg.id,
        author: msg.sender_type === 'customer' ? 
          (conversation?.customer?.full_name || 'Customer') : 
          'Agent',
        content: msg.content,
        bodyText: msg.content,
        createdAt: msg.created_at,
        inbound: msg.sender_type === 'customer',
        senderType: msg.sender_type,
        isInternal: msg.is_internal
      })) as Message[],
      totalMessages: totalCount || 0,
      hasMore: totalCount ? (offset + effectiveLimit < Math.min(totalCount, maxMessages)) : false
    };
  } catch (error) {
    logger.error('Failed to get thread', error, 'getThread');
    return null;
  }
}

/**
 * Archive conversations
 */
export async function archiveConversations(conversationIds: ConversationId[]): Promise<void> {
  try {
    const { error } = await supabase
      .from('conversations')
      .update({ is_archived: true, updated_at: new Date().toISOString() })
      .in('id', conversationIds);
    
    if (error) {
      logger.error('Error archiving conversations', error, 'archiveConversations');
      throw error;
    }
    
    logger.info('Conversations archived successfully', { count: conversationIds.length }, 'archiveConversations');
  } catch (error) {
    logger.error('Failed to archive conversations', error, 'archiveConversations');
    throw error;
  }
}

/**
 * Unarchive conversations
 */
export async function unarchiveConversations(conversationIds: ConversationId[]): Promise<void> {
  try {
    const { error } = await supabase
      .from('conversations')
      .update({ is_archived: false, updated_at: new Date().toISOString() })
      .in('id', conversationIds);
    
    if (error) {
      logger.error('Error unarchiving conversations', error, 'unarchiveConversations');
      throw error;
    }
    
    logger.info('Conversations unarchived successfully', { count: conversationIds.length }, 'unarchiveConversations');
  } catch (error) {
    logger.error('Failed to unarchive conversations', error, 'unarchiveConversations');
    throw error;
  }
}

/**
 * Bulk assign conversations to an agent
 */
export async function bulkAssignConversations(conversationIds: ConversationId[], assigneeId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('conversations')
      .update({ assigned_to_id: assigneeId, updated_at: new Date().toISOString() })
      .in('id', conversationIds);
    
    if (error) {
      logger.error('Error bulk assigning conversations', error, 'bulkAssignConversations');
      throw error;
    }
    
    logger.info('Conversations assigned successfully', { count: conversationIds.length, assigneeId }, 'bulkAssignConversations');
  } catch (error) {
    logger.error('Failed to bulk assign conversations', error, 'bulkAssignConversations');
    throw error;
  }
}

/**
 * Post a reply to a conversation
 */
export async function postReply(conversationId: ConversationId, payload: { body: string; status?: string }): Promise<void> {
  try {
    const { error: insertError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        content: payload.body,
        sender_type: 'agent',
        is_internal: false,
        content_type: 'text/plain'
      });
    
    if (insertError) {
      logger.error('Error posting reply', insertError, 'postReply');
      throw insertError;
    }
    
    // Update conversation status after agent reply
    const newStatus = payload.status || 'pending';
    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        status: newStatus,
        is_read: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);
    
    if (updateError) {
      logger.error('Error updating conversation status', updateError, 'postReply');
      // Don't throw - reply was successful, status update is secondary
    }
    
    logger.info('Reply posted successfully', { conversationId, status: newStatus }, 'postReply');
  } catch (error) {
    logger.error('Failed to post reply', error, 'postReply');
    throw error;
  }
}
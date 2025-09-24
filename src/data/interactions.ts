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
  'insufficient_permissions'
];

const isAuthError = (error: any): boolean => {
  return AUTH_ERROR_CODES.some(code => 
    error?.message?.includes(code) || error?.code === code
  );
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
}): Promise<ConversationRow[]> {
  try {
    const { data, error } = await supabase.rpc('get_conversations');
    
    if (error) {
      logger.error('Error fetching conversations', error, 'listConversations');
      
      // Return empty array for auth errors instead of throwing  
      if (isAuthError(error)) {
        logger.warn('Auth error detected, returning empty conversations', error);
        return [];
      }
      
      throw error;
    }
    
    let conversations = (data || []).map((conv: any) => ({
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
      isArchived: conv.is_archived
    })) as ConversationRow[];
    
    // Apply filters
    if (params.inboxId && params.inboxId !== 'all') {
      conversations = conversations.filter(c => c.inboxId === params.inboxId);
    }
    
    if (params.status !== 'all') {
      switch (params.status) {
        case 'unread':
          conversations = conversations.filter(c => c.unread);
          break;
        case 'assigned':
          conversations = conversations.filter(c => !!c.assignee);
          break;
        case 'pending':
          conversations = conversations.filter(c => c.status === 'pending');
          break;
        case 'closed':
          conversations = conversations.filter(c => c.status === 'closed');
          break;
        case 'archived':
          conversations = conversations.filter(c => c.isArchived);
          break;
      }
    }
    
    // Apply search
    if (params.q) {
      const query = params.q.toLowerCase();
      conversations = conversations.filter(c => 
        c.subject.toLowerCase().includes(query) ||
        c.preview.toLowerCase().includes(query) ||
        c.fromName?.toLowerCase().includes(query)
      );
    }
    
    return conversations;
  } catch (error) {
    logger.error('Failed to list conversations', error, 'listConversations');
    
    // Return empty array for auth errors
    if (isAuthError(error)) {
      return [];
    }
    
    return [];
  }
}

/**
 * Get conversation thread with messages
 */
export async function getThread(conversationId: ConversationId): Promise<ConversationThread | null> {
  try {
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
    
    // Fetch messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    
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
      })) as Message[]
    };
  } catch (error) {
    logger.error('Failed to get thread', error, 'getThread');
    return null;
  }
}

/**
 * Post a reply to a conversation
 */
export async function postReply(conversationId: ConversationId, payload: { body: string }): Promise<void> {
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
    
    logger.info('Reply posted successfully', { conversationId }, 'postReply');
  } catch (error) {
    logger.error('Failed to post reply', error, 'postReply');
    throw error;
  }
}
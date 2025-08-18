import { supabase } from '@/integrations/supabase/client';
import { PaginationParams, PaginationResponse } from '@/types/pagination';

export interface Conversation {
  id: string;
  subject: string;
  status: "open" | "pending" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  is_read: boolean;
  is_archived?: boolean;
  channel: "email" | "chat" | "phone" | "social";
  updated_at: string;
  received_at?: string;
  inbox_id?: string;
  customer?: {
    id: string;
    full_name: string;
    email: string;
  };
  assigned_to?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  snooze_until?: string;
}

export interface ConversationFilters {
  status?: string;
  priority?: string;
  channel?: string;
  assigned_to?: string;
  inbox_id?: string;
  is_archived?: boolean;
  search?: string;
}

export async function fetchConversationsPaginated(
  params: PaginationParams & { filters?: ConversationFilters }
): Promise<PaginationResponse<Conversation>> {
  const { page, pageSize, sort = 'updated_at', sortDirection = 'desc', filters = {} } = params;
  
  // Calculate offset
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // For now, use the existing RPC function and implement client-side pagination
  // In a real implementation, you'd want server-side pagination
  const { data, error } = await supabase.rpc('get_conversations');
  
  if (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }

  let conversations = (data as any[])?.map(conv => ({
    ...conv,
    customer: conv.customer ? {
      id: conv.customer.id,
      full_name: conv.customer.full_name,
      email: conv.customer.email,
    } : undefined,
    assigned_to: conv.assigned_to ? {
      id: conv.assigned_to.id,
      full_name: conv.assigned_to.full_name,
      avatar_url: conv.assigned_to.avatar_url,
    } : undefined,
  })) as Conversation[] || [];

  // Apply filters
  if (filters.status && filters.status !== 'all') {
    conversations = conversations.filter(c => c.status === filters.status);
  }
  
  if (filters.priority && filters.priority !== 'all') {
    conversations = conversations.filter(c => c.priority === filters.priority);
  }
  
  if (filters.channel && filters.channel !== 'all') {
    conversations = conversations.filter(c => c.channel === filters.channel);
  }
  
  if (filters.assigned_to && filters.assigned_to !== 'all') {
    if (filters.assigned_to === 'unassigned') {
      conversations = conversations.filter(c => !c.assigned_to);
    } else {
      conversations = conversations.filter(c => c.assigned_to?.id === filters.assigned_to);
    }
  }
  
  if (filters.inbox_id && filters.inbox_id !== 'all') {
    conversations = conversations.filter(c => c.inbox_id === filters.inbox_id);
  }
  
  if (filters.is_archived !== undefined) {
    conversations = conversations.filter(c => Boolean(c.is_archived) === filters.is_archived);
  } else {
    // Default to showing non-archived conversations
    conversations = conversations.filter(c => !c.is_archived);
  }
  
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    conversations = conversations.filter(c => 
      c.subject?.toLowerCase().includes(searchLower) ||
      c.customer?.full_name?.toLowerCase().includes(searchLower) ||
      c.customer?.email?.toLowerCase().includes(searchLower)
    );
  }

  // Apply sorting
  conversations.sort((a, b) => {
    const aValue = a[sort as keyof Conversation] as any;
    const bValue = b[sort as keyof Conversation] as any;
    
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const totalCount = conversations.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  
  // Apply pagination
  const paginatedData = conversations.slice(from, from + pageSize);

  return {
    data: paginatedData,
    totalCount,
    totalPages,
    currentPage: page,
    pageSize,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
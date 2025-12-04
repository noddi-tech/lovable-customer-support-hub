import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SearchFilters {
  status?: string;
  inboxId?: string;
  assignedToId?: string;
  dateFrom?: string;
  dateTo?: string;
  hasAttachments?: boolean;
  isUnread?: boolean;
}

export interface SearchResult {
  id: string;
  type: 'conversation' | 'customer' | 'message';
  subject?: string;
  preview?: string;
  content?: string;
  customer_name?: string;
  customer_email?: string;
  customer_id?: string;
  conversation_id?: string;
  inbox_id?: string;
  inbox_name?: string;
  status?: string;
  sender_type?: string;
  created_at?: string;
  updated_at?: string;
  conversation_count?: number;
  relevance?: number;
}

interface UseGlobalSearchParams {
  query: string;
  type: 'conversations' | 'customers' | 'messages';
  filters?: SearchFilters;
  enabled?: boolean;
}

interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  nextOffset: number;
}

export const useGlobalSearch = ({ 
  query, 
  type, 
  filters = {}, 
  enabled = true 
}: UseGlobalSearchParams) => {
  return useInfiniteQuery({
    queryKey: ['global-search', query, type, filters],
    enabled: enabled && query.length >= 2,
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }): Promise<SearchResponse> => {
      const pageSize = 25;
      
      // Build the search query based on type
      if (type === 'conversations') {
        let queryBuilder = supabase
          .from('conversations')
          .select(`
            id,
            subject,
            status,
            preview_text,
            updated_at,
            is_read,
            inbox_id,
            customer:customers(id, full_name, email),
            inbox:inboxes(id, name)
          `, { count: 'exact' })
          .or(`subject.ilike.%${query}%,preview_text.ilike.%${query}%`)
          .order('updated_at', { ascending: false })
          .range(pageParam, pageParam + pageSize - 1);
        
        // Apply filters
        if (filters.status && filters.status !== 'all') {
          queryBuilder = queryBuilder.eq('status', filters.status);
        }
        if (filters.inboxId && filters.inboxId !== 'all') {
          queryBuilder = queryBuilder.eq('inbox_id', filters.inboxId);
        }
        if (filters.assignedToId && filters.assignedToId !== 'all') {
          if (filters.assignedToId === 'unassigned') {
            queryBuilder = queryBuilder.is('assigned_to_id', null);
          } else {
            queryBuilder = queryBuilder.eq('assigned_to_id', filters.assignedToId);
          }
        }
        if (filters.dateFrom) {
          queryBuilder = queryBuilder.gte('created_at', filters.dateFrom);
        }
        if (filters.dateTo) {
          queryBuilder = queryBuilder.lte('created_at', filters.dateTo);
        }
        if (filters.isUnread) {
          queryBuilder = queryBuilder.eq('is_read', false);
        }
        
        const { data, error, count } = await queryBuilder;
        
        if (error) throw error;
        
        const results: SearchResult[] = (data || []).map((conv: any) => ({
          id: conv.id,
          type: 'conversation' as const,
          subject: conv.subject,
          preview: conv.preview_text,
          customer_name: conv.customer?.full_name,
          customer_email: conv.customer?.email,
          customer_id: conv.customer?.id,
          inbox_id: conv.inbox_id,
          inbox_name: conv.inbox?.name,
          status: conv.status,
          updated_at: conv.updated_at,
        }));
        
        return {
          results,
          totalCount: count || 0,
          nextOffset: pageParam + pageSize,
        };
      }
      
      if (type === 'customers') {
        const { data, error, count } = await supabase
          .from('customers')
          .select('id, full_name, email, created_at', { count: 'exact' })
          .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
          .order('full_name')
          .range(pageParam, pageParam + pageSize - 1);
        
        if (error) throw error;
        
        // Get conversation counts for each customer
        const customerIds = (data || []).map((c: any) => c.id);
        const { data: convCounts } = await supabase
          .from('conversations')
          .select('customer_id')
          .in('customer_id', customerIds);
        
        const countMap: Record<string, number> = {};
        (convCounts || []).forEach((c: any) => {
          countMap[c.customer_id] = (countMap[c.customer_id] || 0) + 1;
        });
        
        const results: SearchResult[] = (data || []).map((cust: any) => ({
          id: cust.id,
          type: 'customer' as const,
          customer_name: cust.full_name,
          customer_email: cust.email,
          created_at: cust.created_at,
          conversation_count: countMap[cust.id] || 0,
        }));
        
        return {
          results,
          totalCount: count || 0,
          nextOffset: pageParam + pageSize,
        };
      }
      
      if (type === 'messages') {
        let queryBuilder = supabase
          .from('messages')
          .select(`
            id,
            content,
            sender_type,
            created_at,
            conversation_id,
            email_subject,
            conversation:conversations(
              id,
              subject,
              customer:customers(id, full_name, email)
            )
          `, { count: 'exact' })
          .ilike('content', `%${query}%`)
          .order('created_at', { ascending: false })
          .range(pageParam, pageParam + pageSize - 1);
        
        const { data, error, count } = await queryBuilder;
        
        if (error) throw error;
        
        const results: SearchResult[] = (data || []).map((msg: any) => ({
          id: msg.id,
          type: 'message' as const,
          content: msg.content?.substring(0, 300),
          subject: msg.email_subject || msg.conversation?.subject,
          sender_type: msg.sender_type,
          created_at: msg.created_at,
          conversation_id: msg.conversation_id,
          customer_name: msg.conversation?.customer?.full_name,
          customer_email: msg.conversation?.customer?.email,
        }));
        
        return {
          results,
          totalCount: count || 0,
          nextOffset: pageParam + pageSize,
        };
      }
      
      return { results: [], totalCount: 0, nextOffset: 0 };
    },
    getNextPageParam: (lastPage) => {
      return lastPage.nextOffset < lastPage.totalCount ? lastPage.nextOffset : undefined;
    },
  });
};

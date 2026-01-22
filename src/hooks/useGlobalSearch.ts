import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeForPostgrest } from '@/utils/queryUtils';

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
      // Sanitize query to prevent PostgREST filter injection
      const safeQuery = sanitizeForPostgrest(query);
      
      // Build the search query based on type
      if (type === 'conversations') {
        // First, find customers matching the search query
        const { data: matchingCustomers } = await supabase
          .from('customers')
          .select('id')
          .or(`full_name.ilike.%${safeQuery}%,email.ilike.%${safeQuery}%`);
        
        const customerIds = matchingCustomers?.map(c => c.id) || [];
        
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
          `, { count: 'exact' });
        
        // Search in subject, preview_text, OR if customer matches
        if (customerIds.length > 0) {
          queryBuilder = queryBuilder.or(`subject.ilike.%${safeQuery}%,preview_text.ilike.%${safeQuery}%,customer_id.in.(${customerIds.join(',')})`);
        } else {
          queryBuilder = queryBuilder.or(`subject.ilike.%${safeQuery}%,preview_text.ilike.%${safeQuery}%`);
        }
        
        queryBuilder = queryBuilder
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
          .or(`full_name.ilike.%${safeQuery}%,email.ilike.%${safeQuery}%`)
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
          .ilike('content', `%${safeQuery}%`)
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

// Hook to get counts for all search types
export const useGlobalSearchCounts = ({ query, filters = {} }: { query: string; filters?: SearchFilters }) => {
  return useQuery({
    queryKey: ['global-search-counts', query, filters],
    enabled: query.length >= 2,
    queryFn: async () => {
      // Sanitize query to prevent PostgREST filter injection
      const safeQuery = sanitizeForPostgrest(query);
      
      // Run all 3 count queries in parallel
      const [conversationsResult, customersResult, messagesResult] = await Promise.all([
        // Conversations count - include customer name search
        (async () => {
          const { data: matchingCustomers } = await supabase
            .from('customers')
            .select('id')
            .or(`full_name.ilike.%${safeQuery}%,email.ilike.%${safeQuery}%`);
          
          const customerIds = matchingCustomers?.map(c => c.id) || [];
          
          let qb = supabase
            .from('conversations')
            .select('id', { count: 'exact', head: true });
          
          if (customerIds.length > 0) {
            qb = qb.or(`subject.ilike.%${safeQuery}%,preview_text.ilike.%${safeQuery}%,customer_id.in.(${customerIds.join(',')})`);
          } else {
            qb = qb.or(`subject.ilike.%${safeQuery}%,preview_text.ilike.%${safeQuery}%`);
          }
          
          // Apply filters
          if (filters.status && filters.status !== 'all') {
            qb = qb.eq('status', filters.status);
          }
          if (filters.inboxId && filters.inboxId !== 'all') {
            qb = qb.eq('inbox_id', filters.inboxId);
          }
          
          return qb;
        })(),
        
        // Customers count
        supabase
          .from('customers')
          .select('id', { count: 'exact', head: true })
          .or(`full_name.ilike.%${safeQuery}%,email.ilike.%${safeQuery}%`),
        
        // Messages count
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .ilike('content', `%${safeQuery}%`)
      ]);
      
      return {
        conversations: conversationsResult.count || 0,
        customers: customersResult.count || 0,
        messages: messagesResult.count || 0
      };
    },
    staleTime: 30000, // Cache for 30 seconds
  });
};

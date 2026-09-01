import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  isNoddiNoteId,
  noddiNotesApi,
  parseNoddiNoteId,
  toNoddiNoteId,
  useNoddiNotes,
  useNoddiUserGroupIdForCustomer,
} from '@/hooks/useNoddiNotes';

const sel = (s: string): string => s;

export interface CustomerIdentity {
  id: string;
  identity_type: 'email' | 'phone' | 'navio_user_id' | 'widget_visitor' | 'external';
  value: string;
  is_primary: boolean;
  verified: boolean;
  created_at: string;
}

export interface CustomerNote {
  id: string;
  content: string;
  is_pinned: boolean;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
  author?: { id: string; full_name: string | null } | null;
  /** Where the note is stored: the Support Hub database or Noddi. */
  source?: 'local' | 'noddi';
}

export interface CustomerConversationSummary {
  id: string;
  subject: string | null;
  channel: string;
  status: string;
  case_id: string | null;
  preview_text: string | null;
  updated_at: string;
  received_at: string | null;
}

export function useCustomer(customerId?: string | null) {
  return useQuery({
    queryKey: ['customer-record', 'customer', customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('customers') as any)
        .select(sel('id, full_name, email, phone, organization_id, metadata, created_at'))
        .eq('id', customerId)
        .maybeSingle();
      if (error) throw error;
      return data as {
        id: string;
        full_name: string | null;
        email: string | null;
        phone: string | null;
        organization_id: string;
        metadata: Record<string, unknown> | null;
        created_at: string;
      } | null;
    },
  });
}

export function useCustomerIdentities(customerId?: string | null) {
  return useQuery({
    queryKey: ['customer-record', 'identities', customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('customer_identities') as any)
        .select(sel('id, identity_type, value, is_primary, verified, created_at'))
        .eq('customer_id', customerId)
        .order('is_primary', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CustomerIdentity[];
    },
  });
}

export function useCustomerConversations(customerId?: string | null, excludeConversationId?: string | null) {
  return useQuery({
    queryKey: ['customer-record', 'conversations', customerId, excludeConversationId],
    enabled: !!customerId,
    queryFn: async () => {
      let q = (supabase.from('conversations') as any)
        .select(sel('id, subject, channel, status, case_id, preview_text, updated_at, received_at'))
        .eq('customer_id', customerId)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(100);
      if (excludeConversationId) q = q.neq('id', excludeConversationId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CustomerConversationSummary[];
    },
  });
}

export function useCustomerCalls(customerId?: string | null) {
  return useQuery({
    queryKey: ['customer-record', 'calls', customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('calls') as any)
        .select(sel('id, direction, status, started_at, ended_at, duration_seconds, case_id'))
        .eq('customer_id', customerId)
        .order('started_at', { ascending: false })
        .limit(50);
      if (error) return [];
      return (data ?? []) as Array<{
        id: string;
        direction: string | null;
        status: string | null;
        started_at: string | null;
        ended_at: string | null;
        duration_seconds: number | null;
        case_id: string | null;
      }>;
    },
  });
}

export function useCustomerSummary(customerIdentifier?: string | null) {
  return useQuery({
    queryKey: ['customer-record', 'summary', customerIdentifier],
    enabled: !!customerIdentifier,
    queryFn: async () => {
      const { data, error } = await (supabase.from('customer_summaries') as any)
        .select(sel('id, summary_text, total_conversations, first_seen_at, last_seen_at, sentiment_trend'))
        .eq('customer_identifier', customerIdentifier)
        .maybeSingle();
      if (error) return null;
      return data as {
        id: string;
        summary_text: string | null;
        total_conversations: number | null;
        first_seen_at: string | null;
        last_seen_at: string | null;
        sentiment_trend: string | null;
      } | null;
    },
  });
}

export function useCustomerMemories(customerIdentifier?: string | null) {
  return useQuery({
    queryKey: ['customer-record', 'memories', customerIdentifier],
    enabled: !!customerIdentifier,
    queryFn: async () => {
      const { data, error } = await (supabase.from('customer_memories') as any)
        .select(sel('id, memory_type, memory_text, confidence, created_at'))
        .eq('customer_identifier', customerIdentifier)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) return [];
      return (data ?? []) as Array<{
        id: string;
        memory_type: string;
        memory_text: string;
        confidence: number | null;
        created_at: string;
      }>;
    },
  });
}

/**
 * Notes shown for a customer: local Support Hub notes plus the notes stored in
 * Noddi (`/v1/user-group-notes/`) when the customer maps to a Noddi user group.
 * Noddi notes are written straight through so both systems stay in sync.
 */
export function useCustomerNotes(customerId?: string | null) {
  const dbQuery = useQuery({
    queryKey: ['customer-record', 'notes', customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('customer_notes') as any)
        .select(
          sel('id, content, is_pinned, created_by_id, created_at, updated_at, author:profiles(id, full_name)'),
        )
        .eq('customer_id', customerId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CustomerNote[];
    },
  });

  const { data: userGroupId } = useNoddiUserGroupIdForCustomer(customerId);
  const noddiQuery = useNoddiNotes(userGroupId);

  const data = useMemo<CustomerNote[]>(() => {
    const local = dbQuery.data ?? [];
    const remote: CustomerNote[] = (noddiQuery.data ?? []).map((n) => ({
      id: toNoddiNoteId(n.id),
      content: n.content,
      is_pinned: false,
      created_by_id: null,
      created_at: n.created_at,
      updated_at: n.updated_at ?? n.created_at,
      author: n.author_name ? { id: 'noddi', full_name: n.author_name } : null,
      source: 'noddi',
    }));
    return [...local.map((n) => ({ ...n, source: 'local' as const })), ...remote].sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [dbQuery.data, noddiQuery.data]);

  return { ...dbQuery, data, isNoddiLinked: !!userGroupId };
}

export function useCustomerNoteMutations(customerId?: string | null) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { data: userGroupId } = useNoddiUserGroupIdForCustomer(customerId);
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['customer-record', 'notes', customerId] });
    queryClient.invalidateQueries({ queryKey: ['noddi-notes', 'list', userGroupId] });
  };

  const addNote = useMutation({
    mutationFn: async ({ content, isPinned }: { content: string; isPinned?: boolean }) => {
      if (!customerId || !profile?.organization_id) throw new Error('Missing customer');
      // Customers known to Noddi get their notes written to Noddi so agents on
      // both sides see the same history; everyone else keeps a local note.
      if (userGroupId) {
        await noddiNotesApi.create(userGroupId, content);
        return;
      }
      const { error } = await (supabase.from('customer_notes') as any).insert({
        organization_id: profile.organization_id,
        customer_id: customerId,
        content,
        is_pinned: isPinned ?? false,
        created_by_id: profile.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success(userGroupId ? 'Note saved to Noddi' : 'Note added');
    },
    onError: (error: any) => toast.error(error?.message ?? 'Could not add note'),
  });

  const updateNote = useMutation({
    mutationFn: async ({ id, content, isPinned }: { id: string; content?: string; isPinned?: boolean }) => {
      if (isNoddiNoteId(id)) {
        if (content === undefined) throw new Error('Noddi notes cannot be pinned');
        await noddiNotesApi.update(parseNoddiNoteId(id), content);
        return;
      }
      const updates: Record<string, unknown> = {};
      if (content !== undefined) updates.content = content;
      if (isPinned !== undefined) updates.is_pinned = isPinned;
      const { error } = await (supabase.from('customer_notes') as any).update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (error: any) => toast.error(error?.message ?? 'Could not update note'),
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      if (isNoddiNoteId(id)) {
        await noddiNotesApi.remove(parseNoddiNoteId(id));
        return;
      }
      const { error } = await (supabase.from('customer_notes') as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Note deleted');
    },
    onError: (error: any) => toast.error(error?.message ?? 'Could not delete note'),
  });

  return { addNote, updateNote, deleteNote, noddiUserGroupId: userGroupId ?? null };
}

export function useAddCustomerIdentity(customerId?: string | null) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ type, value }: { type: CustomerIdentity['identity_type']; value: string }) => {
      if (!customerId || !profile?.organization_id) throw new Error('Missing customer');
      const { error } = await (supabase.from('customer_identities') as any).insert({
        organization_id: profile.organization_id,
        customer_id: customerId,
        identity_type: type,
        value,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-record', 'identities', customerId] });
      toast.success('Identity added');
    },
    onError: (error: any) => toast.error(error?.message ?? 'Could not add identity'),
  });
}

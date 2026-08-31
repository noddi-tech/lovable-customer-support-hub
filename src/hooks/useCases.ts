import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type CaseStatus =
  | 'open'
  | 'in_progress'
  | 'waiting_customer'
  | 'waiting_internal'
  | 'resolved'
  | 'closed';

export type CasePriority = 'low' | 'normal' | 'high' | 'urgent';

export const OPEN_CASE_STATUSES: CaseStatus[] = [
  'open',
  'in_progress',
  'waiting_customer',
  'waiting_internal',
];

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  waiting_customer: 'Waiting on customer',
  waiting_internal: 'Waiting internally',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const CASE_PRIORITY_LABELS: Record<CasePriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

export interface CaseRecord {
  id: string;
  organization_id: string;
  case_number: number;
  customer_id: string | null;
  title: string;
  description: string | null;
  status: CaseStatus;
  priority: CasePriority;
  category_id: string | null;
  owner_id: string | null;
  inbox_id: string | null;
  source_channel: string | null;
  due_at: string | null;
  first_response_due_at: string | null;
  resolution_due_at: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  resolution_code_id: string | null;
  resolution_notes: string | null;
  navio_ticket_id: string | null;
  created_by_id: string | null;
  created_at: string;
  updated_at: string;
  category?: { id: string; name: string } | null;
  owner?: { id: string; full_name: string | null; avatar_url: string | null } | null;
  customer?: { id: string; full_name: string | null; email: string | null } | null;
  resolution_code?: { id: string; name: string } | null;
}

export type CaseQueueView =
  | 'mine'
  | 'overdue'
  | 'unassigned'
  | 'waiting'
  | 'open'
  | 'closed'
  | 'all';

const CASE_SELECT =
  'id, organization_id, case_number, customer_id, title, description, status, priority, category_id, owner_id, inbox_id, source_channel, due_at, first_response_due_at, resolution_due_at, first_response_at, resolved_at, closed_at, resolution_code_id, resolution_notes, navio_ticket_id, created_by_id, created_at, updated_at, category:case_categories(id, name), owner:profiles!cases_owner_id_fkey(id, full_name, avatar_url), customer:customers(id, full_name, email), resolution_code:case_resolution_codes(id, name)';

// Keep select strings as plain `string` so supabase-js does not parse them at the type level.
const sel = (s: string): string => s;

export interface CaseFilters {
  view?: CaseQueueView;
  search?: string;
  categoryId?: string;
  priority?: CasePriority;
  ownerId?: string;
  customerId?: string;
}

export function useCases(filters: CaseFilters = {}) {
  const { profile } = useAuth();
  const profileId = profile?.id;

  return useQuery({
    queryKey: ['cases', filters, profileId],
    enabled: !!profile?.organization_id,
    queryFn: async () => {
      let q = (supabase.from('cases') as any)
        .select(sel(CASE_SELECT))
        .order('due_at', { ascending: true, nullsFirst: false })
        .limit(500);

      switch (filters.view) {
        case 'mine':
          q = q.eq('owner_id', profileId ?? '').in('status', OPEN_CASE_STATUSES);
          break;
        case 'overdue':
          q = q.in('status', OPEN_CASE_STATUSES).lt('due_at', new Date().toISOString());
          break;
        case 'unassigned':
          q = q.is('owner_id', null).in('status', OPEN_CASE_STATUSES);
          break;
        case 'waiting':
          q = q.in('status', ['waiting_customer', 'waiting_internal']);
          break;
        case 'closed':
          q = q.in('status', ['resolved', 'closed']);
          break;
        case 'all':
          break;
        case 'open':
        default:
          q = q.in('status', OPEN_CASE_STATUSES);
          break;
      }

      if (filters.categoryId) q = q.eq('category_id', filters.categoryId);
      if (filters.priority) q = q.eq('priority', filters.priority);
      if (filters.ownerId) q = q.eq('owner_id', filters.ownerId);
      if (filters.customerId) q = q.eq('customer_id', filters.customerId);
      if (filters.search) {
        const term = filters.search.replace(/[%,]/g, '');
        q = q.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CaseRecord[];
    },
  });
}

export function useCase(caseId?: string | null) {
  return useQuery({
    queryKey: ['case', caseId],
    enabled: !!caseId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('cases') as any)
        .select(sel(CASE_SELECT))
        .eq('id', caseId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as CaseRecord | null;
    },
  });
}

export interface CaseEventRecord {
  id: string;
  case_id: string;
  actor_id: string | null;
  event_type: string;
  from_value: string | null;
  to_value: string | null;
  note: string | null;
  created_at: string;
  actor?: { id: string; full_name: string | null } | null;
}

export function useCaseEvents(caseId?: string | null) {
  return useQuery({
    queryKey: ['case-events', caseId],
    enabled: !!caseId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('case_events') as any)
        .select(
          sel(
            'id, case_id, actor_id, event_type, from_value, to_value, note, created_at, actor:profiles(id, full_name)',
          ),
        )
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CaseEventRecord[];
    },
  });
}

export function useCaseConversations(caseId?: string | null) {
  return useQuery({
    queryKey: ['case-conversations', caseId],
    enabled: !!caseId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('conversations') as any)
        .select(sel('id, subject, channel, status, updated_at, preview_text, received_at'))
        .eq('case_id', caseId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; subject: string | null; channel: string; status: string; updated_at: string; preview_text: string | null; received_at: string | null }>;
    },
  });
}

export interface CaseActivityItem {
  id: string;
  kind: 'conversation' | 'call' | 'chat';
  at: string;
  title: string;
  subtitle?: string | null;
  status?: string | null;
  href?: string | null;
}

/** Everything attached to a case: email/chat conversations, calls and chat sessions. */
export function useCaseActivity(caseId?: string | null) {
  return useQuery({
    queryKey: ['case-activity', caseId],
    enabled: !!caseId,
    queryFn: async (): Promise<CaseActivityItem[]> => {
      const [convRes, callRes, chatRes] = await Promise.all([
        (supabase.from('conversations') as any)
          .select(sel('id, subject, channel, status, updated_at, preview_text'))
          .eq('case_id', caseId),
        (supabase.from('calls') as any)
          .select(sel('id, direction, status, started_at, duration_seconds'))
          .eq('case_id', caseId),
        (supabase.from('widget_chat_sessions') as any)
          .select(sel('id, status, started_at, conversation_id'))
          .eq('case_id', caseId),
      ]);

      const items: CaseActivityItem[] = [];

      for (const c of (convRes.data ?? []) as any[]) {
        items.push({
          id: `conversation:${c.id}`,
          kind: 'conversation',
          at: c.updated_at,
          title: c.subject || (c.channel === 'widget' ? 'Live chat' : '(no subject)'),
          subtitle: c.preview_text,
          status: c.status,
          href: `/c/${c.id}`,
        });
      }

      for (const call of (callRes.data ?? []) as any[]) {
        const mins = call.duration_seconds ? Math.round(call.duration_seconds / 60) : null;
        items.push({
          id: `call:${call.id}`,
          kind: 'call',
          at: call.started_at,
          title: call.direction === 'outbound' ? 'Outbound call' : 'Inbound call',
          subtitle: mins !== null ? `${mins} min` : null,
          status: call.status,
          href: null,
        });
      }

      for (const chat of (chatRes.data ?? []) as any[]) {
        items.push({
          id: `chat:${chat.id}`,
          kind: 'chat',
          at: chat.started_at,
          title: 'Chat session',
          status: chat.status,
          href: chat.conversation_id ? `/c/${chat.conversation_id}` : null,
        });
      }

      return items
        .filter((i) => !!i.at)
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    },
  });
}

export function useLinkChatSessionToCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, caseId }: { sessionId: string; caseId: string | null }) => {
      const { error } = await (supabase.from('widget_chat_sessions') as any)
        .update({ case_id: caseId })
        .eq('id', sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-activity'] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
    onError: (error: any) => toast.error(error?.message ?? 'Could not link chat session'),
  });
}

export function useCaseCategories() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['case-categories', profile?.organization_id],
    enabled: !!profile?.organization_id,
    queryFn: async () => {
      const { data, error } = await (supabase.from('case_categories') as any)
        .select(sel('id, name, slug, color, sort_order, is_active'))
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string; slug: string; color: string | null; sort_order: number; is_active: boolean }>;
    },
  });
}

export function useCaseResolutionCodes() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['case-resolution-codes', profile?.organization_id],
    enabled: !!profile?.organization_id,
    queryFn: async () => {
      const { data, error } = await (supabase.from('case_resolution_codes') as any)
        .select(sel('id, name, slug, sort_order, is_active'))
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string; slug: string; sort_order: number; is_active: boolean }>;
    },
  });
}

export interface CreateCaseInput {
  title: string;
  description?: string | null;
  customerId?: string | null;
  priority?: CasePriority;
  categoryId?: string | null;
  ownerId?: string | null;
  inboxId?: string | null;
  sourceChannel?: string | null;
  dueAt?: string | null;
  conversationId?: string | null;
}

export function useCreateCase() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCaseInput) => {
      if (!profile?.organization_id) throw new Error('Missing organization');

      const { data, error } = await (supabase.from('cases') as any)
        .insert({
          organization_id: profile.organization_id,
          title: input.title,
          description: input.description ?? null,
          customer_id: input.customerId ?? null,
          priority: input.priority ?? 'normal',
          category_id: input.categoryId ?? null,
          owner_id: input.ownerId ?? profile.id,
          inbox_id: input.inboxId ?? null,
          source_channel: input.sourceChannel ?? null,
          due_at: input.dueAt ?? null,
          created_by_id: profile.id,
        })
        .select('id, case_number')
        .single();
      if (error) throw error;

      if (input.conversationId) {
        const { error: linkError } = await (supabase.from('conversations') as any)
          .update({ case_id: data.id })
          .eq('id', input.conversationId);
        if (linkError) throw linkError;
      }

      return data as { id: string; case_number: number };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['customer-record'] });
      if (variables.conversationId) {
        queryClient.invalidateQueries({ queryKey: ['conversation-case', variables.conversationId] });
      }
      toast.success(`Case #${data.case_number} created`);
    },
    onError: (error: any) => toast.error(error?.message ?? 'Could not create case'),
  });
}

export function useUpdateCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { error } = await (supabase.from('cases') as any).update(updates).eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      queryClient.invalidateQueries({ queryKey: ['case-events', id] });
      queryClient.invalidateQueries({ queryKey: ['conversation-case'] });
      queryClient.invalidateQueries({ queryKey: ['customer-record'] });
    },
    onError: (error: any) => toast.error(error?.message ?? 'Could not update case'),
  });
}

export function useLinkConversationToCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, caseId }: { conversationId: string; caseId: string | null }) => {
      const { error } = await (supabase.from('conversations') as any)
        .update({ case_id: caseId })
        .eq('id', conversationId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conversation-case', variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['case-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      toast.success(variables.caseId ? 'Conversation linked to case' : 'Conversation unlinked');
    },
    onError: (error: any) => toast.error(error?.message ?? 'Could not link conversation'),
  });
}

export function useConversationCase(conversationId?: string | null, caseId?: string | null) {
  return useQuery({
    queryKey: ['conversation-case', conversationId, caseId],
    enabled: !!caseId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('cases') as any)
        .select(sel(CASE_SELECT))
        .eq('id', caseId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as CaseRecord | null;
    },
  });
}

/** SLA helpers */
export function getCaseSlaState(record: Pick<CaseRecord, 'status' | 'due_at' | 'resolution_due_at'>) {
  if (record.status === 'resolved' || record.status === 'closed') return 'done' as const;
  const due = record.due_at ?? record.resolution_due_at;
  if (!due) return 'none' as const;
  const diffMs = new Date(due).getTime() - Date.now();
  if (diffMs < 0) return 'breached' as const;
  if (diffMs < 2 * 60 * 60 * 1000) return 'at_risk' as const;
  return 'on_track' as const;
}

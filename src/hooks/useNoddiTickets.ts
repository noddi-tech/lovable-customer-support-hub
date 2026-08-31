import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  NoddiPaginated,
  NoddiTicket,
  NoddiTicketEvent,
  NoddiTicketListParams,
} from '@/types/noddiTicket';

/**
 * All ticket data lives in the Noddi backend API. This app never reads or writes
 * tickets from its own database — every call goes through the `noddi-tickets` proxy.
 */
async function invokeTickets<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('noddi-tickets', { body });
  if (error) {
    throw new Error(error.message || 'Noddi ticket API request failed');
  }
  if (data && typeof data === 'object' && 'error' in (data as Record<string, unknown>)) {
    const payload = data as { error: string; detail?: unknown };
    throw new Error(
      typeof payload.detail === 'string' ? payload.detail : payload.error || 'Noddi ticket API error',
    );
  }
  return data as T;
}

export const noddiTicketKeys = {
  all: ['noddi-tickets'] as const,
  list: (params: NoddiTicketListParams) => ['noddi-tickets', 'list', params] as const,
  detail: (id: number) => ['noddi-tickets', 'detail', id] as const,
  events: (id: number) => ['noddi-tickets', 'events', id] as const,
  departments: ['noddi-tickets', 'departments'] as const,
};

export function useNoddiTickets(params: NoddiTicketListParams) {
  return useQuery({
    queryKey: noddiTicketKeys.list(params),
    queryFn: () => invokeTickets<NoddiPaginated<NoddiTicket>>({ action: 'list', ...params }),
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });
}

export function useNoddiTicket(ticketId: number | null) {
  return useQuery({
    queryKey: noddiTicketKeys.detail(ticketId ?? 0),
    queryFn: () => invokeTickets<NoddiTicket>({ action: 'get', ticket_id: ticketId }),
    enabled: !!ticketId,
  });
}

export function useNoddiTicketEvents(ticketId: number | null) {
  return useQuery({
    queryKey: noddiTicketKeys.events(ticketId ?? 0),
    queryFn: async () => {
      const res = await invokeTickets<NoddiPaginated<NoddiTicketEvent>>({
        action: 'events',
        ticket_id: ticketId,
      });
      return res.results ?? [];
    },
    enabled: !!ticketId,
  });
}

export interface NoddiServiceDepartment {
  id: number;
  name: string;
}

export function useNoddiServiceDepartments() {
  return useQuery({
    queryKey: noddiTicketKeys.departments,
    queryFn: async () => {
      const res = await invokeTickets<NoddiPaginated<NoddiServiceDepartment> | NoddiServiceDepartment[]>({
        action: 'departments',
      });
      const list = Array.isArray(res) ? res : res.results ?? [];
      return list
        .map((d) => ({ id: d.id, name: d.name ?? `Department ${d.id}` }))
        .sort((a, b) => a.name.localeCompare(b.name, 'nb'));
    },
    staleTime: 10 * 60_000,
  });
}

function useTicketMutation<TVars>(
  fn: (vars: TVars) => Promise<unknown>,
  successMessage: string,
  ticketIdOf?: (vars: TVars) => number | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (_data, vars) => {
      const id = ticketIdOf?.(vars);
      queryClient.invalidateQueries({ queryKey: noddiTicketKeys.all });
      if (id) {
        queryClient.invalidateQueries({ queryKey: noddiTicketKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: noddiTicketKeys.events(id) });
      }
      toast.success(successMessage);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Ticket action failed');
    },
  });
}

export interface CreateNoddiTicketInput {
  title: string;
  description?: string;
  service_department_id: number;
  category?: string;
  priority?: string;
  type?: string;
  assignee_id?: number | null;
  user_group_id?: number | null;
  booking_id?: number | null;
  due_at?: string | null;
  tag_ids?: number[];
}

export function useCreateNoddiTicket() {
  return useTicketMutation<CreateNoddiTicketInput>(
    (input) => invokeTickets<NoddiTicket>({ action: 'create', ...input }),
    'Ticket created in Noddi',
  );
}

export function useUpdateNoddiTicket() {
  return useTicketMutation<{ ticket_id: number; patch: Record<string, unknown> }>(
    (vars) => invokeTickets<NoddiTicket>({ action: 'patch', ...vars }),
    'Ticket updated',
    (vars) => vars.ticket_id,
  );
}

export function useCommentNoddiTicket() {
  return useTicketMutation<{ ticket_id: number; comment: string; mentioned_user_ids?: number[] }>(
    (vars) => invokeTickets<NoddiTicketEvent>({ action: 'comment', ...vars }),
    'Comment added',
    (vars) => vars.ticket_id,
  );
}

export type NoddiTicketAction = 'resolve' | 'reopen' | 'archive' | 'restore' | 'snooze' | 'assign';

export function useNoddiTicketAction() {
  return useTicketMutation<{
    ticket_id: number;
    action: NoddiTicketAction;
    resolution_note?: string;
    snoozed_until?: string;
    assignee_id?: number | null;
  }>(
    (vars) => invokeTickets<NoddiTicket>({ ...vars }),
    'Ticket updated',
    (vars) => vars.ticket_id,
  );
}

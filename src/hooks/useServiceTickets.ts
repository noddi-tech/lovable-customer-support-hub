import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { 
  ServiceTicket, 
  CreateServiceTicketRequest,
  UpdateTicketStatusRequest 
} from '@/types/service-tickets';

export const useServiceTickets = () => {
  return useQuery({
    queryKey: ['service-tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_tickets')
        .select(`
          *,
          assigned_to:profiles!service_tickets_assigned_to_id_fkey(user_id, full_name, avatar_url),
          created_by:profiles!service_tickets_created_by_id_fkey(user_id, full_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as ServiceTicket[];
    },
  });
};

export const useCreateServiceTicket = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (request: CreateServiceTicketRequest) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('create-service-ticket', {
        body: request,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (!data?.ticket) throw new Error('Failed to create ticket');

      return data.ticket as ServiceTicket;
    },
    onSuccess: (ticket) => {
      queryClient.invalidateQueries({ queryKey: ['service-tickets'] });
      toast({
        title: 'Service Ticket Created',
        description: `${ticket.ticket_number}: ${ticket.title}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Create Ticket',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateTicketStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (request: UpdateTicketStatusRequest) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('update-ticket-status', {
        body: request,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      return data.ticket as ServiceTicket;
    },
    onSuccess: (ticket, variables) => {
      queryClient.invalidateQueries({ queryKey: ['service-tickets'] });
      toast({ title: 'Ticket Updated', description: `Status changed to ${variables.newStatus}` });
    },
  });
};

export const useUpdateServiceTicket = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      ticketId, 
      updates 
    }: { 
      ticketId: string; 
      updates: Record<string, any> 
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('update-service-ticket', {
        body: { ticketId, updates },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (!data?.ticket) throw new Error('Failed to update ticket');

      return data.ticket as ServiceTicket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['service-ticket'] });
      toast({ title: 'Ticket Updated', description: 'Changes saved successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Update Ticket',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteServiceTickets = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (ticketIds: string[]) => {
      const deleteWithTimeout = (ticketId: string) => {
        return Promise.race([
          supabase.from('service_tickets').delete().eq('id', ticketId),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Operation timeout')), 30000)
          )
        ]);
      };

      const results = await Promise.allSettled(
        ticketIds.map(id => deleteWithTimeout(id))
      );
      
      const failed = results.filter(r => r.status === 'rejected');
      if (failed.length > 0) {
        const errors = failed.map((r: any) => r.reason?.message).join(', ');
        throw new Error(`Failed to delete ${failed.length} ticket(s): ${errors}`);
      }

      return { deleted: ticketIds.length };
    },
    onMutate: async (ticketIds) => {
      await queryClient.cancelQueries({ queryKey: ['service-tickets'] });
      const previous = queryClient.getQueryData(['service-tickets']);
      
      queryClient.setQueryData(['service-tickets'], (old: any) => 
        Array.isArray(old) ? old.filter((t: any) => !ticketIds.includes(t.id)) : old
      );
      
      return { previous };
    },
    onError: (err: any, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['service-tickets'], context.previous);
      }
      queryClient.resetQueries({ queryKey: ['service-tickets'] });
      toast({
        title: 'Failed to Delete Tickets',
        description: err.message || 'An error occurred',
        variant: 'destructive',
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Tickets Deleted',
        description: `Successfully deleted ${data.deleted} ticket(s)`,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['service-tickets'] });
    },
  });
};

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { 
  ServiceTicket, 
  CreateServiceTicketRequest,
  UpdateTicketStatusRequest 
} from '@/types/service-tickets';

// NOTE: Queries disabled until Supabase types regenerate after migration
export const useServiceTickets = () => {
  return useQuery({
    queryKey: ['service-tickets'],
    queryFn: async () => [] as ServiceTicket[],
    enabled: false, // Disabled until types regenerate
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

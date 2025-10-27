import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ServiceTicketEvent } from '@/types/service-tickets';

export const useServiceTicketEvents = (ticketId: string) => {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['ticket-events', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_ticket_events' as any)
        .select(`
          *,
          triggered_by:profiles!service_ticket_events_triggered_by_id_fkey(user_id, full_name, avatar_url)
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as ServiceTicketEvent[];
    },
    enabled: !!ticketId,
  });

  return {
    events,
    isLoading,
  };
};

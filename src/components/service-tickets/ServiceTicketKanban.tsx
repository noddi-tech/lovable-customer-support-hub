import { useMemo } from 'react';
import { ServiceTicket, ServiceTicketStatus, STATUS_LABELS } from '@/types/service-tickets';
import { ServiceTicketCard } from './ServiceTicketCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface ServiceTicketKanbanProps {
  tickets: ServiceTicket[];
  onTicketClick: (ticket: ServiceTicket) => void;
}

const KANBAN_COLUMNS: ServiceTicketStatus[] = [
  'open',
  'in_progress',
  'scheduled',
  'completed',
  'closed'
];

export const ServiceTicketKanban = ({ tickets, onTicketClick }: ServiceTicketKanbanProps) => {
  const ticketsByStatus = useMemo(() => {
    const grouped = KANBAN_COLUMNS.reduce((acc, status) => {
      acc[status] = tickets.filter(t => t.status === status);
      return acc;
    }, {} as Record<ServiceTicketStatus, ServiceTicket[]>);
    return grouped;
  }, [tickets]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {KANBAN_COLUMNS.map((status) => (
        <div key={status} className="flex-shrink-0 w-80">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{STATUS_LABELS[status]}</h3>
              <Badge variant="secondary">{ticketsByStatus[status].length}</Badge>
            </div>
            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="space-y-3">
                {ticketsByStatus[status].map((ticket) => (
                  <ServiceTicketCard
                    key={ticket.id}
                    ticket={ticket}
                    onClick={() => onTicketClick(ticket)}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      ))}
    </div>
  );
};

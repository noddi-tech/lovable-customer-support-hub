import { ServiceTicketCard } from './ServiceTicketCard';
import type { ServiceTicket } from '@/types/service-tickets';

interface VirtualizedTicketListProps {
  tickets: ServiceTicket[];
  selectedTicketIds: string[];
  onSelectTicket: (ticketId: string) => void;
  onTicketClick: (ticketId: string) => void;
  selectionMode?: boolean;
}

export function VirtualizedTicketList({
  tickets,
  selectedTicketIds,
  onSelectTicket,
  onTicketClick,
  selectionMode = false,
}: VirtualizedTicketListProps) {
  
  if (tickets.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">No tickets found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-1 pb-4">
      {tickets.map((ticket) => (
        <ServiceTicketCard
          key={ticket.id}
          ticket={ticket}
          onClick={() => onTicketClick(ticket.id)}
          selectionMode={selectionMode}
          isSelected={selectedTicketIds.includes(ticket.id)}
          onSelectionChange={() => onSelectTicket(ticket.id)}
        />
      ))}
    </div>
  );
}

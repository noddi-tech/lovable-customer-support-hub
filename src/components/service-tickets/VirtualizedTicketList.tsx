import { ServiceTicketCard } from './ServiceTicketCard';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
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
    <div className="grid grid-cols-1 gap-2 pb-4">
      {tickets.map((ticket) => (
        <div key={ticket.id} className={cn("relative", selectionMode && "pl-8")}>
          {selectionMode && (
            <div className="absolute top-3 left-3 z-10">
              <Checkbox
                checked={selectedTicketIds.includes(ticket.id)}
                onCheckedChange={() => onSelectTicket(ticket.id)}
                className="h-4 w-4"
              />
            </div>
          )}
          <ServiceTicketCard
            ticket={ticket}
            onClick={() => onTicketClick(ticket.id)}
          />
        </div>
      ))}
    </div>
  );
}

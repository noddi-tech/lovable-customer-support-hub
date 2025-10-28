import { useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
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
  const listRef = useRef<List>(null);

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const ticket = tickets[index];
    
    return (
      <div style={style} className="px-2 py-3">
        <div className={cn("relative", selectionMode && "pl-8")}>
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
      </div>
    );
  };

  if (tickets.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">No tickets found</p>
      </div>
    );
  }

  return (
    <AutoSizer>
      {({ height, width }) => (
        <List
          ref={listRef}
          height={height}
          itemCount={tickets.length}
          itemSize={300}
          width={width}
        >
          {Row}
        </List>
      )}
    </AutoSizer>
  );
}

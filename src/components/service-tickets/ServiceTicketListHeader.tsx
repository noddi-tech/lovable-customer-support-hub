import { CheckSquare, Filter, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ServiceTicketListHeaderProps {
  ticketCount: number;
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  onCreateTicket: () => void;
}

export const ServiceTicketListHeader = ({
  ticketCount,
  selectionMode,
  onToggleSelectionMode,
  onCreateTicket,
}: ServiceTicketListHeaderProps) => {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">Tickets</h2>
        <Badge variant="secondary" className="h-5 px-2 text-xs">
          {ticketCount}
        </Badge>
        
        <Button
          variant={selectionMode ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleSelectionMode}
          className="h-7 px-2 gap-1 text-xs ml-2"
        >
          <CheckSquare className="w-3 h-3" />
          <span className="hidden sm:inline">
            {selectionMode ? 'Exit' : 'Select'}
          </span>
        </Button>
      </div>

      <Button onClick={onCreateTicket} size="sm" className="h-7 px-2 gap-1 text-xs">
        <Plus className="w-3 h-3" />
        <span className="hidden sm:inline">Create Ticket</span>
      </Button>
    </div>
  );
};

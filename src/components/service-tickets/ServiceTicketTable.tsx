import { useState, useMemo } from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ServiceTicketTableRow } from './ServiceTicketTableRow';
import { TableHeaderCell } from '@/components/dashboard/conversation-list/TableHeaderCell';
import type { ServiceTicket } from '@/types/service-tickets';
import { Ticket } from 'lucide-react';
import { sortByString, sortByDate, sortByNumber, sortByStatus, sortByPriority } from '@/utils/tableSorting';

interface ServiceTicketTableProps {
  tickets: ServiceTicket[];
  selectedTicketIds: string[];
  onSelectTicket: (ticketId: string) => void;
  onTicketClick: (ticketId: string) => void;
  selectionMode?: boolean;
}

export function ServiceTicketTable({
  tickets,
  selectedTicketIds,
  onSelectTicket,
  onTicketClick,
  selectionMode = false,
}: ServiceTicketTableProps) {
  const [sortState, setSortState] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({
    key: '',
    direction: null,
  });

  const handleSort = (key: string) => {
    setSortState(prev => ({
      key,
      direction: prev.key === key 
        ? prev.direction === 'asc' ? 'desc' : prev.direction === 'desc' ? null : 'asc'
        : 'asc'
    }));
  };

  const sortedTickets = useMemo(() => {
    if (!sortState.direction) return tickets;

    const sorted = [...tickets].sort((a, b) => {
      switch (sortState.key) {
        case 'ticket_number':
          return sortByString(a.ticket_number, b.ticket_number, sortState.direction);
        case 'title':
          return sortByString(a.title, b.title, sortState.direction);
        case 'customer':
          return sortByString(a.customer_name, b.customer_name, sortState.direction);
        case 'status':
          return sortByStatus(a.status, b.status, sortState.direction);
        case 'priority':
          return sortByPriority(a.priority, b.priority, sortState.direction);
        case 'assignee':
          return sortByString(a.assigned_to?.full_name, b.assigned_to?.full_name, sortState.direction);
        case 'created':
          return sortByDate(a.created_at, b.created_at, sortState.direction);
        case 'due_date':
          return sortByDate(a.due_date, b.due_date, sortState.direction);
        default:
          return 0;
      }
    });

    return sorted;
  }, [tickets, sortState]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      sortedTickets.forEach(ticket => {
        if (!selectedTicketIds.includes(ticket.id)) {
          onSelectTicket(ticket.id);
        }
      });
    } else {
      sortedTickets.forEach(ticket => {
        if (selectedTicketIds.includes(ticket.id)) {
          onSelectTicket(ticket.id);
        }
      });
    }
  };

  const allSelected = selectionMode &&
    sortedTickets.length > 0 &&
    sortedTickets.every(ticket => selectedTicketIds.includes(ticket.id));

  if (tickets.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Ticket className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">No tickets found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your filters or create a new ticket</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10 border-b">
          <TableRow className="hover:bg-transparent">
            {selectionMode && (
              <TableHead className="w-10 p-2">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
            )}
            <TableHeaderCell
              label="Ticket #"
              sortKey="ticket_number"
              currentSort={sortState}
              onSort={handleSort}
              className="w-28"
            />
            <TableHeaderCell
              label="Title"
              sortKey="title"
              currentSort={sortState}
              onSort={handleSort}
            />
            <TableHeaderCell
              label="Customer"
              sortKey="customer"
              currentSort={sortState}
              onSort={handleSort}
              className="w-48"
            />
            <TableHeaderCell
              label="Status"
              sortKey="status"
              currentSort={sortState}
              onSort={handleSort}
              className="w-32"
            />
            <TableHeaderCell
              label="Priority"
              sortKey="priority"
              currentSort={sortState}
              onSort={handleSort}
              className="w-24"
            />
            <TableHeaderCell
              label="Assignee"
              sortKey="assignee"
              currentSort={sortState}
              onSort={handleSort}
              className="w-36"
            />
            <TableHeaderCell
              label="Created"
              sortKey="created"
              currentSort={sortState}
              onSort={handleSort}
              className="w-28"
            />
            <TableHeaderCell
              label="Due Date"
              sortKey="due_date"
              currentSort={sortState}
              onSort={handleSort}
              className="w-28"
            />
            <TableHead className="w-12 p-2"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTickets.map((ticket) => (
            <ServiceTicketTableRow
              key={ticket.id}
              ticket={ticket}
              isSelected={selectedTicketIds.includes(ticket.id)}
              onSelect={onTicketClick}
              showCheckbox={selectionMode}
              onCheckboxChange={() => onSelectTicket(ticket.id)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

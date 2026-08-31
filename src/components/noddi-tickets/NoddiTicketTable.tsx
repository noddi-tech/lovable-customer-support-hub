import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { TicketPriorityBadge, TicketStatusBadge } from './NoddiTicketBadges';
import { TICKET_CATEGORY_LABELS, type NoddiTicket } from '@/types/noddiTicket';

interface Props {
  tickets: NoddiTicket[];
  isLoading: boolean;
  onSelect: (ticketId: number) => void;
}

export function NoddiTicketTable({ tickets, isLoading, onSelect }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!tickets.length) {
    return (
      <div className="rounded-md border p-10 text-center text-sm text-muted-foreground">
        No tickets found in Noddi for these filters.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">ID</TableHead>
            <TableHead>Title</TableHead>
            <TableHead className="w-[130px]">Status</TableHead>
            <TableHead className="w-[110px]">Priority</TableHead>
            <TableHead className="w-[160px]">Category</TableHead>
            <TableHead className="w-[170px]">Assignee</TableHead>
            <TableHead className="w-[150px]">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow
              key={ticket.id}
              className="cursor-pointer"
              onClick={() => onSelect(ticket.id)}
            >
              <TableCell className="font-mono text-xs text-muted-foreground">#{ticket.id}</TableCell>
              <TableCell className="max-w-[420px]">
                <div className="truncate font-medium">{ticket.title || 'Untitled ticket'}</div>
                {ticket.service_department?.name && (
                  <div className="truncate text-[11px] text-muted-foreground">
                    {ticket.service_department.name}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <TicketStatusBadge status={ticket.status} />
              </TableCell>
              <TableCell>
                <TicketPriorityBadge priority={ticket.priority} />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {TICKET_CATEGORY_LABELS[ticket.category] ?? ticket.category}
              </TableCell>
              <TableCell className="text-sm">
                {ticket.assignee?.name ?? <span className="text-muted-foreground">Unassigned</span>}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {ticket.created_at ? format(new Date(ticket.created_at), 'dd MMM yyyy HH:mm') : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

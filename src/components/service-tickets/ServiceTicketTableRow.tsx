import { memo, useCallback } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Eye, Trash2, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ServiceTicket } from '@/types/service-tickets';
import { formatDistanceToNow, isPast } from 'date-fns';
import { STATUS_LABELS, PRIORITY_LABELS } from '@/types/service-tickets';

const priorityColors = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-primary-muted text-primary",
  high: "bg-warning-muted text-warning",
  urgent: "bg-destructive-muted text-destructive",
};

const statusColors = {
  open: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  acknowledged: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20",
  scheduled: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  in_progress: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  pending_customer: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  awaiting_parts: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
  on_hold: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
  completed: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  verified: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  closed: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
  cancelled: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
};

interface ServiceTicketTableRowProps {
  ticket: ServiceTicket;
  isSelected: boolean;
  onSelect: (ticketId: string) => void;
  showCheckbox?: boolean;
  onCheckboxChange?: () => void;
}

export const ServiceTicketTableRow = memo<ServiceTicketTableRowProps>(({
  ticket,
  isSelected,
  onSelect,
  showCheckbox = false,
  onCheckboxChange,
}) => {
  const handleRowClick = useCallback(() => {
    if (showCheckbox && onCheckboxChange) {
      onCheckboxChange();
    } else {
      onSelect(ticket.id);
    }
  }, [onSelect, ticket.id, showCheckbox, onCheckboxChange]);

  const handleCheckboxChange = useCallback((checked: boolean) => {
    if (onCheckboxChange) {
      onCheckboxChange();
    }
  }, [onCheckboxChange]);

  const isOverdue = ticket.due_date && isPast(new Date(ticket.due_date)) && 
    !['completed', 'verified', 'closed', 'cancelled'].includes(ticket.status);

  const getBorderColor = () => {
    if (isOverdue) return 'border-l-destructive';
    if (ticket.priority === 'urgent') return 'border-l-destructive';
    if (ticket.status === 'completed') return 'border-l-success';
    if (ticket.status === 'in_progress') return 'border-l-warning';
    return 'border-l-muted';
  };

  const customerName = ticket.customer_name || ticket.customer_email || 'Unknown Customer';
  const customerInitial = customerName[0]?.toUpperCase() || 'C';

  return (
    <TableRow
      className={cn(
        "cursor-pointer hover:bg-muted/50 transition-colors border-l-4",
        getBorderColor(),
        isSelected && "bg-primary/5"
      )}
      onClick={handleRowClick}
    >
      {/* Checkbox */}
      {showCheckbox && (
        <TableCell className="w-10 p-2">
          <Checkbox
            checked={isSelected}
            onCheckedChange={handleCheckboxChange}
            onClick={(e) => e.stopPropagation()}
          />
        </TableCell>
      )}

      {/* Ticket Number */}
      <TableCell className="p-2 w-28">
        <div className="font-mono text-sm font-medium">
          {ticket.ticket_number}
        </div>
      </TableCell>

      {/* Title */}
      <TableCell className="p-2">
        <div className="flex items-center gap-2">
          <span className="text-sm truncate font-medium">{ticket.title}</span>
          {isOverdue && (
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          )}
        </div>
        {ticket.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {ticket.description.substring(0, 60)}...
          </p>
        )}
      </TableCell>

      {/* Customer */}
      <TableCell className="p-2 w-48">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="h-6 w-6 ring-1 ring-muted shrink-0">
            <AvatarFallback className="text-xs">
              {customerInitial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="text-sm truncate">{customerName}</div>
            {ticket.customer_phone && (
              <div className="text-xs text-muted-foreground truncate">
                {ticket.customer_phone}
              </div>
            )}
          </div>
        </div>
      </TableCell>

      {/* Status */}
      <TableCell className="p-2 w-32">
        <Badge className={cn("px-2 py-0.5 text-xs border", statusColors[ticket.status])}>
          {STATUS_LABELS[ticket.status]}
        </Badge>
      </TableCell>

      {/* Priority */}
      <TableCell className="p-2 w-24">
        <Badge className={cn("px-2 py-0.5 text-xs", priorityColors[ticket.priority])}>
          {PRIORITY_LABELS[ticket.priority]}
        </Badge>
      </TableCell>

      {/* Assignee */}
      <TableCell className="p-2 w-36">
        {ticket.assigned_to ? (
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-5 w-5 ring-1 ring-muted shrink-0">
              <AvatarFallback className="text-xs">
                {ticket.assigned_to.full_name[0]?.toUpperCase() || 'A'}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm truncate">{ticket.assigned_to.full_name}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Unassigned</span>
        )}
      </TableCell>

      {/* Created */}
      <TableCell className="p-2 w-28">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
        </div>
      </TableCell>

      {/* Due Date */}
      <TableCell className="p-2 w-28">
        {ticket.due_date ? (
          <div className={cn(
            "text-xs",
            isOverdue ? "text-destructive font-medium" : "text-muted-foreground"
          )}>
            {formatDistanceToNow(new Date(ticket.due_date), { addSuffix: true })}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </TableCell>

      {/* Actions */}
      <TableCell className="p-2 w-12">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onSelect(ticket.id)}>
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});

ServiceTicketTableRow.displayName = 'ServiceTicketTableRow';

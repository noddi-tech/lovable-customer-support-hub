import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { ServiceTicketStatusBadge, ServiceTicketPriorityBadge } from './ServiceTicketStatusBadge';
import { ServiceTicketDetailsDialog } from './ServiceTicketDetailsDialog';
import { SLAStatusIndicator } from './SLAStatusIndicator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Calendar, Tag, AlertCircle } from 'lucide-react';
import type { ServiceTicket } from '@/types/service-tickets';
import { TicketCustomerInfo } from './TicketCustomerInfo';

interface ServiceTicketCardProps {
  ticket: ServiceTicket;
  onClick?: () => void;
  isActive?: boolean;
  compact?: boolean;
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelectionChange?: () => void;
}

export const ServiceTicketCard = ({
  ticket,
  onClick,
  isActive = false,
  compact = false,
  selectionMode = false,
  isSelected = false,
  onSelectionChange,
}: ServiceTicketCardProps) => {
  const [detailsOpen, setDetailsOpen] = useState(false);

  const isOverdue = ticket.due_date && new Date(ticket.due_date) < new Date() && 
    !['completed', 'closed', 'cancelled'].includes(ticket.status);

  const handleClick = () => {
    if (selectionMode && onSelectionChange) {
      onSelectionChange();
    } else if (onClick) {
      onClick();
    } else {
      setDetailsOpen(true);
    }
  };

  return (
    <>
      <Card
        className={cn(
          'cursor-pointer transition-all hover:shadow-sm border-l-2',
          isActive && 'ring-2 ring-primary',
          isOverdue && 'border-l-red-500',
          !isOverdue && ticket.priority === 'urgent' && 'border-l-red-500',
          !isOverdue && ticket.priority === 'high' && 'border-l-orange-500',
          !isOverdue && ticket.priority === 'normal' && 'border-l-blue-500',
          !isOverdue && ticket.priority === 'low' && 'border-l-gray-500'
        )}
        onClick={handleClick}
      >
        <CardContent className={cn('px-3 py-2 flex gap-2.5 items-center', compact && 'px-2 py-1.5')}>
          {/* Selection Checkbox */}
          {selectionMode && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onSelectionChange?.()}
              onClick={(e) => e.stopPropagation()}
              className="shrink-0"
            />
          )}
          
          <div className="flex-1 min-w-0 flex items-center gap-3">
            {/* Ticket Number */}
            <span className="text-xs font-mono text-muted-foreground shrink-0">
              {ticket.ticket_number}
            </span>

            {/* Title */}
            <h3 className="font-medium text-sm truncate flex-1 min-w-0">
              {ticket.title}
            </h3>

            {/* Status Badges */}
            <div className="flex items-center gap-1.5 shrink-0">
              {isOverdue && (
                <Badge variant="destructive" className="text-xs px-1.5 py-0">
                  <AlertCircle className="w-3 h-3" />
                </Badge>
              )}
              <ServiceTicketStatusBadge status={ticket.status} showIcon={false} />
              <SLAStatusIndicator 
                dueDate={ticket.due_date}
                completedAt={ticket.completed_at}
                status={ticket.status}
                showLabel={false}
              />
              <ServiceTicketPriorityBadge priority={ticket.priority} showIcon={false} />
            </div>

            {/* Customer Info */}
            <div className="shrink-0">
              <TicketCustomerInfo 
                customerName={ticket.customer_name}
                customerEmail={ticket.customer_email}
                customerPhone={ticket.customer_phone}
                noddiUserId={ticket.noddi_user_id}
                compact={true}
              />
            </div>

            {/* Assignee Avatar */}
            {ticket.assigned_to && (
              <Avatar className="w-6 h-6 shrink-0">
                <AvatarImage src={ticket.assigned_to.avatar_url} />
                <AvatarFallback className="text-[10px]">
                  {ticket.assigned_to.full_name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}

            {/* Time Indicator */}
            <span className="text-xs text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
            </span>
          </div>
        </CardContent>
      </Card>
      
      {!onClick && (
        <ServiceTicketDetailsDialog 
          ticket={ticket}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
        />
      )}
    </>
  );
};

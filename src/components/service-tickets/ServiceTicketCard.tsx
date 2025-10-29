import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
}

export const ServiceTicketCard = ({
  ticket,
  onClick,
  isActive = false,
  compact = false,
}: ServiceTicketCardProps) => {
  const [detailsOpen, setDetailsOpen] = useState(false);

  const isOverdue = ticket.due_date && new Date(ticket.due_date) < new Date() && 
    !['completed', 'closed', 'cancelled'].includes(ticket.status);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      setDetailsOpen(true);
    }
  };

  return (
    <>
      <Card
        className={cn(
          'cursor-pointer transition-all hover:shadow-md border-l-4',
          isActive && 'ring-2 ring-primary',
          isOverdue && 'border-l-red-500',
          !isOverdue && ticket.priority === 'urgent' && 'border-l-red-500',
          !isOverdue && ticket.priority === 'high' && 'border-l-orange-500',
          !isOverdue && ticket.priority === 'normal' && 'border-l-blue-500',
          !isOverdue && ticket.priority === 'low' && 'border-l-gray-500'
        )}
        onClick={handleClick}
      >
        <CardContent className={cn('p-4', compact && 'p-3')}>
          <div className="space-y-2">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-mono text-muted-foreground">
                    {ticket.ticket_number}
                  </span>
                  {isOverdue && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Overdue
                    </Badge>
                  )}
                </div>
                <h3 className={cn(
                  'font-semibold truncate',
                  compact ? 'text-sm' : 'text-base'
                )}>
                  {ticket.title}
                </h3>
              </div>
              <ServiceTicketPriorityBadge priority={ticket.priority} showIcon={false} />
            </div>


            {/* Status and metadata */}
            <div className="flex items-center flex-wrap gap-2">
              <ServiceTicketStatusBadge status={ticket.status} showIcon={!compact} />
              <SLAStatusIndicator 
                dueDate={ticket.due_date}
                completedAt={ticket.completed_at}
                status={ticket.status}
                showLabel={!compact}
              />
              
              {ticket.category && (
                <Badge variant="outline" className="text-xs">
                  <Tag className="w-3 h-3 mr-1" />
                  {ticket.category.replace('_', ' ')}
                </Badge>
              )}
            </div>

            {/* Customer and assignment */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <TicketCustomerInfo 
                  customerName={ticket.customer_name}
                  customerEmail={ticket.customer_email}
                  customerPhone={ticket.customer_phone}
                  noddiUserId={ticket.noddi_user_id}
                  compact={compact}
                />
                
                {ticket.scheduled_for && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {formatDistanceToNow(new Date(ticket.scheduled_for), { addSuffix: true })}
                    </span>
                  </div>
                )}
              </div>

              {ticket.assigned_to && (
                <div className="flex items-center gap-1">
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={ticket.assigned_to.avatar_url} />
                    <AvatarFallback className="text-[10px]">
                      {ticket.assigned_to.full_name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>

            {/* Tags */}
            {!compact && ticket.tags && ticket.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {ticket.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {ticket.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{ticket.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Footer metadata */}
            <div className="text-xs text-muted-foreground pt-1 border-t">
              Created {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
              {ticket.created_by && (
                <span className="ml-2">• by {ticket.created_by.full_name}</span>
              )}
              {ticket.noddi_booking_id && (
                <span className="ml-2">• Booking #{ticket.noddi_booking_id}</span>
              )}
            </div>
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

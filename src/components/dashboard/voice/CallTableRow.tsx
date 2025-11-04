import { memo, useCallback } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Eye, Trash2, ArrowUpRight, ArrowDownLeft, MessageSquare, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { formatPhoneNumber } from '@/utils/phoneNumberUtils';
import { useCallNotes } from '@/hooks/useCallNotes';

const statusColors = {
  completed: "bg-success-muted text-success border-success/20",
  answered: "bg-success-muted text-success border-success/20",
  ringing: "bg-warning-muted text-warning border-warning/20",
  missed: "bg-destructive-muted text-destructive border-destructive/20",
  busy: "bg-destructive-muted text-destructive border-destructive/20",
  failed: "bg-destructive-muted text-destructive border-destructive/20",
  voicemail: "bg-muted text-muted-foreground border-muted",
  transferred: "bg-primary-muted text-primary border-primary/20",
  on_hold: "bg-warning-muted text-warning border-warning/20",
};

interface CallTableRowProps {
  call: any;
  isSelected: boolean;
  onClick: () => void;
  onRemove?: (callId: string) => void;
  onNavigateToEvents?: (callId: string) => void;
}

export const CallTableRow = memo<CallTableRowProps>(({
  call,
  isSelected,
  onClick,
  onRemove,
  onNavigateToEvents,
}) => {
  const { notes } = useCallNotes(call.id);
  const notesCount = notes?.length || 0;

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove(call.id);
    }
  }, [onRemove, call.id]);

  const handleViewDetails = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  }, [onClick]);

  const handleNavigateToEvents = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onNavigateToEvents) {
      onNavigateToEvents(call.id);
    }
  }, [onNavigateToEvents, call.id]);

  const getBorderColor = () => {
    if (call.status === 'missed' || call.end_reason === 'not_answered') return 'border-l-destructive';
    if (call.status === 'completed' || call.status === 'answered') return 'border-l-success';
    if (call.status === 'ringing' || call.status === 'on_hold') return 'border-l-warning';
    return 'border-l-muted';
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getEndReason = () => {
    const endReason = call.end_reason;
    const enrichedDetails = call.enriched_details || {};
    
    if (endReason === 'completed_normally') {
      const agentName = enrichedDetails.user_name;
      return agentName ? `Handled by ${agentName}` : 'Completed successfully';
    }
    if (endReason === 'abandoned_in_ivr') return 'Abandoned in IVR';
    if (endReason === 'not_answered') {
      if (call.availability_status === 'closed') return 'Outside business hours';
      return 'Not answered';
    }
    if (endReason === 'hung_up') return 'Customer hung up';
    
    return endReason ? endReason.replace(/_/g, ' ') : call.status;
  };

  const customerName = call.customer_name || call.customers?.full_name || 'Unknown';
  const customerEmail = call.customer_email || call.customers?.email;
  const customerInitial = customerName[0]?.toUpperCase() || 'U';

  return (
    <TableRow
      className={cn(
        "cursor-pointer hover:bg-muted/50 transition-colors border-l-4",
        getBorderColor(),
        isSelected && "bg-primary/5"
      )}
      onClick={onClick}
    >
      {/* Direction */}
      <TableCell className="p-2 w-24">
        <div className="flex items-center gap-2">
          {call.direction === 'inbound' ? (
            <ArrowDownLeft className="h-4 w-4 text-success" />
          ) : (
            <ArrowUpRight className="h-4 w-4 text-primary" />
          )}
          <span className="text-xs capitalize">{call.direction}</span>
        </div>
      </TableCell>

      {/* Phone */}
      <TableCell className="p-2 w-36">
        <div className="font-mono text-sm">
          {formatPhoneNumber(call.customer_phone)}
        </div>
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
            {customerEmail && (
              <div className="text-xs text-muted-foreground truncate hidden xl:block">
                {customerEmail}
              </div>
            )}
          </div>
        </div>
      </TableCell>

      {/* Status */}
      <TableCell className="p-2 w-28">
        <Badge className={cn("px-2 py-0.5 text-xs border", statusColors[call.status as keyof typeof statusColors] || statusColors.completed)}>
          {call.status?.charAt(0).toUpperCase() + call.status?.slice(1) || 'Unknown'}
        </Badge>
      </TableCell>

      {/* Duration */}
      <TableCell className="p-2 w-24">
        <div className="text-sm font-mono">
          {formatDuration(call.duration_seconds)}
        </div>
      </TableCell>

      {/* End Reason */}
      <TableCell className="p-2 w-48">
        <div className="text-sm text-muted-foreground truncate">
          {getEndReason()}
        </div>
      </TableCell>

      {/* Time */}
      <TableCell className="p-2 w-32">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formatDistanceToNow(new Date(call.started_at), { addSuffix: true })}
        </div>
      </TableCell>

      {/* Notes Count */}
      <TableCell className="p-2 w-20">
        {notesCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            <span>{notesCount}</span>
          </div>
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
            <DropdownMenuItem onClick={handleViewDetails}>
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </DropdownMenuItem>
            {onNavigateToEvents && (
              <DropdownMenuItem onClick={handleNavigateToEvents}>
                <MessageSquare className="w-4 h-4 mr-2" />
                View Events
              </DropdownMenuItem>
            )}
            {onRemove && (
              <DropdownMenuItem onClick={handleRemove} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Remove
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});

CallTableRow.displayName = 'CallTableRow';

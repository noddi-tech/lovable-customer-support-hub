import React from 'react';
import { ArrowUpRight, ArrowDownLeft, Clock, History, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { Call } from '@/hooks/useCalls';
import { SidebarCounter } from '@/components/ui/sidebar-counter';

interface EnhancedCallCardProps {
  call: Call;
  isSelected?: boolean;
  onSelect?: (call: Call) => void;
  onViewDetails?: (call: Call) => void;
  onNavigateToEvents?: (callId: string) => void;
  notesCount?: number;
}

export const EnhancedCallCard: React.FC<EnhancedCallCardProps> = ({
  call,
  isSelected,
  onSelect,
  onViewDetails,
  onNavigateToEvents,
  notesCount = 0,
}) => {
  const formatPhoneNumber = (phone?: string) => {
    if (!phone) return 'Unknown';
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'answered':
        return 'success';
      case 'ringing':
      case 'on_hold':
        return 'warning';
      case 'missed':
      case 'busy':
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getBorderColor = () => {
    if (call.status === 'missed' || call.end_reason === 'not_answered') return 'border-l-destructive';
    if (call.status === 'completed' || call.status === 'answered') return 'border-l-success';
    if (call.status === 'ringing' || call.status === 'on_hold') return 'border-l-warning';
    return 'border-l-muted';
  };

  const getCallAge = () => {
    const now = new Date();
    const callDate = new Date(call.started_at);
    const diffHours = (now.getTime() - callDate.getTime()) / (1000 * 60 * 60);
    
    if (diffHours > 24) return 'opacity-60';
    if (diffHours > 12) return 'opacity-75';
    if (diffHours > 6) return 'opacity-85';
    return 'opacity-100';
  };

  const getDirectionIcon = () => {
    return call.direction === 'inbound' ? 
      <ArrowDownLeft className="h-4 w-4" /> : 
      <ArrowUpRight className="h-4 w-4" />;
  };

  const getStatusLabel = () => {
    if (call.end_reason === 'completed_normally') return 'Completed';
    if (call.end_reason === 'not_answered') return 'Missed';
    if (call.end_reason === 'abandoned_in_ivr') return 'Abandoned';
    return call.status?.charAt(0).toUpperCase() + call.status?.slice(1);
  };

  const getStatusDescription = () => {
    const enrichedDetails = call.enriched_details || {};
    if (call.end_reason === 'completed_normally' && enrichedDetails.user_name) {
      return `Handled by ${enrichedDetails.user_name}`;
    }
    if (call.availability_status === 'closed') {
      return 'Outside business hours';
    }
    return null;
  };

  return (
    <Card 
      className={`group cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/50 border-l-4 ${getBorderColor()} ${getCallAge()} ${
        isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        onSelect?.(call);
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Direction Icon */}
            <div className="flex-shrink-0 mt-1 p-2 rounded-full bg-muted">
              {getDirectionIcon()}
            </div>
            
            {/* Call Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-lg truncate font-mono">
                  {formatPhoneNumber(call.customer_phone)}
                </span>
                <Badge 
                  variant={getStatusColor(call.status) as any} 
                  className="text-xs shrink-0"
                >
                  {getStatusLabel()}
                </Badge>
              </div>
              
              {/* Customer Name if available */}
              {call.customers?.full_name && (
                <div className="text-sm font-medium mb-1">
                  {call.customers.full_name}
                </div>
              )}
              
              {/* Status Description */}
              {getStatusDescription() && (
                <div className="text-sm text-muted-foreground mb-2">
                  {getStatusDescription()}
                </div>
              )}
              
              {/* Metadata Row */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatDistanceToNow(new Date(call.started_at), { addSuffix: true })}</span>
                </div>
                {call.duration_seconds && call.duration_seconds > 0 && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted">
                    <Clock className="h-3 w-3" />
                    <span className="font-medium">{formatDuration(call.duration_seconds)}</span>
                  </div>
                )}
                {notesCount > 0 && (
                  <SidebarCounter count={notesCount} variant="default" />
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions - Show on Hover */}
          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1">
            {onViewDetails && (
              <Button 
                size="sm" 
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails(call);
                }}
                title="View Details"
              >
                <History className="h-4 w-4" />
              </Button>
            )}
            {onNavigateToEvents && (
              <Button 
                size="sm" 
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigateToEvents(call.id);
                }}
                title="View Events"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

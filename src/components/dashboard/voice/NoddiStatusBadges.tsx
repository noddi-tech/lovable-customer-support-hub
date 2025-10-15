import React from 'react';
import { Package, AlertCircle, Star, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { NoddiLookupResponse } from '@/hooks/useNoddihKundeData';

interface NoddiStatusBadgesProps {
  noddiData: NoddiLookupResponse;
  compact?: boolean;
}

export const NoddiStatusBadges: React.FC<NoddiStatusBadgesProps> = ({ noddiData, compact = false }) => {
  if (!noddiData?.data?.found) return null;

  const { data } = noddiData;
  const unpaidCount = data.unpaid_count || 0;
  const isPriority = data.priority_booking_type === 'upcoming';
  const hasBooking = data.priority_booking != null;
  const totalBookings = hasBooking ? 1 : 0;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 flex-wrap">
        {/* Verified Badge */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="h-5 px-1.5 text-xs border-success/50 bg-success/5">
              <CheckCircle2 className="h-3 w-3 text-success" />
              {!compact && <span className="ml-1">Verified</span>}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Customer verified in Noddi</p>
          </TooltipContent>
        </Tooltip>

        {/* Bookings Badge */}
        {hasBooking && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="h-5 px-1.5 text-xs">
                <Package className="h-3 w-3" />
                {!compact && <span className="ml-1">Booking</span>}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{data.priority_booking_type === 'upcoming' ? 'Upcoming' : 'Completed'} booking</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Unpaid Badge */}
        {unpaidCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="h-5 px-1.5 text-xs border-destructive/50 bg-destructive/5">
                <AlertCircle className="h-3 w-3 text-destructive" />
                <span className="ml-1">{unpaidCount} unpaid</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{unpaidCount} unpaid booking{unpaidCount !== 1 ? 's' : ''}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Priority Badge */}
        {isPriority && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="h-5 px-1.5 text-xs border-warning/50 bg-warning/5">
                <Star className="h-3 w-3 text-warning" />
                {!compact && <span className="ml-1">Priority</span>}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Has upcoming booking</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};

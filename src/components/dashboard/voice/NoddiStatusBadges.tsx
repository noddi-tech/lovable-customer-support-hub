import React from 'react';
import { Package, AlertCircle, Star, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { NoddiLookupResponse } from '@/hooks/useNoddihKundeData';

interface NoddiStatusBadgesProps {
  noddiData: NoddiLookupResponse;
}

export const NoddiStatusBadges: React.FC<NoddiStatusBadgesProps> = ({ noddiData }) => {
  if (!noddiData?.data?.found) return null;

  const { data } = noddiData;
  const unpaidCount = data.unpaid_count || 0;
  const isPriority = data.priority_booking_type === 'upcoming';
  const hasBooking = data.priority_booking != null;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 flex-wrap">
        {/* Verified Badge */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="h-5 px-1.5 text-xs border-success/50 bg-success/5">
              <CheckCircle2 className="h-3 w-3 text-success" />
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">Customer Verified</p>
            <p className="text-xs text-muted-foreground mt-1">This customer is registered in Noddi</p>
          </TooltipContent>
        </Tooltip>

        {/* Bookings Badge */}
        {hasBooking && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="h-5 px-1.5 text-xs">
                <Package className="h-3 w-3" />
                <span className="ml-1">Booking</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">Active Booking Found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Customer has {data.priority_booking_type === 'upcoming' ? 'an upcoming' : 'a recently completed'} booking
              </p>
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
              <p className="font-medium">Payment Outstanding</p>
              <p className="text-xs text-muted-foreground mt-1">
                Customer has {unpaidCount} unpaid booking{unpaidCount !== 1 ? 's' : ''} requiring payment
              </p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Priority Badge */}
        {isPriority && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="h-5 px-1.5 text-xs border-warning/50 bg-warning/5">
                <Star className="h-3 w-3 text-warning" />
                <span className="ml-1">Priority</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">Priority Customer</p>
              <p className="text-xs text-muted-foreground mt-1">
                Customer has an upcoming booking and should receive priority service
              </p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};

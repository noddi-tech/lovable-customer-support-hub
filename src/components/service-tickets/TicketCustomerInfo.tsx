import React from 'react';
import { User, AlertCircle } from 'lucide-react';
import { useNoddihKundeData } from '@/hooks/useNoddihKundeData';
import { NoddiStatusBadges } from '@/components/dashboard/voice/NoddiStatusBadges';
import { displayName } from '@/utils/noddiHelpers';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TicketCustomerInfoProps {
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  noddiUserId?: number | null;
  compact?: boolean;
  showDetails?: boolean;
}

export const TicketCustomerInfo: React.FC<TicketCustomerInfoProps> = ({
  customerName,
  customerEmail,
  customerPhone,
  noddiUserId,
  compact = false,
  showDetails = false,
}) => {
  const { data: noddiData, isLoading } = useNoddihKundeData({
    id: noddiUserId?.toString() || '',
    email: customerEmail,
    phone: customerPhone,
    full_name: customerName,
  });

  // If no customer data at all, show "No customer linked"
  if (!customerName && !customerEmail && !customerPhone && !noddiUserId) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <User className="h-3 w-3" />
        <span>No customer linked</span>
      </div>
    );
  }

  // Determine display name
  const name = customerName || displayName(noddiData?.data?.user, customerEmail);

  return (
    <div className="space-y-2">
      {/* Main customer info line */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Customer Name */}
        {name && name !== 'Unknown Name' && (
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <User className="h-3 w-3 text-muted-foreground" />
            <span>{name}</span>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex gap-1">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-20" />
          </div>
        )}

        {/* Noddi Status Badges */}
        {noddiData && !isLoading && (
          <NoddiStatusBadges noddiData={noddiData} />
        )}
      </div>

      {/* Detailed view for dialog */}
      {showDetails && noddiData?.data?.found && !isLoading && (
        <div className="space-y-2 text-sm pt-2">
          {/* Contact details */}
          {(customerEmail || customerPhone) && (
            <div className="space-y-1">
              {customerEmail && (
                <p>
                  <span className="text-muted-foreground">Email:</span> {customerEmail}
                </p>
              )}
              {customerPhone && (
                <p>
                  <span className="text-muted-foreground">Phone:</span> {customerPhone}
                </p>
              )}
              {noddiUserId && (
                <p>
                  <span className="text-muted-foreground">Noddi ID:</span> {noddiUserId}
                </p>
              )}
            </div>
          )}

          {/* Booking info */}
          {noddiData.data.priority_booking && (
            <div className="pt-2 border-t">
              <p className="font-medium text-xs text-muted-foreground mb-1">Active Booking</p>
              <p className="font-medium">{noddiData.data.priority_booking.service_title || 'Service Booking'}</p>
              {noddiData.data.priority_booking.booking_date && (
                <p className="text-xs text-muted-foreground">
                  {new Date(noddiData.data.priority_booking.booking_date).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {/* Unpaid bookings alert */}
          {noddiData.data.unpaid_count > 0 && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {noddiData.data.unpaid_count} unpaid booking{noddiData.data.unpaid_count !== 1 ? 's' : ''} requiring payment
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
};

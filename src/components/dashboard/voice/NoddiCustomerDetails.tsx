import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, Package, AlertCircle, Calendar, DollarSign, CheckCircle2, Star } from 'lucide-react';
import { useNoddihKundeData } from '@/hooks/useNoddihKundeData';
import { displayName } from '@/utils/noddiHelpers';
import { format } from 'date-fns';

interface NoddiCustomerDetailsProps {
  customerId?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
}

export const NoddiCustomerDetails: React.FC<NoddiCustomerDetailsProps> = ({
  customerId,
  customerEmail,
  customerPhone,
  customerName,
}) => {
  const { data: noddiData, isLoading } = useNoddihKundeData({
    id: customerId || '',
    email: customerEmail,
    phone: customerPhone,
    full_name: customerName,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!noddiData?.data?.found) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            {customerName && <p className="font-medium mb-1">{customerName}</p>}
            <p>No Noddi customer data found for this contact.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { data } = noddiData;
  const customerDisplayName = displayName(data.user, customerEmail);
  const unpaidCount = data.unpaid_count || 0;
  const isPriority = data.priority_booking_type === 'upcoming';
  const hasBooking = data.priority_booking != null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <User className="h-4 w-4" />
          Customer Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Customer Name and Status */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <p className="font-semibold text-base">{customerDisplayName}</p>
            <Badge variant="outline" className="h-5 px-1.5 text-xs border-success/50 bg-success/5">
              <CheckCircle2 className="h-3 w-3 text-success mr-1" />
              Verified
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            {data.user?.email && <p>Email: {data.user.email}</p>}
            {data.user?.phone && <p>Phone: {data.user.phone}</p>}
            {data.user?.registrationDate && (
              <p>Registered: {format(new Date(data.user.registrationDate), 'MMM d, yyyy')}</p>
            )}
          </div>
        </div>

        {/* Priority Status */}
        {isPriority && (
          <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
            <div className="flex items-center gap-2 mb-1">
              <Star className="h-4 w-4 text-warning" />
              <p className="font-medium text-sm">Priority Customer</p>
            </div>
            <p className="text-xs text-muted-foreground">
              This customer has an upcoming booking and should receive priority service.
            </p>
          </div>
        )}

        {/* Active Booking */}
        {hasBooking && (
          <div className="p-3 rounded-lg bg-muted">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4" />
              <p className="font-medium text-sm">
                {data.priority_booking_type === 'upcoming' ? 'Upcoming' : 'Recent'} Booking
              </p>
            </div>
            {data.ui_meta?.booking_date_iso && (
              <p className="text-sm text-muted-foreground mb-2">
                Date: {format(new Date(data.ui_meta.booking_date_iso), 'PPP')}
              </p>
            )}
            {data.ui_meta?.service_title && (
              <p className="text-sm text-muted-foreground mb-1">
                Service: {data.ui_meta.service_title}
              </p>
            )}
            {data.ui_meta?.vehicle_label && (
              <p className="text-sm text-muted-foreground mb-1">
                Vehicle: {data.ui_meta.vehicle_label}
              </p>
            )}
            {data.ui_meta?.money && (
              <div className="mt-2 pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-medium">
                    {data.ui_meta.money.gross.toFixed(2)} {data.ui_meta.money.currency}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Paid:</span>
                  <span className={data.ui_meta.money.paid_state === 'paid' ? 'text-success' : ''}>
                    {data.ui_meta.money.paid.toFixed(2)} {data.ui_meta.money.currency}
                  </span>
                </div>
                {data.ui_meta.money.outstanding > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Outstanding:</span>
                    <span className="font-medium text-destructive">
                      {data.ui_meta.money.outstanding.toFixed(2)} {data.ui_meta.money.currency}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Unpaid Bookings Warning */}
        {unpaidCount > 0 && (
          <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="font-medium text-sm text-destructive">
                {unpaidCount} Unpaid Booking{unpaidCount !== 1 ? 's' : ''}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Customer has {unpaidCount} booking{unpaidCount !== 1 ? 's' : ''} with outstanding payments.
            </p>
          </div>
        )}

        {/* Additional Info */}
        {data.ui_meta?.order_tags && data.ui_meta.order_tags.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Tags</p>
            <div className="flex flex-wrap gap-1">
              {data.ui_meta.order_tags.map((tag: string, idx: number) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Data Source */}
        <div className="pt-3 border-t text-xs text-muted-foreground">
          <p>
            Data source: {noddiData.source === 'cache' ? 'Cached' : 'Live'} 
            {data.ui_meta?.version && ` • v${data.ui_meta.version}`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

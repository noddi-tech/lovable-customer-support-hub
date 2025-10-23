import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2, User, Package, AlertCircle, Calendar, DollarSign, CheckCircle2, Star, ExternalLink,
  Archive, RotateCcw, Truck, Users, Droplets, Target, Gauge, Zap, Building2
} from 'lucide-react';
import { useNoddihKundeData } from '@/hooks/useNoddihKundeData';
import { displayName } from '@/utils/noddiHelpers';
import { format } from 'date-fns';

interface NoddiCustomerDetailsProps {
  customerId?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  onDataLoaded?: (data: any) => void;
  noddiData?: any; // External noddi data to override fetch
  onUserGroupChange?: (userGroupId: number) => void;
  selectedUserGroupId?: number;
}

export const NoddiCustomerDetails: React.FC<NoddiCustomerDetailsProps> = ({
  customerId,
  customerEmail,
  customerPhone,
  customerName,
  onDataLoaded,
  noddiData: externalNoddiData,
  onUserGroupChange,
  selectedUserGroupId,
}) => {
  // Only fetch if no external data provided
  const { data: fetchedData, isLoading } = useNoddihKundeData(
    externalNoddiData ? null : {
      id: customerId || '',
      email: customerEmail,
      phone: customerPhone,
      full_name: customerName,
    }
  );

  // Use external data if provided, otherwise use fetched data
  const noddiData = externalNoddiData || fetchedData;
  const isLoadingData = !externalNoddiData && isLoading;

  // Compute displayed data based on selected group
  const displayedData = React.useMemo(() => {
    if (!noddiData?.data) return noddiData;
    
    // If a specific group is selected, find its data
    if (selectedUserGroupId && noddiData.data.all_user_groups) {
      const selectedGroupData = noddiData.data.all_user_groups.find(
        (g: any) => g.id === selectedUserGroupId
      );
      
      if (selectedGroupData) {
        return {
          ...noddiData,
          data: {
            ...noddiData.data,
            user_group_id: selectedGroupData.id,
            priority_booking: selectedGroupData.booking,
            priority_booking_type: selectedGroupData.booking_type,
            ui_meta: {
              ...noddiData.data.ui_meta,
              user_group_badge: selectedGroupData.id,
              status_label: selectedGroupData.booking?.status?.label || null,
              booking_date_iso: selectedGroupData.booking?.deliveryWindowStartsAt || selectedGroupData.booking?.completedAt || null,
              vehicle_label: selectedGroupData.booking?.vehicle?.registrationNumber || selectedGroupData.booking?.vehicle?.label || null,
              service_title: selectedGroupData.booking?.service?.title || null,
            },
          },
        };
      }
    }
    
    // Default: show priority booking
    return noddiData;
  }, [noddiData, selectedUserGroupId]);

  // Notify parent when data is loaded
  React.useEffect(() => {
    if (displayedData && onDataLoaded) {
      onDataLoaded(displayedData);
    }
  }, [displayedData, onDataLoaded]);

  // Currency formatter for consistent money display
  const moneyFmt = (amt: number, cur: string) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: cur }).format(amt);

  // Map service tags to icons and colors
  const getServiceTagStyle = (tag: string) => {
    const tagLower = tag.toLowerCase();
    if (tagLower.includes('dekkhotell')) return { bg: 'bg-blue-100', text: 'text-blue-900', icon: Archive };
    if (tagLower.includes('dekkskift')) return { bg: 'bg-green-100', text: 'text-green-900', icon: RotateCcw };
    if (tagLower.includes('hjemlevering')) return { bg: 'bg-purple-100', text: 'text-purple-900', icon: Truck };
    if (tagLower.includes('henting') || tagLower.includes('levering')) return { bg: 'bg-orange-100', text: 'text-orange-900', icon: Package };
    if (tagLower.includes('bærehjelp')) return { bg: 'bg-teal-100', text: 'text-teal-900', icon: Users };
    if (tagLower.includes('felgvask')) return { bg: 'bg-indigo-100', text: 'text-indigo-900', icon: Droplets };
    if (tagLower.includes('balansering')) return { bg: 'bg-pink-100', text: 'text-pink-900', icon: Target };
    if (tagLower.includes('tpms') || tagLower.includes('ventil')) return { bg: 'bg-red-100', text: 'text-red-900', icon: Gauge };
    if (tagLower.includes('punktering')) return { bg: 'bg-yellow-100', text: 'text-yellow-900', icon: Zap };
    return { bg: 'bg-muted', text: 'text-muted-foreground', icon: null };
  };

  if (isLoadingData) {
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

  if (!displayedData?.data?.found) {
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

  const { data } = displayedData;
  const customerDisplayName = displayName(data.user, customerEmail);
  const unpaidCount = data.unpaid_count || 0;
  const isPriority = data.priority_booking_type === 'upcoming';
  const hasBooking = data.priority_booking != null;
  
  // Extract partner URLs
  const customerUrl = data.ui_meta?.partner_urls?.customer_url;
  const bookingUrl = data.ui_meta?.partner_urls?.booking_url;
  const bookingId = data.ui_meta?.partner_urls?.booking_id;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <User className="h-4 w-4" />
          Customer Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Show which email was used for lookup if different */}
        {data.ui_meta?.match_mode === 'email' && 
         data.user?.email && 
         customerEmail && 
         data.user.email !== customerEmail && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-xs text-blue-900">
              Booking data found using alternative email: <strong>{data.user.email}</strong>
            </AlertDescription>
          </Alert>
        )}

        {/* Customer Name and Status */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            {customerUrl ? (
              <a 
                href={customerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-base hover:text-primary hover:underline flex items-center gap-1"
              >
                {customerDisplayName}
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <p className="font-semibold text-base">{customerDisplayName}</p>
            )}
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

        {/* User Group Selector - show if multiple groups available */}
        {displayedData.data.all_user_groups && displayedData.data.all_user_groups.length > 1 && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              Company / Customer Context
            </label>
            <Select
              value={selectedUserGroupId?.toString() || displayedData.data.user_group_id?.toString()}
              onValueChange={(value) => {
                if (onUserGroupChange) {
                  onUserGroupChange(Number(value));
                }
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {displayedData.data.all_user_groups.map((group: any) => (
                  <SelectItem key={group.id} value={group.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span>{group.name || `Group ${group.id}`}</span>
                      {group.is_default && (
                        <Badge variant="outline" className="text-xs">Default</Badge>
                      )}
                      {group.is_personal && (
                        <Badge variant="outline" className="text-xs">Personal</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Viewing bookings for: <strong>
                {displayedData.data.all_user_groups.find((g: any) => g.id === (selectedUserGroupId || displayedData.data.user_group_id))?.name || 'Selected group'}
              </strong>
            </p>
          </div>
        )}

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
              {bookingUrl ? (
                <a
                  href={bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-sm hover:text-primary hover:underline flex items-center gap-1"
                >
                  {data.priority_booking_type === 'upcoming' ? 'Upcoming' : 'Recent'} Booking
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <p className="font-medium text-sm">
                  {data.priority_booking_type === 'upcoming' ? 'Upcoming' : 'Recent'} Booking
                </p>
              )}
              {bookingId && (
                <Badge variant="outline" className="text-xs">
                  #{bookingId}
                </Badge>
              )}
            </div>
            
            {/* Status Chips */}
            <div className="flex flex-wrap gap-2 mb-2">
              {data.ui_meta?.status_label && (
                <Badge variant="outline" className="text-xs">
                  {data.ui_meta.status_label}
                </Badge>
              )}
              {/* Unable to complete chip */}
              {data.ui_meta?.unable_to_complete && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-amber-900 text-xs">
                  {data.ui_meta?.unable_label ?? 'Unable to complete'}
                </span>
              )}
              {/* Paid state chip */}
              {data.ui_meta?.money?.paid_state && (
                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${
                  data.ui_meta.money.paid_state === 'paid' 
                    ? 'bg-green-100 text-green-900' 
                    : data.ui_meta.money.paid_state === 'partially_paid' 
                    ? 'bg-yellow-100 text-yellow-900' 
                    : data.ui_meta.money.paid_state === 'unpaid' 
                    ? 'bg-red-100 text-red-900' 
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  {data.ui_meta.money.paid_state === 'paid' ? 'Paid' :
                   data.ui_meta.money.paid_state === 'partially_paid' ? 'Partially paid' :
                   data.ui_meta.money.paid_state === 'unpaid' ? 'Unpaid' : 'Payment'}
                </span>
              )}
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

            {/* Order Summary with Line Items */}
            {data.ui_meta?.order_lines && data.ui_meta.order_lines.length > 0 && (
              <div className="mt-3 rounded-lg border p-3">
                <div className="font-medium mb-2 text-sm">Order Summary</div>

                {/* Line Items */}
                <div className="space-y-1 mb-2">
                  {data.ui_meta.order_lines.map((line: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="truncate">
                        {line.name}{line.quantity > 1 ? ` × ${line.quantity}` : ''}
                      </div>
                      <div className={`${line.is_discount ? 'text-red-600' : ''} ${data.ui_meta?.unable_to_complete ? 'line-through text-muted-foreground' : ''}`}>
                        {moneyFmt(line.amount_gross, line.currency)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                {data.ui_meta?.money && (
                  <div className="border-t pt-2 text-sm space-y-1">
                    <div className="flex justify-between text-muted-foreground">
                      <span>VAT</span>
                      <span className={data.ui_meta?.unable_to_complete ? 'line-through text-muted-foreground' : ''}>
                        {moneyFmt(data.ui_meta.money.vat, data.ui_meta.money.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Total</span>
                      <span className={data.ui_meta?.unable_to_complete ? 'line-through text-muted-foreground' : ''}>
                        {moneyFmt(data.ui_meta.money.gross, data.ui_meta.money.currency)}
                      </span>
                    </div>
                    {data.ui_meta.money.outstanding > 0 && (
                      <div className="flex justify-between text-rose-700">
                        <span>Outstanding</span>
                        <span className={data.ui_meta?.unable_to_complete ? 'line-through text-muted-foreground' : ''}>
                          {moneyFmt(data.ui_meta.money.outstanding, data.ui_meta.money.currency)}
                        </span>
                      </div>
                    )}
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

        {/* Service Tags with Icons */}
        {data.ui_meta?.order_tags && data.ui_meta.order_tags.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Service Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {data.ui_meta.order_tags.map((tag: string, idx: number) => {
                const style = getServiceTagStyle(tag);
                const IconComponent = style.icon;
                
                return (
                  <span key={idx} className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${style.bg} ${style.text}`}>
                    {IconComponent && <IconComponent className="w-3 h-3" />}
                    {tag}
                  </span>
                );
              })}
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

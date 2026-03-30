import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { 
  Loader2, User, Package, AlertCircle, Calendar, DollarSign, CheckCircle2, Star, ExternalLink,
  Archive, RotateCcw, Truck, Users, Droplets, Target, Gauge, Zap, Building2, RefreshCw,
  Crown, Ticket
} from 'lucide-react';
import { useNoddihKundeData } from '@/hooks/useNoddihKundeData';
import { displayName } from '@/utils/noddiHelpers';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { getCustomerCacheKey } from '@/utils/customerCacheKey';
import { logger } from '@/utils/logger';
import { useAuth } from '@/hooks/useAuth';

interface NoddiCustomerDetailsProps {
  customerId?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  noddiEmail?: string; // Separate Noddi lookup email
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
  noddiEmail,
  onDataLoaded,
  noddiData: externalNoddiData,
  onUserGroupChange,
  selectedUserGroupId,
}) => {
  // Use noddiEmail for lookups if provided, fallback to customerEmail
  const lookupEmail = noddiEmail || customerEmail;
  
  // Debug logging to verify props
  console.log('[NoddiCustomerDetails] Props received:', {
    customerId,
    customerEmail,
    noddiEmail,
    lookupEmail,
    hasMetadata: !!noddiEmail
  });
  
  // Only fetch if no external data provided
  // CRITICAL: Pass customerId so edge function can fetch alternative_emails from DB
  const { data: fetchedData, isLoading } = useNoddihKundeData(
    externalNoddiData ? null : {
      id: customerId || '',
      email: lookupEmail,
      phone: customerPhone,
      full_name: customerName,
    },
    customerId // Pass customerId explicitly for edge function to use
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
        // Filter unpaid bookings for this specific group
        const groupUnpaidBookings = (noddiData.data.unpaid_bookings || []).filter(
          (booking: any) => booking.user_group_id === selectedUserGroupId
        );
        
        return {
          ...noddiData,
          data: {
            ...noddiData.data,
            user_group_id: selectedGroupData.id,
            priority_booking: selectedGroupData.booking,
            priority_booking_type: selectedGroupData.booking_type,
            unpaid_count: selectedGroupData.bookings_summary?.unpaid_count || 0,
            unpaid_bookings: groupUnpaidBookings,
            membership_programs: selectedGroupData.membership_programs || [],
            coupons: selectedGroupData.coupons || [],
            ui_meta: {
              ...noddiData.data.ui_meta,
              user_group_badge: selectedGroupData.id,
              unpaid_count: selectedGroupData.bookings_summary?.unpaid_count || 0,
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
    if (onDataLoaded) {
      // Always call onDataLoaded, even if displayedData is null/undefined
      // This ensures parent knows about the "not found" state
      onDataLoaded(displayedData || null);
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

  // Helper functions to extract booking details
  const extractVehicleLabel = (b: any): string | null => {
    const plate = b?.car?.registration ?? b?.vehicle?.plate ?? null;
    const model = b?.car?.model ?? b?.vehicle?.model ?? null;
    const make = b?.car?.make ?? b?.vehicle?.make ?? null;
    
    const composed = [make, model].filter(Boolean).join(" ");
    if (composed && plate) return `${composed} (${plate})`;
    if (composed) return composed;
    if (plate) return plate;
    return null;
  };

  const extractServiceTitle = (b: any): string | null => {
    const direct = b?.service?.name ?? b?.service_name ?? null;
    if (direct) return String(direct);
    
    const lines = b?.order?.order_lines ?? [];
    const firstNonDiscount = (Array.isArray(lines) ? lines : []).find(
      (l: any) => !/discount/i.test(String(l?.description ?? l?.name ?? ""))
    );
    
    return firstNonDiscount?.description ?? firstNonDiscount?.name ?? null;
  };

  const extractLineItems = (b: any) => {
    const lines = Array.isArray(b?.order?.order_lines) ? b.order.order_lines : [];
    return lines.map((l: any) => ({
      name: String(l?.description ?? l?.name ?? 'Item'),
      quantity: Number(l?.quantity ?? 1),
      amount_gross: Number(l?.amount_gross?.amount ?? 0),
      currency: l?.currency ?? b?.order?.currency ?? 'NOK',
      is_discount: Boolean(l?.is_discount === true || l?.is_coupon_discount === true),
      is_fee: Boolean(l?.is_delivery_fee === true)
    }));
  };

  const extractMoney = (b: any) => {
    const currency = b?.order?.currency ?? 'NOK';
    return {
      currency,
      gross: Number(b?.order?.amount_gross?.amount ?? 0),
      net: Number(b?.order?.amount_net?.amount ?? 0),
      vat: Number(b?.order?.amount_vat?.amount ?? 0),
      paid: Number(b?.order?.amount_paid?.amount ?? 0),
      outstanding: Number(b?.order?.amount_outstanding?.amount ?? 0)
    };
  };

  if (isLoadingData) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-muted-foreground">Customer Information</span>
        </div>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!displayedData?.data?.found) {
    // SOLUTION 4: Show customer name/phone even when Noddi lookup fails
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-muted-foreground">Customer Information</span>
        </div>
        {customerName && (
          <div>
            <p className="font-semibold text-xs">{customerName}</p>
            <Badge variant="outline" className="mt-1 h-4 px-1 text-[10px]">
              From Call Record
            </Badge>
          </div>
        )}
        
        {(customerEmail || customerPhone) && (
          <p className="text-xs text-muted-foreground">
            {[customerEmail, customerPhone].filter(Boolean).join(' · ')}
          </p>
        )}
        
        <Alert className="bg-muted/30">
          <AlertCircle className="h-3 w-3" />
          <AlertDescription className="text-xs">
            No Noddi customer data found for this contact.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { data } = displayedData;
  
  // Select the correct user group - prioritize selected group, then default group
  const userGroup = data.all_user_groups?.find(
    (g: any) => g.id === (selectedUserGroupId || data.user_group_id)
  ) || data.all_user_groups?.[0];
  
  const customerDisplayName = userGroup?.name || displayName(data.user, customerEmail);
  const unpaidCount = data.unpaid_count || 0;
  const isPriority = data.priority_booking_type === 'upcoming';
  const hasBooking = data.priority_booking != null;
  const hasUnpaidBookings = unpaidCount > 0;
  const bookingsSummary = userGroup?.bookings_summary;
  const hasBookingHistory = (bookingsSummary?.total_count || 0) > 0;
  
  // Extract the most recent booking from user group (priority_booking is at user_group level, not bookings_summary)
  const mostRecentBooking = userGroup?.priority_booking || null;
  const hasRecentBookingDetails = mostRecentBooking != null;
  
  const hasAnyBookingData = hasBooking || hasUnpaidBookings || hasBookingHistory;

  // Debug booking data analysis (only in DEBUG mode)
  logger.debug('Noddi data analysis', {
    hasBooking,
    hasUnpaidBookings,
    hasAnyBookingData,
    unpaidCount,
    isPriority,
    source: noddiData?.source
  }, 'NoddiCustomerDetails');
  
  // Extract partner URLs
  const customerUrl = data.ui_meta?.partner_urls?.customer_url;
  const bookingUrl = data.ui_meta?.partner_urls?.booking_url;
  const bookingId = data.ui_meta?.partner_urls?.booking_id;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase text-muted-foreground">Customer Information</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1.5"
          onClick={handleForceRefresh}
          disabled={isLoadingData}
        >
          <RefreshCw className={`h-3 w-3 ${isLoadingData ? 'animate-spin' : ''}`} />
        </Button>
      </div>
        {/* Show email alias indicator if using different email for lookups */}
        {noddiEmail && noddiEmail !== customerEmail && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-xs text-blue-900">
              Contact email: <strong>{customerEmail}</strong><br />
              Noddi lookup email: <strong>{noddiEmail}</strong>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Show which email was used for lookup if different */}
        {data.ui_meta?.match_mode === 'email' && 
         data.user?.email && 
         customerEmail && 
         data.user.email !== customerEmail && 
         !noddiEmail && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-xs text-blue-900">
              Booking data found using alternative email: <strong>{data.user.email}</strong>
            </AlertDescription>
          </Alert>
        )}

        {/* Customer Name and Status */}
        <div>
          <div className="flex items-center gap-1 mb-1 flex-wrap">
            {customerUrl ? (
              <a 
                href={customerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-xs hover:text-primary hover:underline flex items-center gap-1"
              >
                {customerDisplayName}
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span className="font-semibold text-xs">{customerDisplayName}</span>
            )}
            <Badge variant="outline" className="h-4 px-1 text-[10px] border-success/50 bg-success/5">
              <CheckCircle2 className="h-2.5 w-2.5 text-success mr-0.5" />
              Verified
            </Badge>
            
            {userGroup?.is_personal && (
              <Badge variant="outline" className="h-4 px-1 text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                Personal
              </Badge>
            )}
            {!userGroup?.is_personal && userGroup?.name && (
              <Badge variant="outline" className="h-4 px-1 text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                Business
              </Badge>
            )}
            {userGroup?.is_default && (
              <Badge variant="outline" className="h-4 px-1 text-[10px] bg-gray-50 text-gray-600 border-gray-200">
                Default
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {[customerEmail, data.user?.phone].filter(Boolean).join(' · ')}
          </p>
          {data.user?.email && data.user.email !== customerEmail && (
            <p className="text-xs text-muted-foreground">
              Noddi: {data.user.email}
            </p>
          )}
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
          <div className="p-2 rounded-lg bg-warning/5 border border-warning/20">
            <div className="flex items-center gap-1 mb-0.5">
              <Star className="h-3 w-3 text-warning" />
              <p className="font-medium text-xs">Priority Customer</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Upcoming booking — priority service.
            </p>
          </div>
        )}

        {/* Active Booking or Unpaid Bookings */}
        {hasAnyBookingData && (
          <div className="space-y-3">
            {/* Existing priority booking section */}
            {hasBooking && (
              <div className="p-2 rounded-lg bg-muted">
            <div className="flex items-center gap-1 mb-1">
              <Package className="h-3 w-3" />
              {bookingUrl ? (
                <a
                  href={bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-xs hover:text-primary hover:underline flex items-center gap-1"
                >
                  {data.priority_booking_type === 'upcoming' ? 'Upcoming' : 'Recent'} Booking
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="font-medium text-xs">
                  {data.priority_booking_type === 'upcoming' ? 'Upcoming' : 'Recent'} Booking
                </span>
              )}
              {bookingId && (
                <Badge variant="outline" className="h-4 px-1 text-[10px]">
                  #{bookingId}
                </Badge>
              )}
            </div>
            
            {/* Status Chips */}
            <div className="flex flex-wrap gap-1 mb-1">
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
              <p className="text-xs text-muted-foreground mb-1">
                Date: {format(new Date(data.ui_meta.booking_date_iso), 'PPP')}
              </p>
            )}
            {data.ui_meta?.service_title && (
              <p className="text-xs text-muted-foreground mb-0.5">
                Service: {data.ui_meta.service_title}
              </p>
            )}
            {data.ui_meta?.vehicle_label && (
              <p className="text-xs text-muted-foreground mb-0.5">
                Vehicle: {data.ui_meta.vehicle_label}
              </p>
            )}

            {/* Order Summary with Line Items */}
            {data.ui_meta?.order_lines && data.ui_meta.order_lines.length > 0 && (
              <div className="mt-2 rounded-lg border p-2">
                <div className="font-medium mb-1 text-xs">Order Summary</div>

                {/* Line Items */}
                <div className="space-y-0.5 mb-1">
                  {data.ui_meta.order_lines.map((line: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
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
                  <div className="border-t pt-1 text-xs space-y-0.5">
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
            
            {/* TEMPORARY: Debug section when no booking data */}
            {!hasAnyBookingData && data.found && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-xs">
                  <div className="space-y-2">
                    <p className="font-medium text-blue-900">Debug: No booking data found</p>
                    <details className="cursor-pointer">
                      <summary className="text-blue-700">View raw API response</summary>
                      <pre className="mt-2 text-[10px] overflow-auto max-h-40 bg-white p-2 rounded">
                        {JSON.stringify({
                          source: noddiData?.source,
                          priority_booking: data.priority_booking ? 'EXISTS' : 'NULL',
                          priority_booking_type: data.priority_booking_type,
                          unpaid_count: data.unpaid_count,
                          unpaid_bookings_count: data.unpaid_bookings?.length || 0,
                          all_user_groups_count: data.all_user_groups?.length || 0,
                          bookings_summary: userGroup?.bookings_summary,
                          ui_meta_version: data.ui_meta?.version
                        }, null, 2)}
                      </pre>
                    </details>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* NEW: Show unpaid bookings list if no priority booking */}
            {!hasBooking && hasUnpaidBookings && (
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-1 mb-1">
                  <AlertCircle className="h-3 w-3 text-amber-700" />
                  <p className="font-medium text-xs text-amber-900">
                    {unpaidCount} Unpaid Booking{unpaidCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  This customer has bookings with outstanding payments. Check the Noddi admin panel for details.
                </p>
              </div>
            )}

            {/* Booking History Summary - when no active/priority bookings */}
            {!hasBooking && !hasUnpaidBookings && hasBookingHistory && bookingsSummary && (
              <div className="p-2 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-center gap-1 mb-1">
                  <Package className="h-3 w-3 text-green-700" />
                  <p className="font-medium text-xs text-green-900">
                    Most Recent Booking
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                  <div>
                    <span className="text-muted-foreground">Total bookings:</span>
                    <span className="ml-1 font-medium">{bookingsSummary.total_count}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Completed:</span>
                    <span className="ml-1 font-medium text-green-700">{bookingsSummary.completed_count}</span>
                  </div>
                </div>

                {/* Show order details if available */}
                {hasRecentBookingDetails && mostRecentBooking && (
                  <>
                    {/* Booking date */}
                    {mostRecentBooking.completedAt && (
                      <p className="text-xs text-muted-foreground mb-1">
                        Date: {format(new Date(mostRecentBooking.completedAt), 'PPP')}
                      </p>
                    )}
                    
                    {extractVehicleLabel(mostRecentBooking) && (
                      <p className="text-xs text-muted-foreground mb-0.5">
                        Vehicle: {extractVehicleLabel(mostRecentBooking)}
                      </p>
                    )}
                    {extractServiceTitle(mostRecentBooking) && (
                      <p className="text-xs text-muted-foreground mb-0.5">
                        Service: {extractServiceTitle(mostRecentBooking)}
                      </p>
                    )}

                    {/* Service Tags */}
                    {mostRecentBooking.tags && Array.isArray(mostRecentBooking.tags) && mostRecentBooking.tags.length > 0 && (
                      <div className="mb-3">
                        <div className="flex flex-wrap gap-1.5">
                          {mostRecentBooking.tags.map((tag: string, idx: number) => {
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

                    {/* Order lines and totals */}
                    {mostRecentBooking.order?.order_lines && mostRecentBooking.order.order_lines.length > 0 && (
                      <div className="mt-2 rounded-lg border border-green-300 bg-white p-2">
                        <div className="font-medium mb-1 text-xs">Order Summary</div>
                        
                        <div className="space-y-0.5 mb-1">
                          {extractLineItems(mostRecentBooking).map((line: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <div className="truncate">
                                {line.name}{line.quantity > 1 ? ` × ${line.quantity}` : ''}
                              </div>
                              <div className={line.is_discount ? 'text-red-600' : ''}>
                                {moneyFmt(line.amount_gross, line.currency)}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Totals */}
                        {extractMoney(mostRecentBooking) && (
                          <div className="border-t pt-1 text-xs space-y-0.5">
                            <div className="flex justify-between text-muted-foreground">
                              <span>VAT</span>
                              <span>{moneyFmt(extractMoney(mostRecentBooking).vat, extractMoney(mostRecentBooking).currency)}</span>
                            </div>
                            <div className="flex justify-between font-medium">
                              <span>Total</span>
                              <span>{moneyFmt(extractMoney(mostRecentBooking).gross, extractMoney(mostRecentBooking).currency)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
                
                {!hasRecentBookingDetails && (
                  <p className="text-xs text-muted-foreground mt-2">
                    All bookings completed and paid. View full history in Noddi admin.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Unpaid Bookings Warning - shown for ALL customers with unpaid bookings */}
        {unpaidCount > 0 && (
          <div className="p-2 rounded-lg bg-destructive/5 border border-destructive/20">
            <div className="flex items-center gap-1 mb-0.5">
              <AlertCircle className="h-3 w-3 text-destructive" />
              <p className="font-medium text-xs text-destructive">
                {unpaidCount} Unpaid Booking{unpaidCount !== 1 ? 's' : ''}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Customer has {unpaidCount} booking{unpaidCount !== 1 ? 's' : ''} with outstanding payments.
            </p>
          </div>
        )}

        {/* Membership Programs */}
        {userGroup?.membership_programs && userGroup.membership_programs.length > 0 && (
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Crown className="h-3 w-3 text-amber-500" />
              <p className="text-xs font-medium text-muted-foreground">Membership Programs</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {userGroup.membership_programs.map((program: any, idx: number) => (
                <Badge
                  key={program.id || idx}
                  variant="outline"
                  className="text-xs bg-amber-50 text-amber-800 border-amber-200"
                >
                  <Crown className="h-2.5 w-2.5 mr-1" />
                  {program.name}
                  {program.status && (
                    <span className={`ml-1 text-[10px] ${
                      program.status === 'active' ? 'text-green-600' : 'text-muted-foreground'
                    }`}>
                      • {program.status}
                    </span>
                  )}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Coupons */}
        {userGroup?.coupons && userGroup.coupons.length > 0 && (
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Ticket className="h-3 w-3 text-purple-500" />
              <p className="text-xs font-medium text-muted-foreground">Coupons</p>
            </div>
            <div className="space-y-1">
              {userGroup.coupons.map((coupon: any, idx: number) => (
                <div
                  key={coupon.id || idx}
                  className="flex items-center justify-between p-1.5 rounded border bg-purple-50/50 border-purple-200"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Ticket className="h-3 w-3 text-purple-500 shrink-0" />
                    <div className="min-w-0">
                      {coupon.code && (
                        <span className="text-xs font-mono font-medium text-purple-800">{coupon.code}</span>
                      )}
                      {coupon.description && (
                        <p className="text-[10px] text-muted-foreground truncate">{coupon.description}</p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] shrink-0 ${
                      coupon.is_active !== false ? 'bg-green-50 text-green-700 border-green-200' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {coupon.is_active !== false ? 'Active' : 'Expired'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Service Tags with Icons */}
        {data.ui_meta?.order_tags && data.ui_meta.order_tags.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Service Tags</p>
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
        <div className="pt-2 border-t text-xs text-muted-foreground">
          <p>
            Data source: {noddiData.source === 'cache' ? 'Cached' : 'Live'} 
            {data.ui_meta?.version && ` • v${data.ui_meta.version}`}
          </p>
        </div>
    </div>
  );
};

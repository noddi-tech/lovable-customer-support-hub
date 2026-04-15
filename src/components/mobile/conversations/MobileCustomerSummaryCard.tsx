import { useState } from 'react';
import { 
  ChevronDown, Phone, Mail, Car, Calendar, AlertTriangle, CreditCard,
  ExternalLink, Archive, RotateCcw, Truck, Package, Users, Droplets, 
  Target, Gauge, Zap, Crown, Ticket, MapPin, Star
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { NoddiLookupResponse } from '@/hooks/useNoddihKundeData';

interface MobileCustomerSummaryCardProps {
  customer: any;
  noddiData?: NoddiLookupResponse | null;
}

const getServiceTagStyle = (tag: string) => {
  const t = tag.toLowerCase();
  if (t.includes('dekkhotell')) return { bg: 'bg-blue-100', text: 'text-blue-900', icon: Archive };
  if (t.includes('dekkskift')) return { bg: 'bg-green-100', text: 'text-green-900', icon: RotateCcw };
  if (t.includes('hjemlevering')) return { bg: 'bg-purple-100', text: 'text-purple-900', icon: Truck };
  if (t.includes('henting') || t.includes('levering')) return { bg: 'bg-orange-100', text: 'text-orange-900', icon: Package };
  if (t.includes('bærehjelp')) return { bg: 'bg-teal-100', text: 'text-teal-900', icon: Users };
  if (t.includes('felgvask')) return { bg: 'bg-indigo-100', text: 'text-indigo-900', icon: Droplets };
  if (t.includes('balansering')) return { bg: 'bg-pink-100', text: 'text-pink-900', icon: Target };
  if (t.includes('tpms') || t.includes('ventil')) return { bg: 'bg-red-100', text: 'text-red-900', icon: Gauge };
  if (t.includes('punktering')) return { bg: 'bg-yellow-100', text: 'text-yellow-900', icon: Zap };
  return { bg: 'bg-muted', text: 'text-muted-foreground', icon: null };
};

const formatBookingType = (type: string): string => {
  if (type === 'normal') return '';
  const map: Record<string, string> = {
    wheel_storage_pickup: 'Wheel Storage Pickup',
    wheel_storage_delivery: 'Wheel Storage Delivery',
    tire_change: 'Tire Change',
  };
  return map[type.toLowerCase()] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const moneyFmt = (amt: number, cur: string) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: cur }).format(amt);

export const MobileCustomerSummaryCard = ({ customer, noddiData }: MobileCustomerSummaryCardProps) => {
  const found = noddiData?.ok && noddiData?.data?.found;
  const meta = noddiData?.data?.ui_meta;
  const hasNoddiInfo = !!found && !!meta;

  const [expanded, setExpanded] = useState(hasNoddiInfo);

  if (!customer && !hasNoddiInfo) return null;

  // Version gating (same logic as desktop)
  const version = meta?.version || "1.0";
  const verNum = (() => {
    const m = /noddi-edge-(\d+)\.(\d+)/.exec(version);
    return m ? Number(`${m[1]}.${m[2]}`) : 0;
  })();
  const showV13 = verNum >= 1.3;
  const showV15 = verNum >= 1.5;
  const showV16 = verNum >= 1.6;

  const name = meta?.display_name || customer?.full_name;
  const email = customer?.email;
  const phone = noddiData?.data?.user?.phone_number || customer?.phone;
  const unpaidCount = noddiData?.data?.unpaid_count || 0;
  const statusLabel = meta?.status_label;
  const vehicleLabel = showV13 ? meta?.vehicle_label : null;
  const serviceTitle = showV13 ? meta?.service_title : null;
  const bookingDate = meta?.booking_date_iso;
  const timezone = meta?.timezone || "Europe/Oslo";
  const mny = meta?.money;
  const matchMode = meta?.match_mode || "email";
  const conflict = meta?.conflict || false;
  const tags: string[] = showV15 && Array.isArray(meta?.order_tags) ? meta.order_tags : [];
  const allGroups = noddiData?.data?.all_user_groups;
  const totalBookings = allGroups?.reduce((sum, g) => sum + (g.total_bookings || 0), 0) || 0;

  // Partner URLs
  const urls = showV13 ? meta?.partner_urls : undefined;
  const customerUrl = urls?.customer_url || null;
  const bookingUrl = urls?.booking_url || null;
  const bookingId = urls?.booking_id || null;

  // Order lines
  const orderLines = showV16 && Array.isArray(meta?.order_lines) ? meta.order_lines : [];

  // Formatted date
  const when = (() => {
    if (!bookingDate) return null;
    const d = new Date(bookingDate);
    return Number.isNaN(d.getTime()) ? null :
      new Intl.DateTimeFormat(undefined, {
        year: "numeric", month: "short", day: "2-digit",
        hour: "2-digit", minute: "2-digit", timeZone: timezone
      }).format(d);
  })();

  return (
    <div className="border-b border-border bg-muted/20">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
      >
        <Avatar className="h-6 w-6 shrink-0">
          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
            {(name || email || '?')[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium truncate">{name || email || 'Unknown'}</span>
            {/* Segment badges */}
            {(() => {
              const selectedGroup = allGroups?.find(g => g.id === noddiData?.data?.user_group_id) || allGroups?.[0];
              const segments = (selectedGroup as any)?.segments || [];
              const segLabels: Record<string, string> = { vip: 'VIP', new_customer: 'New', prospects: 'Prospect', customers: 'Customer' };
              const segColors: Record<string, string> = { vip: 'bg-amber-100 text-amber-900', new_customer: 'bg-green-100 text-green-900', prospects: 'bg-blue-100 text-blue-900', customers: 'bg-gray-100 text-gray-700' };
              const uniqueSegments = [...new Map(segments.map((s: any) => [s.segment, s])).values()];
              return uniqueSegments.map((s: any, i: number) => (
                <span key={i} className={`rounded-full px-1.5 py-0.5 text-[9px] ${segColors[s.segment] || 'bg-gray-100 text-gray-700'}`}>
                  {segLabels[s.segment] || s.segment}
                </span>
              ));
            })()}
            {totalBookings > 0 && (
              <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">
                {totalBookings} booking{totalBookings > 1 ? 's' : ''}
              </Badge>
            )}
            {unpaidCount > 0 && (
              <Badge variant="destructive" className="text-[9px] h-4 px-1 shrink-0 gap-0.5">
                <AlertTriangle className="h-2.5 w-2.5" />
                {unpaidCount} ubetalt
              </Badge>
            )}
          </div>
        </div>

        <ChevronDown className={cn(
          "h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0",
          expanded && "rotate-180"
        )} />
      </button>

      {expanded && (
        <div className="px-3 pb-2 space-y-1.5">
          {/* Contact info */}
          {email && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{email}</span>
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Phone className="h-3 w-3 shrink-0" />
              <span>{phone}</span>
            </div>
          )}

          {/* Match mode & conflict */}
          {hasNoddiInfo && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="rounded-full border px-1.5 py-0.5 text-[9px] text-muted-foreground">
                Matched by {matchMode === "phone" ? "Phone" : "Email"}
              </span>
              {conflict && (
                <span className="rounded-full bg-yellow-100 px-1.5 py-0.5 text-[9px] text-yellow-800">
                  Conflict
                </span>
              )}
            </div>
          )}

          {/* Partner URLs */}
          {(customerUrl || bookingUrl) && (
            <div className="flex items-center gap-2 flex-wrap">
              {customerUrl && (
                <a href={customerUrl} target="_blank" rel="noopener noreferrer"
                  className="text-[10px] text-primary underline hover:no-underline flex items-center gap-0.5">
                  Open Customer <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
              {bookingUrl && (
                <a href={bookingUrl} target="_blank" rel="noopener noreferrer"
                  className="text-[10px] text-primary underline hover:no-underline flex items-center gap-0.5">
                  Open Booking{bookingId ? ` #${bookingId}` : ""} <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </div>
          )}

          {/* Service tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map(t => {
                const style = getServiceTagStyle(t);
                const Icon = style.icon;
                return (
                  <span key={t} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] rounded-full ${style.bg} ${style.text}`}>
                    {Icon && <Icon className="w-2.5 h-2.5" />}
                    {t}
                  </span>
                );
              })}
            </div>
          )}

          {/* Priority booking info */}
          {hasNoddiInfo && (serviceTitle || vehicleLabel || statusLabel) && (
            <div className="bg-muted/50 rounded px-2 py-1.5 space-y-0.5">
              {serviceTitle && (
                <div className="flex items-center gap-1.5 text-[11px]">
                  <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="font-medium truncate">{serviceTitle}</span>
                </div>
              )}
              {vehicleLabel && (
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Car className="h-3 w-3 shrink-0" />
                  <span className="truncate">{vehicleLabel}</span>
                </div>
              )}
              {when && (
                <div className="text-[10px] text-muted-foreground pl-[18px]">{when}</div>
              )}
              <div className="flex flex-wrap gap-1 mt-0.5">
                {statusLabel && (
                  <Badge variant="outline" className="text-[9px] h-4 px-1">{statusLabel}</Badge>
                )}
                {/* Booking type badge */}
                {meta?.booking_type && meta.booking_type !== 'normal' && (
                  <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[9px] text-orange-900">
                    {formatBookingType(meta.booking_type)}
                  </span>
                )}
                {/* Location type badge */}
                {meta?.location_type && (
                  <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] ${
                    meta.location_type === 'mobile' ? 'bg-blue-100 text-blue-900' : 'bg-gray-100 text-gray-700'
                  }`}>
                    <MapPin className="h-2.5 w-2.5" />
                    {meta.location_type === 'mobile' ? 'Mobile' : 'Stationary'}
                  </span>
                )}
                {/* Unable to complete */}
                {showV16 && meta?.unable_to_complete && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-amber-900 text-[9px]">
                    {meta?.unable_label ?? 'Unable to complete'}
                  </span>
                )}
                {/* Paid state chip */}
                {showV16 && mny?.paid_state && (
                  <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] ${
                    mny.paid_state === 'paid' ? 'bg-green-100 text-green-900' :
                    mny.paid_state === 'partially_paid' ? 'bg-yellow-100 text-yellow-900' :
                    mny.paid_state === 'unpaid' ? 'bg-red-100 text-red-900' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {mny.paid_state === 'paid' ? 'Paid' :
                     mny.paid_state === 'partially_paid' ? 'Partially paid' :
                     mny.paid_state === 'unpaid' ? 'Unpaid' : 'Payment'}
                  </span>
                )}
              </div>

              {/* Unable to complete public comment */}
              {meta?.unable_to_complete && meta?.comments_unable_to_complete_public && (
                <p className="text-[10px] text-amber-800 mt-0.5 truncate">
                  {meta.comments_unable_to_complete_public}
                </p>
              )}

              {/* Feedback overall rating */}
              {meta?.feedback && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Star className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />
                  <span className="text-[10px] text-muted-foreground">
                    {meta.feedback.customer_rating_overall}/5 overall
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Order summary */}
          {(orderLines.length > 0 || (showV16 && mny && (mny.gross || mny.vat))) && (
            <div className="bg-muted/30 rounded px-2 py-1.5 space-y-1">
              <div className="text-[10px] font-medium">Order Summary</div>
              {orderLines.length > 0 && (
                <div className="space-y-0.5">
                  {orderLines.map((l, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px]">
                      <span className="truncate mr-2">
                        {l.name}{l.quantity > 1 ? ` × ${l.quantity}` : ''}
                      </span>
                      <span className={cn(
                        "shrink-0",
                        l.is_discount && 'text-destructive',
                        meta?.unable_to_complete && 'line-through text-muted-foreground'
                      )}>
                        {moneyFmt(l.amount_gross, l.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {mny && (
                <div className="border-t border-border/50 pt-1 space-y-0.5 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VAT</span>
                    <span className={meta?.unable_to_complete ? 'line-through text-muted-foreground' : ''}>
                      {moneyFmt(mny.vat, mny.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span className={meta?.unable_to_complete ? 'line-through text-muted-foreground' : ''}>
                      {moneyFmt(mny.gross, mny.currency)}
                    </span>
                  </div>
                  {mny.outstanding > 0 && (
                    <div className="flex justify-between text-destructive">
                      <span>Outstanding</span>
                      <span className={meta?.unable_to_complete ? 'line-through text-muted-foreground' : ''}>
                        {moneyFmt(mny.outstanding, mny.currency)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Payment warning */}
          {mny && mny.outstanding > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] text-destructive">
              <CreditCard className="h-3 w-3 shrink-0" />
              <span>Utestående: {moneyFmt(mny.outstanding, mny.currency)}</span>
            </div>
          )}

          {/* Membership Programs */}
          {(() => {
            const selectedGroup = allGroups?.find(g => g.id === noddiData?.data?.user_group_id) || allGroups?.[0];
            const programs = selectedGroup?.membership_programs;
            const coupons = selectedGroup?.coupons;
            return (
              <>
                {programs && programs.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {programs.map((p: any, i: number) => (
                      <span key={p.id || i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] rounded-full bg-amber-100 text-amber-900">
                        <Crown className="w-2.5 h-2.5" />
                        {p.name}
                      </span>
                    ))}
                  </div>
                )}
                {coupons && coupons.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {coupons.map((c: any, i: number) => {
                      const label = c.description_public || c.description || c.code || c.name || c.coupon_code || `Coupon #${c.id || i + 1}`;
                      const val = c.value ?? c.discount_value ?? c.amount ?? c.coupon?.value ?? null;
                      const discType = c.discount_type || c.type || c.coupon?.discount_type || null;
                      return (
                      <span key={c.id || i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] rounded-full bg-purple-100 text-purple-900">
                        <Ticket className="w-2.5 h-2.5" />
                        {label}
                        {val != null && (
                          <span className="font-medium ml-0.5">
                            {discType === 'percentage' ? `${val}%` : `${val} kr`}
                          </span>
                        )}
                      </span>
                      );
                    })}
                  </div>
                )}
              </>
            );
          })()}

          {/* User groups */}
          {allGroups && allGroups.length > 1 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {allGroups.map((g) => (
                <Badge key={g.id} variant="outline" className="text-[9px] h-4 px-1">
                  {g.name} ({g.total_bookings})
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

import { useState } from 'react';
import { ChevronDown, Phone, Mail, Car, Calendar, AlertTriangle, CreditCard } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { NoddiLookupResponse } from '@/hooks/useNoddihKundeData';

interface MobileCustomerSummaryCardProps {
  customer: any;
  noddiData?: NoddiLookupResponse | null;
}

export const MobileCustomerSummaryCard = ({ customer, noddiData }: MobileCustomerSummaryCardProps) => {
  const found = noddiData?.ok && noddiData?.data?.found;
  const uiMeta = noddiData?.data?.ui_meta;
  const hasNoddiInfo = !!found && !!uiMeta;

  const [expanded, setExpanded] = useState(hasNoddiInfo);

  if (!customer && !hasNoddiInfo) return null;

  const name = uiMeta?.display_name || customer?.full_name;
  const email = customer?.email;
  const phone = noddiData?.data?.user?.phone_number || customer?.phone;
  const unpaidCount = noddiData?.data?.unpaid_count || 0;
  const statusLabel = uiMeta?.status_label;
  const vehicleLabel = uiMeta?.vehicle_label;
  const serviceTitle = uiMeta?.service_title;
  const bookingDate = uiMeta?.booking_date_iso;
  const money = uiMeta?.money;
  const allGroups = noddiData?.data?.all_user_groups;
  const totalBookings = allGroups?.reduce((sum, g) => sum + (g.total_bookings || 0), 0) || 0;

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

          {/* Priority booking info */}
          {hasNoddiInfo && (serviceTitle || vehicleLabel || statusLabel) && (
            <div className="bg-muted/50 rounded px-2 py-1.5 space-y-0.5">
              {serviceTitle && (
                <div className="flex items-center gap-1.5 text-[11px]">
                  <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="font-medium truncate">{serviceTitle}</span>
                  {bookingDate && (
                    <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                      {new Date(bookingDate).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </div>
              )}
              {vehicleLabel && (
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Car className="h-3 w-3 shrink-0" />
                  <span className="truncate">{vehicleLabel}</span>
                </div>
              )}
              {statusLabel && (
                <Badge variant="outline" className="text-[9px] h-4 px-1 mt-0.5">
                  {statusLabel}
                </Badge>
              )}
            </div>
          )}

          {/* Payment info */}
          {money && money.outstanding > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] text-destructive">
              <CreditCard className="h-3 w-3 shrink-0" />
              <span>Utestående: {money.currency} {money.outstanding.toLocaleString('nb-NO')}</span>
            </div>
          )}

          {/* User groups with bookings */}
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

import { useState } from 'react';
import { ChevronDown, Phone, Mail, User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MobileCustomerSummaryCardProps {
  customer: any;
  noddiData?: any;
}

export const MobileCustomerSummaryCard = ({ customer, noddiData }: MobileCustomerSummaryCardProps) => {
  const [expanded, setExpanded] = useState(false);
  
  if (!customer && !noddiData?.data?.found) return null;
  
  const name = noddiData?.data?.found 
    ? `${noddiData.data.first_name || ''} ${noddiData.data.last_name || ''}`.trim()
    : customer?.full_name;
  const email = customer?.email;
  const phone = noddiData?.data?.phone_number || customer?.phone;
  
  // Noddi booking info
  const bookings = noddiData?.data?.bookings;
  const hasBookings = bookings && bookings.length > 0;

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
            {hasBookings && (
              <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">
                {bookings.length} booking{bookings.length > 1 ? 's' : ''}
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
        <div className="px-3 pb-2 space-y-1">
          {email && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Mail className="h-3 w-3" />
              <span className="truncate">{email}</span>
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span>{phone}</span>
            </div>
          )}
          {hasBookings && bookings.slice(0, 2).map((booking: any, i: number) => (
            <div key={i} className="text-[10px] bg-muted/50 rounded px-2 py-1">
              <span className="font-medium">{booking.service_name || booking.type || 'Booking'}</span>
              {booking.date && <span className="text-muted-foreground ml-1">· {booking.date}</span>}
              {booking.status && (
                <Badge variant="outline" className="text-[8px] h-3.5 px-1 ml-1">
                  {booking.status}
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

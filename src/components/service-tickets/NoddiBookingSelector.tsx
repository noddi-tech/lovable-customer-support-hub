import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, Car, Loader2 } from 'lucide-react';
import { useNoddiBookings, type NoddiBooking } from '@/hooks/useNoddiBookings';
import { formatDate } from '@/utils/noddiHelpers';

interface NoddiBookingSelectorProps {
  email?: string;
  phone?: string;
  selectedBookingId?: number;
  onSelectBooking: (booking: NoddiBooking | null) => void;
}

export function NoddiBookingSelector({
  email,
  phone,
  selectedBookingId,
  onSelectBooking,
}: NoddiBookingSelectorProps) {
  const { data: bookings, isLoading } = useNoddiBookings({ email, phone });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading bookings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!bookings || bookings.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground text-center">
            No bookings found for this customer
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Link to Noddi Booking</CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={selectedBookingId?.toString() || ''}
          onValueChange={(value) => {
            const booking = bookings.find((b) => b.id.toString() === value);
            onSelectBooking(booking || null);
          }}
        >
          <div className="space-y-3">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="flex items-start space-x-3 border rounded-lg p-3 hover:bg-accent transition-colors"
              >
                <RadioGroupItem value={booking.id.toString()} id={`booking-${booking.id}`} />
                <Label
                  htmlFor={`booking-${booking.id}`}
                  className="flex-1 cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">Booking #{booking.id}</div>
                    <Badge variant="outline">{booking.status}</Badge>
                  </div>
                  
                  {booking.service_title && (
                    <div className="text-sm text-muted-foreground">
                      {booking.service_title}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {booking.date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(booking.date)}
                      </div>
                    )}
                    
                    {booking.vehicle_label && (
                      <div className="flex items-center gap-1">
                        <Car className="h-3 w-3" />
                        {booking.vehicle_label}
                      </div>
                    )}
                    
                    {booking.amount && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {booking.amount} {booking.currency || 'NOK'}
                      </div>
                    )}
                  </div>
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface NoddiBooking {
  id: number;
  booking_type: string;
  status: string;
  date: string;
  customer_name: string;
  vehicle_label?: string;
  service_title?: string;
  amount?: number;
  currency?: string;
}

interface UseNoddiBookingsParams {
  email?: string;
  phone?: string;
  enabled?: boolean;
}

export function useNoddiBookings({ email, phone, enabled = true }: UseNoddiBookingsParams) {
  return useQuery({
    queryKey: ['noddi-bookings', email, phone],
    queryFn: async () => {
      if (!email && !phone) {
        throw new Error('Email or phone required');
      }

      const { data, error } = await supabase.functions.invoke('noddi-customer-lookup', {
        body: { email, phone },
      });

      if (error) throw error;

      // Extract bookings from the response
      const bookings: NoddiBooking[] = [];
      
      if (data?.data?.priority_booking) {
        bookings.push({
          id: data.data.priority_booking.id,
          booking_type: data.data.priority_booking.booking_type || 'unknown',
          status: data.data.priority_booking.status || 'unknown',
          date: data.data.priority_booking.date || new Date().toISOString(),
          customer_name: data.data.display_name || 'Unknown',
          vehicle_label: data.data.priority_booking.vehicle_label,
          service_title: data.data.priority_booking.service_title,
          amount: data.data.priority_booking.amount,
          currency: data.data.priority_booking.currency,
        });
      }

      if (data?.data?.upcoming_bookings) {
        data.data.upcoming_bookings.forEach((booking: any) => {
          bookings.push({
            id: booking.id,
            booking_type: booking.booking_type || 'upcoming',
            status: booking.status || 'scheduled',
            date: booking.date || new Date().toISOString(),
            customer_name: data.data.display_name || 'Unknown',
            vehicle_label: booking.vehicle_label,
            service_title: booking.service_title,
            amount: booking.amount,
            currency: booking.currency,
          });
        });
      }

      if (data?.data?.completed_bookings) {
        data.data.completed_bookings.forEach((booking: any) => {
          bookings.push({
            id: booking.id,
            booking_type: booking.booking_type || 'completed',
            status: booking.status || 'completed',
            date: booking.date || new Date().toISOString(),
            customer_name: data.data.display_name || 'Unknown',
            vehicle_label: booking.vehicle_label,
            service_title: booking.service_title,
            amount: booking.amount,
            currency: booking.currency,
          });
        });
      }

      return bookings;
    },
    enabled: enabled && (!!email || !!phone),
  });
}

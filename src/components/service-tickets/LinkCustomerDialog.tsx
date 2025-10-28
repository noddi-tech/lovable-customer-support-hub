import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, User } from 'lucide-react';
import { CustomerSearch } from './CustomerSearch';
import { NoddiBookingSelector } from './NoddiBookingSelector';
import { useNoddiBookings, type NoddiBooking } from '@/hooks/useNoddiBookings';
import { useUpdateServiceTicket } from '@/hooks/useServiceTickets';
import { supabase } from '@/integrations/supabase/client';

interface LinkCustomerDialogProps {
  ticketId: string;
  currentCustomer?: {
    name?: string;
    email?: string;
    phone?: string;
    noddiUserId?: number;
  };
  currentBookingId?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const LinkCustomerDialog = ({
  ticketId,
  currentCustomer,
  currentBookingId,
  open,
  onOpenChange,
  onSuccess,
}: LinkCustomerDialogProps) => {
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedBooking, setSelectedBooking] = useState<NoddiBooking | null>(null);
  const [organizationId, setOrganizationId] = useState<string>('');
  
  const updateTicket = useUpdateServiceTicket();

  // Get organization ID
  useEffect(() => {
    const fetchOrgId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('user_id', user.id)
          .single();
        if (profile) {
          setOrganizationId(profile.organization_id);
        }
      }
    };
    fetchOrgId();
  }, []);

  // Get customer's bookings
  const { data: noddiBookings } = useNoddiBookings({
    email: selectedCustomer?.email || currentCustomer?.email,
    phone: selectedCustomer?.phone || currentCustomer?.phone,
    enabled: !!(selectedCustomer?.email || selectedCustomer?.phone || currentCustomer?.email || currentCustomer?.phone),
  });

  // Auto-select current booking if exists
  useEffect(() => {
    if (currentBookingId && noddiBookings) {
      const booking = noddiBookings.find(b => b.id === currentBookingId);
      if (booking) {
        setSelectedBooking(booking);
      }
    }
  }, [currentBookingId, noddiBookings]);

  const handleSave = async () => {
    try {
      // Extract customer data
      let noddiUserId: number | undefined;
      let customerName: string | undefined;
      let customerEmail: string | undefined;
      let customerPhone: string | undefined;

      if (selectedCustomer) {
        // Handle temporary Noddi IDs
        if (selectedCustomer.id?.startsWith('noddi-')) {
          noddiUserId = parseInt(selectedCustomer.id.replace('noddi-', ''));
        } else {
          noddiUserId = selectedCustomer.metadata?.noddi_user_id;
        }

        customerName = selectedCustomer.full_name;
        customerEmail = selectedCustomer.email || selectedCustomer.metadata?.noddi_email;
        customerPhone = selectedCustomer.phone;
      }

      const updates: Record<string, any> = {};

      // Only update customer fields if a customer was selected
      if (selectedCustomer) {
        updates.customer_name = customerName;
        updates.customer_email = customerEmail;
        updates.customer_phone = customerPhone;
        if (noddiUserId) {
          updates.noddi_user_id = noddiUserId;
        }
        if (selectedCustomer.metadata?.user_group_id) {
          updates.noddi_user_group_id = selectedCustomer.metadata.user_group_id;
        }
      }

      // Update booking info if selected
      if (selectedBooking) {
        updates.noddi_booking_id = selectedBooking.id;
        updates.noddi_booking_type = selectedBooking.booking_type;
      }

      console.log('Updating ticket with:', updates);

      await updateTicket.mutateAsync({ ticketId, updates });

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update ticket:', error);
    }
  };

  const handleClearCustomer = async () => {
    try {
      const updates = {
        customer_name: null,
        customer_email: null,
        customer_phone: null,
        noddi_user_id: null,
        noddi_booking_id: null,
        noddi_booking_type: null,
        noddi_user_group_id: null,
      };

      await updateTicket.mutateAsync({ ticketId, updates });

      setSelectedCustomer(null);
      setSelectedBooking(null);
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to clear customer:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Link Customer to Ticket</DialogTitle>
          <DialogDescription>
            Search for a customer and optionally link to a Noddi booking
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Customer Info */}
          {currentCustomer && (currentCustomer.name || currentCustomer.email) && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Current Customer
                    </p>
                    {currentCustomer.name && (
                      <p className="text-sm text-muted-foreground">{currentCustomer.name}</p>
                    )}
                    {currentCustomer.email && (
                      <p className="text-sm text-muted-foreground">{currentCustomer.email}</p>
                    )}
                    {currentCustomer.phone && (
                      <p className="text-sm text-muted-foreground">{currentCustomer.phone}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Customer Search */}
          {organizationId && (
            <div className="space-y-2">
              <Label>Search for Customer</Label>
              <CustomerSearch
                selectedCustomer={selectedCustomer}
                onSelectCustomer={setSelectedCustomer}
                organizationId={organizationId}
              />
            </div>
          )}

          {/* Noddi Booking Selector */}
          {noddiBookings && noddiBookings.length > 0 && (
            <div className="space-y-2">
              <Label>Link to Noddi Booking (Optional)</Label>
              <NoddiBookingSelector
                email={selectedCustomer?.email || currentCustomer?.email}
                phone={selectedCustomer?.phone || currentCustomer?.phone}
                selectedBookingId={selectedBooking?.id || currentBookingId}
                onSelectBooking={setSelectedBooking}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClearCustomer}
              disabled={updateTicket.isPending}
            >
              Clear Customer
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateTicket.isPending || !selectedCustomer}
              >
                {updateTicket.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

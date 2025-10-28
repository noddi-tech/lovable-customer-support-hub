import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, X, Calendar } from 'lucide-react';
import { useCreateServiceTicket } from '@/hooks/useServiceTickets';
import { NoddiBookingSelector } from './NoddiBookingSelector';
import { CustomerSearch } from './CustomerSearch';
import { useNoddiBookings, type NoddiBooking } from '@/hooks/useNoddiBookings';
import type { ServiceTicketPriority, ServiceTicketCategory, ServiceType } from '@/types/service-tickets';
import { supabase } from '@/integrations/supabase/client';

interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (ticketId: string) => void;
  
  // Pre-filled data
  customerId?: string;
  customerEmail?: string;
  customerPhone?: string;
  conversationId?: string;
  callId?: string;
  prefillData?: {
    title?: string;
    description?: string;
    noddiBookingId?: number;
    category?: ServiceTicketCategory;
  };
}

export const CreateTicketDialog = ({
  open,
  onOpenChange,
  onSuccess,
  customerId: initialCustomerId,
  customerEmail: initialCustomerEmail,
  customerPhone: initialCustomerPhone,
  conversationId,
  callId,
  prefillData,
}: CreateTicketDialogProps) => {
  const createTicket = useCreateServiceTicket();
  
  // Customer state
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [organizationId, setOrganizationId] = useState<string>('');
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<ServiceTicketPriority>('normal');
  const [category, setCategory] = useState<ServiceTicketCategory | undefined>();
  const [serviceType, setServiceType] = useState<ServiceType | undefined>();
  const [selectedBookingId, setSelectedBookingId] = useState<number | undefined>();
  const [selectedBooking, setSelectedBooking] = useState<NoddiBooking | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Get current customer ID (from prop or selected customer)
  const customerId = selectedCustomer?.id || initialCustomerId;
  const customerEmail = selectedCustomer?.email || initialCustomerEmail;
  const customerPhone = selectedCustomer?.phone || initialCustomerPhone;

  // Noddi integration
  const { data: noddiBookings, isLoading: noddiLoading } = useNoddiBookings({
    email: customerEmail,
    phone: customerPhone,
    enabled: !!(customerEmail || customerPhone),
  });

  // Get organization ID and fetch initial customer
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

  // Fetch and set initial customer if customerId is provided
  useEffect(() => {
    const fetchInitialCustomer = async () => {
      if (initialCustomerId) {
        console.log('Fetching initial customer:', initialCustomerId);
        const { data: customer, error } = await supabase
          .from('customers')
          .select('*')
          .eq('id', initialCustomerId)
          .single();
        
        if (customer && !error) {
          console.log('Initial customer loaded:', customer);
          setSelectedCustomer(customer);
        } else {
          console.error('Failed to fetch initial customer:', error);
          // Fallback: create temporary customer object from props
          if (initialCustomerEmail || initialCustomerPhone) {
            console.log('Using fallback customer data from props');
            setSelectedCustomer({
              id: initialCustomerId,
              email: initialCustomerEmail,
              phone: initialCustomerPhone,
              full_name: initialCustomerEmail || initialCustomerPhone || 'Unknown Customer',
            });
          }
        }
      }
    };
    
    if (open) {
      fetchInitialCustomer();
    }
  }, [initialCustomerId, initialCustomerEmail, initialCustomerPhone, open]);

  // Pre-fill form data
  useEffect(() => {
    if (prefillData) {
      if (prefillData.title) setTitle(prefillData.title);
      if (prefillData.description) setDescription(prefillData.description);
      if (prefillData.noddiBookingId) setSelectedBookingId(prefillData.noddiBookingId);
      if (prefillData.category) setCategory(prefillData.category);
    }
  }, [prefillData]);

  // Auto-select booking if only one priority booking exists
  useEffect(() => {
    if (noddiBookings && noddiBookings.length > 0 && !selectedBookingId) {
      // Find priority bookings
      const priorityBooking = noddiBookings.find(b => 
        b.status === 'Upcoming' || b.booking_type?.includes('Priority')
      );
      if (priorityBooking) {
        setSelectedBookingId(priorityBooking.id);
        setSelectedBooking(priorityBooking);
      }
    }
  }, [noddiBookings, selectedBookingId]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSelectBooking = (booking: NoddiBooking | null) => {
    setSelectedBooking(booking);
    setSelectedBookingId(booking?.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Extract Noddi customer info from selected customer
      let noddiUserId: number | undefined;
      let customerName: string | undefined;
      let customerEmail: string | undefined;
      let customerPhone: string | undefined;
      
      console.log('Submitting ticket with customer:', selectedCustomer);
      
      if (selectedCustomer) {
        // Handle "noddi-7703" temporary IDs
        if (customerId && customerId.startsWith('noddi-')) {
          noddiUserId = parseInt(customerId.replace('noddi-', ''));
        } else {
          // For existing customers, get noddi_user_id from metadata
          noddiUserId = selectedCustomer.metadata?.noddi_user_id;
        }
        
        customerName = selectedCustomer.full_name;
        customerEmail = selectedCustomer.email || selectedCustomer.metadata?.noddi_email;
        customerPhone = selectedCustomer.phone;
      } else if (initialCustomerId || initialCustomerEmail || initialCustomerPhone) {
        // Fallback to props if selectedCustomer is not set
        console.log('Using initial props for customer data');
        customerEmail = initialCustomerEmail;
        customerPhone = initialCustomerPhone;
        customerName = initialCustomerEmail || initialCustomerPhone || 'Unknown Customer';
      }
      
      console.log('Customer data for ticket:', { noddiUserId, customerName, customerEmail, customerPhone });

      const ticket = await createTicket.mutateAsync({
        title,
        description,
        noddiUserId,
        customerName,
        customerEmail,
        customerPhone,
        priority,
        category,
        conversationId,
        callId,
        noddiBookingId: selectedBookingId,
        noddiUserGroupId: selectedCustomer?.metadata?.user_group_id,
        noddiBookingType: selectedBooking?.booking_type,
        serviceType,
        tags: tags.length > 0 ? tags : undefined,
      });

      onSuccess?.(ticket.id);
      onOpenChange(false);
      
      // Reset form
      setTitle('');
      setDescription('');
      setPriority('normal');
      setCategory(undefined);
      setServiceType(undefined);
      setSelectedBookingId(undefined);
      setTags([]);
    } catch (error) {
      console.error('Failed to create ticket:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Service Ticket</DialogTitle>
          <DialogDescription>
            Create a new service ticket to track and resolve customer issues
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Search */}
          {!initialCustomerId && organizationId && (
            <CustomerSearch
              selectedCustomer={selectedCustomer}
              onSelectCustomer={setSelectedCustomer}
              organizationId={organizationId}
            />
          )}

          {/* Pre-filled Customer Info */}
          {initialCustomerId && (customerEmail || customerPhone) && (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Customer Information</p>
                  {customerEmail && (
                    <p className="text-sm text-muted-foreground">Email: {customerEmail}</p>
                  )}
                  {customerPhone && (
                    <p className="text-sm text-muted-foreground">Phone: {customerPhone}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the issue"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the issue, steps taken, and expected resolution"
              rows={4}
              required
            />
          </div>

          {/* Priority and Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as ServiceTicketPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ServiceTicketCategory)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tire_issue">Tire Issue</SelectItem>
                  <SelectItem value="service_complaint">Service Complaint</SelectItem>
                  <SelectItem value="delivery_issue">Delivery Issue</SelectItem>
                  <SelectItem value="installation_problem">Installation Problem</SelectItem>
                  <SelectItem value="warranty_claim">Warranty Claim</SelectItem>
                  <SelectItem value="technical_support">Technical Support</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Service Type */}
          <div className="space-y-2">
            <Label htmlFor="serviceType">Service Type</Label>
            <Select value={serviceType} onValueChange={(v) => setServiceType(v as ServiceType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select service type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="on_site_visit">On-Site Visit</SelectItem>
                <SelectItem value="workshop_appointment">Workshop Appointment</SelectItem>
                <SelectItem value="remote_support">Remote Support</SelectItem>
                <SelectItem value="callback">Callback</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Noddi Booking Selector */}
          {(customerEmail || customerPhone) && noddiBookings && noddiBookings.length > 0 && (
            <div className="space-y-2">
              <Label>Link to Noddi Booking (Optional)</Label>
              <NoddiBookingSelector
                email={customerEmail}
                phone={customerPhone}
                selectedBookingId={selectedBookingId}
                onSelectBooking={handleSelectBooking}
              />
            </div>
          )}

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                placeholder="Add tags (press Enter)"
              />
              <Button type="button" variant="outline" onClick={handleAddTag}>
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTicket.isPending || !title || !description}>
              {createTicket.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Ticket
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

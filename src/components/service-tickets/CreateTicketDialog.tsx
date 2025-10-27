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
import { useNoddihKundeData } from '@/hooks/useNoddihKundeData';
import { NoddiCustomerDetails } from '@/components/dashboard/voice/NoddiCustomerDetails';
import type { ServiceTicketPriority, ServiceTicketCategory, ServiceType } from '@/types/service-tickets';

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
  customerId,
  customerEmail,
  customerPhone,
  conversationId,
  callId,
  prefillData,
}: CreateTicketDialogProps) => {
  const createTicket = useCreateServiceTicket();
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<ServiceTicketPriority>('normal');
  const [category, setCategory] = useState<ServiceTicketCategory | undefined>();
  const [serviceType, setServiceType] = useState<ServiceType | undefined>();
  const [selectedBookingId, setSelectedBookingId] = useState<number | undefined>();
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // TODO: Re-enable after Supabase types regeneration
  const noddiData = null;
  const noddiLoading = false;

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
    if (noddiData?.data?.priority_booking && !selectedBookingId) {
      setSelectedBookingId(noddiData.data.priority_booking.id);
    }
  }, [noddiData, selectedBookingId]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // TODO: Re-enable after types regeneration
    const selectedBooking = undefined;

    try {
      const ticket = await createTicket.mutateAsync({
        title,
        description,
        customerId,
        priority,
        category,
        conversationId,
        callId,
        noddiBookingId: selectedBookingId,
        noddiUserGroupId: noddiData?.data?.user_group_id,
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
          {/* Noddi Customer Details */}
          {(customerEmail || customerPhone) && (
            <Card>
              <CardContent className="p-4">
                {noddiLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="ml-2 text-sm text-muted-foreground">
                      Loading customer data...
                    </span>
                  </div>
                ) : noddiData?.data ? (
                  <NoddiCustomerDetails
                    customerId={customerId}
                    noddiData={noddiData.data}
                    compact
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">No booking data available</p>
                )}
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
                  <SelectItem value="follow_up">Follow Up</SelectItem>
                  <SelectItem value="warranty">Warranty</SelectItem>
                  <SelectItem value="safety_concern">Safety Concern</SelectItem>
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

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ServiceTicketStatusBadge } from './ServiceTicketStatusBadge';
import { TicketCommentsList } from './TicketCommentsList';
import { TicketActivityTimeline } from './TicketActivityTimeline';
import { TicketAssignment } from './TicketAssignment';
import { TicketAttachmentUpload } from './TicketAttachmentUpload';
import { TicketCustomFields } from './TicketCustomFields';
import { TicketCustomerInfo } from './TicketCustomerInfo';
import { NoddiCustomerDetails } from '@/components/dashboard/voice/NoddiCustomerDetails';
import { LinkCustomerDialog } from './LinkCustomerDialog';
import { Clock, User, MessageSquare, Paperclip, Calendar, ExternalLink, Loader2, Activity, Edit } from 'lucide-react';
import { useUpdateTicketStatus } from '@/hooks/useServiceTickets';
import { formatDistanceToNow } from 'date-fns';
import type { ServiceTicket, ServiceTicketStatus } from '@/types/service-tickets';

interface ServiceTicketDetailsDialogProps {
  ticketId?: string;
  ticket?: ServiceTicket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ServiceTicketDetailsDialog = ({
  ticketId,
  ticket: passedTicket,
  open,
  onOpenChange,
}: ServiceTicketDetailsDialogProps) => {
  const [comment, setComment] = useState('');
  const [linkCustomerOpen, setLinkCustomerOpen] = useState(false);
  const updateStatus = useUpdateTicketStatus();
  const queryClient = useQueryClient();

  // Fetch ticket if only ID is provided
  const { data: fetchedTicket, isLoading } = useQuery({
    queryKey: ['service-ticket', ticketId],
    queryFn: async () => {
      if (!ticketId) return null;
      
      const { data, error } = await supabase
        .from('service_tickets')
        .select(`
          *,
          assigned_to:profiles!assigned_to_id(user_id, full_name, avatar_url),
          created_by:profiles!created_by_id(user_id, full_name, avatar_url)
        `)
        .eq('id', ticketId)
        .single();

      if (error) throw error;
      return data as unknown as ServiceTicket;
    },
    enabled: !!ticketId && !passedTicket,
  });

  const ticket = passedTicket || fetchedTicket;

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!ticket) return null;

  const handleStatusChange = async (newStatus: ServiceTicketStatus) => {
    await updateStatus.mutateAsync({
      ticketId: ticket.id,
      newStatus,
      comment: comment || undefined,
    });
    setComment('');
  };

  const statusActions: { status: ServiceTicketStatus; label: string; variant?: 'default' | 'outline' | 'secondary' }[] = [
    { status: 'in_progress', label: 'Start Work', variant: 'default' },
    { status: 'scheduled', label: 'Schedule', variant: 'outline' },
    { status: 'pending_customer', label: 'Wait for Customer', variant: 'outline' },
    { status: 'on_hold', label: 'Put On Hold', variant: 'outline' },
    { status: 'completed', label: 'Mark Complete', variant: 'default' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-xl">{ticket.title}</DialogTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-mono">{ticket.ticket_number}</span>
                <span>•</span>
                <span>Created {formatDistanceToNow(new Date(ticket.created_at))} ago</span>
                {ticket.created_by && (
                  <>
                    <span>•</span>
                    <span>by {ticket.created_by.full_name}</span>
                  </>
                )}
              </div>
            </div>
            <ServiceTicketStatusBadge status={ticket.status} />
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="comments">
              <MessageSquare className="h-4 w-4 mr-2" />
              Comments
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Activity className="h-4 w-4 mr-2" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="attachments">
              <Paperclip className="h-4 w-4 mr-2" />
              Attachments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
              </CardContent>
            </Card>

            {/* Compact Metadata */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {/* Assignment Row */}
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground min-w-[80px]">Assigned to:</span>
                    <TicketAssignment
                      ticketId={ticket.id}
                      currentAssigneeId={ticket.assigned_to_id}
                      currentAssigneeName={ticket.assigned_to?.full_name}
                    />
                  </div>

                  {/* Priority & Category Row */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Priority:</span>
                      <Badge variant={ticket.priority === 'urgent' ? 'destructive' : 'secondary'}>
                        {ticket.priority}
                      </Badge>
                    </div>
                    
                    {ticket.category && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Category:</span>
                        <Badge variant="outline">
                          {ticket.category}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Tags Row */}
                  {ticket.tags && ticket.tags.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground min-w-[80px]">Tags:</span>
                      <div className="flex flex-wrap gap-1">
                        {ticket.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Service Details */}
            {(ticket.service_type || ticket.scheduled_date) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Service Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {ticket.service_type && (
                    <p>
                      <span className="text-muted-foreground">Type:</span> {ticket.service_type}
                    </p>
                  )}
                  {ticket.scheduled_date && (
                    <p>
                      <span className="text-muted-foreground">Scheduled:</span>{' '}
                      {new Date(ticket.scheduled_date).toLocaleString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Customer Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Customer Information
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLinkCustomerOpen(true)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    {ticket.customer_name ? 'Edit' : 'Link Customer'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!ticket.customer_name && !ticket.customer_email && !ticket.customer_phone ? (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>No customer linked</span>
                  </div>
                ) : (
                  <NoddiCustomerDetails
                    customerEmail={ticket.customer_email}
                    customerPhone={ticket.customer_phone}
                    customerName={ticket.customer_name}
                  />
                )}
              </CardContent>
            </Card>

            {/* Noddi Booking */}
            {ticket.noddi_booking_id && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Linked Booking
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLinkCustomerOpen(true)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Change
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Noddi Booking #{ticket.noddi_booking_id}</p>
                      {ticket.noddi_booking_type && (
                        <p className="text-muted-foreground text-xs">
                          Type: {ticket.noddi_booking_type}
                        </p>
                      )}
                      {ticket.noddi_user_group_id && (
                        <p className="text-muted-foreground text-xs">
                          User Group: {ticket.noddi_user_group_id}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.open(`https://noddi.no/admin/bookings/${ticket.noddi_booking_id}`, '_blank');
                      }}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Linked Resources */}
            {(ticket.conversation_id || ticket.call_id) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Linked Resources
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {ticket.conversation_id && (
                    <p className="flex items-center gap-2">
                      <MessageSquare className="h-3 w-3" />
                      Linked to conversation
                    </p>
                  )}
                  {ticket.call_id && (
                    <p className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      Linked to call
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Textarea
                    placeholder="Add a comment (optional)..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={2}
                  />
                  <div className="flex flex-wrap gap-2">
                    {statusActions
                      .filter((action) => action.status !== ticket.status)
                      .map((action) => (
                        <Button
                          key={action.status}
                          variant={action.variant || 'outline'}
                          size="sm"
                          onClick={() => handleStatusChange(action.status)}
                          disabled={updateStatus.isPending}
                        >
                          {action.label}
                        </Button>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comments" className="mt-4">
            <TicketCommentsList ticketId={ticket.id} />
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <TicketActivityTimeline ticketId={ticket.id} />
          </TabsContent>

          <TabsContent value="attachments" className="mt-4">
            <TicketAttachmentUpload ticketId={ticket.id} />
          </TabsContent>
        </Tabs>

        {/* Custom Fields Section */}
        <div className="mt-6">
          <TicketCustomFields ticketId={ticket.id} customFields={ticket.custom_fields} />
        </div>
      </DialogContent>

      {/* Link Customer Dialog */}
      <LinkCustomerDialog
        ticketId={ticket.id}
        currentCustomer={{
          name: ticket.customer_name,
          email: ticket.customer_email,
          phone: ticket.customer_phone,
          noddiUserId: ticket.noddi_user_id,
        }}
        currentBookingId={ticket.noddi_booking_id}
        open={linkCustomerOpen}
        onOpenChange={setLinkCustomerOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['service-ticket', ticket.id] });
          queryClient.invalidateQueries({ queryKey: ['service-tickets'] });
        }}
      />
    </Dialog>
  );
}

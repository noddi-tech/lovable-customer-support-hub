import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Plus, Mail, User, MessageSquare } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface NewConversationDialogProps {
  children: React.ReactNode;
}

interface InboxData {
  id: string;
  name: string;
  color: string;
  is_default: boolean;
}

export const NewConversationDialog: React.FC<NewConversationDialogProps> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [subject, setSubject] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const [selectedInboxId, setSelectedInboxId] = useState('');
  const [priority, setPriority] = useState('normal');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  // Fetch inboxes
  const { data: inboxes = [] } = useQuery({
    queryKey: ['inboxes'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_inboxes');
      if (error) throw error;
      return data as InboxData[];
    }
  });

  // Set default inbox when inboxes load
  React.useEffect(() => {
    if (inboxes.length > 0 && !selectedInboxId) {
      const defaultInbox = inboxes.find(inbox => inbox.is_default) || inboxes[0];
      setSelectedInboxId(defaultInbox.id);
    }
  }, [inboxes, selectedInboxId]);

  const createConversationMutation = useMutation({
    mutationFn: async (conversationData: {
      customerEmail: string;
      customerName: string;
      subject: string;
      initialMessage: string;
      inboxId: string;
      priority: string;
    }) => {
      // First, check if customer exists or create one
      let customerId: string;
      
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', conversationData.customerEmail)
        .maybeSingle();

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        // Create new customer
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            email: conversationData.customerEmail,
            full_name: conversationData.customerName,
            organization_id: profile?.organization_id
          })
          .select('id')
          .single();

        if (customerError) throw customerError;
        customerId = newCustomer.id;
      }

      // Create conversation
      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({
          subject: conversationData.subject,
          customer_id: customerId,
          inbox_id: conversationData.inboxId,
          priority: conversationData.priority,
          status: 'open',
          channel: 'email',
          organization_id: profile?.organization_id,
          assigned_to_id: profile?.user_id
        })
        .select('id')
        .single();

      if (conversationError) throw conversationError;

      // Create initial message if provided
      if (conversationData.initialMessage.trim()) {
        const { error: messageError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversation.id,
            content: conversationData.initialMessage,
            sender_type: 'agent',
            sender_id: profile?.user_id,
            is_internal: false,
            email_status: 'pending',
            email_subject: conversationData.subject
          });

        if (messageError) throw messageError;
      }

      return conversation;
    },
    onSuccess: (conversation) => {
      toast.success('Conversation created successfully');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation-counts'] });
      setOpen(false);
      resetForm();
      navigate(`/?conversation=${conversation.id}`);
    },
    onError: (error) => {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create conversation');
    }
  });

  const resetForm = () => {
    setCustomerEmail('');
    setCustomerName('');
    setSubject('');
    setInitialMessage('');
    setPriority('normal');
    if (inboxes.length > 0) {
      const defaultInbox = inboxes.find(inbox => inbox.is_default) || inboxes[0];
      setSelectedInboxId(defaultInbox.id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerEmail.trim() || !subject.trim()) {
      toast.error('Customer email and subject are required');
      return;
    }

    if (!selectedInboxId) {
      toast.error('Please select an inbox');
      return;
    }

    createConversationMutation.mutate({
      customerEmail: customerEmail.trim(),
      customerName: customerName.trim() || customerEmail.split('@')[0],
      subject: subject.trim(),
      initialMessage: initialMessage.trim(),
      inboxId: selectedInboxId,
      priority
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>New Conversation</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-base">
                <User className="h-4 w-4" />
                <span>Customer Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer-email">Email Address *</Label>
                  <Input
                    id="customer-email"
                    type="email"
                    placeholder="customer@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-name">Full Name</Label>
                  <Input
                    id="customer-name"
                    placeholder="Customer Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conversation Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-base">
                <Mail className="h-4 w-4" />
                <span>Conversation Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  placeholder="Email subject line"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="inbox">Inbox</Label>
                  <Select value={selectedInboxId} onValueChange={setSelectedInboxId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select inbox" />
                    </SelectTrigger>
                    <SelectContent>
                      {inboxes.map((inbox) => (
                        <SelectItem key={inbox.id} value={inbox.id}>
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: inbox.color }}
                            />
                            <span>{inbox.name}</span>
                            {inbox.is_default && <span className="text-xs text-muted-foreground">(default)</span>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="initial-message">Initial Message (Optional)</Label>
                <Textarea
                  id="initial-message"
                  placeholder="Type your initial message to the customer..."
                  value={initialMessage}
                  onChange={(e) => setInitialMessage(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  This message will be sent to the customer immediately after creating the conversation.
                </p>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={createConversationMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={createConversationMutation.isPending}
            >
              {createConversationMutation.isPending ? 'Creating...' : 'Create Conversation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
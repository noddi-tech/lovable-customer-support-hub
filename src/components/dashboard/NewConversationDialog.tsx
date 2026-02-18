import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Plus, Mail, User, MessageSquare, Sparkles, Languages, Loader2, FileText } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { NoddiCustomerSearch } from '@/components/shared/NoddiCustomerSearch';
import { TemplateSelector } from './conversation-view/TemplateSelector';
import { AiSuggestionDialog } from './conversation-view/AiSuggestionDialog';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface NewConversationDialogProps {
  children: React.ReactNode;
}

interface InboxData {
  id: string;
  name: string;
  color: string;
  is_default: boolean;
}

interface Customer {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  metadata?: {
    noddi_user_id?: string;
    user_group_id?: string;
    is_new?: boolean;
    noddi_email?: string;
    badge?: string;
    has_priority?: boolean;
    unpaid_count?: number;
  };
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
  const { t } = useTranslation();
  const sendingTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // AI and Translation features
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState('no');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  
  // Noddi customer search
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

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

      // Get the email account associated with the selected inbox
      let emailAccountId: string | null = null;
      let canSendEmail = false;
      
      try {
        const { data: emailAccounts, error: emailError } = await supabase
          .from('email_accounts')
          .select('id')
          .eq('inbox_id', conversationData.inboxId)
          .limit(1);

        if (!emailError && emailAccounts && emailAccounts.length > 0) {
          emailAccountId = emailAccounts[0].id;
          canSendEmail = true;
        } else {
          // Fallback: check inbound_routes for a group_email (used by send-reply-email)
          const { data: inboundRoutes } = await supabase
            .from('inbound_routes')
            .select('id, group_email')
            .eq('inbox_id', conversationData.inboxId)
            .eq('is_active', true)
            .limit(1);
          if (inboundRoutes?.length && inboundRoutes[0].group_email) {
            canSendEmail = true;
            console.log('Using inbound route for email sending:', inboundRoutes[0].group_email);
          } else {
            console.warn('No email account or inbound route found for inbox:', conversationData.inboxId);
          }
        }
      } catch (error) {
        console.warn('Error fetching email account for inbox:', error);
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
          email_account_id: emailAccountId
        })
        .select('id')
        .single();

      if (conversationError) throw conversationError;

      // Create initial message if provided
      if (conversationData.initialMessage.trim()) {
        const { data: newMessage, error: messageError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversation.id,
            content: conversationData.initialMessage,
            sender_type: 'agent',
            sender_id: profile?.user_id,
            content_type: 'text',
            is_internal: false,
            email_status: 'pending',
            email_subject: conversationData.subject
          })
          .select('id')
          .single();

        if (messageError) throw messageError;

        // Send the email if we have an email account connected
        if (canSendEmail && newMessage) {
          try {
            console.log('Attempting to send email for new conversation message:', newMessage.id);
            
            // Set up timeout for 15 seconds
            const timeoutId = setTimeout(async () => {
              await supabase
                .from('messages')
                .update({ email_status: 'failed' })
                .eq('id', newMessage.id);
              
              sendingTimeouts.current.delete(newMessage.id);
              toast.error('Email sending timed out after 15 seconds');
            }, 15000);

            sendingTimeouts.current.set(newMessage.id, timeoutId);
            
            const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-reply-email', {
              body: { messageId: newMessage.id }
            });

            // Clear timeout on completion
            const timeout = sendingTimeouts.current.get(newMessage.id);
            if (timeout) {
              clearTimeout(timeout);
              sendingTimeouts.current.delete(newMessage.id);
            }

            if (emailError) {
              console.error('Error sending email:', emailError);
              // Update message status to failed
              await supabase
                .from('messages')
                .update({ email_status: 'failed' })
                .eq('id', newMessage.id);
              toast.error('Email failed to send: SendGrid credits exceeded. Please increase credits in SendGrid and try again.');
            } else {
              console.log('Email sent successfully:', emailResult);
              toast.success('Email sent successfully');
            }
          } catch (error) {
            console.error('Failed to send email for new conversation:', error);
            
            // Clear timeout on error
            const timeout = sendingTimeouts.current.get(newMessage.id);
            if (timeout) {
              clearTimeout(timeout);
              sendingTimeouts.current.delete(newMessage.id);
            }
            
            // Update message status to failed
            await supabase
              .from('messages')
              .update({ email_status: 'failed' })
              .eq('id', newMessage.id);
            toast.error('Failed to send email: SendGrid credits exceeded. Please increase credits in SendGrid and try again.');
          }
        } else {
          console.warn('No email account connected to inbox, email not sent');
        }
      }

      return conversation;
    },
    onSuccess: (conversation) => {
      toast.success('Conversation created successfully');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation-counts'] });
      
      // Clean up any timeouts before closing
      sendingTimeouts.current.forEach((timeout) => clearTimeout(timeout));
      sendingTimeouts.current.clear();
      
      setOpen(false);
      resetForm();
      // Preserve current inbox context
      const currentParams = new URLSearchParams(window.location.search);
      const currentInbox = currentParams.get('inbox') || selectedInboxId;
      const basePath = window.location.pathname.includes('/interactions')
        ? window.location.pathname
        : '/interactions/text/open';
      navigate(`${basePath}?inbox=${currentInbox}&c=${conversation.id}`);
    },
    onError: (error) => {
      console.error('Error creating conversation:', error);
      
      // Clean up any timeouts on error
      sendingTimeouts.current.forEach((timeout) => clearTimeout(timeout));
      sendingTimeouts.current.clear();
      
      toast.error('Failed to create conversation');
    }
  });

  const resetForm = () => {
    setCustomerEmail('');
    setCustomerName('');
    setSubject('');
    setInitialMessage('');
    setPriority('normal');
    setSelectedCustomer(null);
    setAiSuggestions([]);
    setSelectedSuggestion(null);
    setShowAiDialog(false);
    
    // Clean up any timeouts
    sendingTimeouts.current.forEach((timeout) => clearTimeout(timeout));
    sendingTimeouts.current.clear();
    
    if (inboxes.length > 0) {
      const defaultInbox = inboxes.find(inbox => inbox.is_default) || inboxes[0];
      setSelectedInboxId(defaultInbox.id);
    }
  };

  // AI Suggestions handler
  const handleGetAiSuggestions = async () => {
    if (!subject.trim()) {
      toast.error('Please enter a subject first');
      return;
    }

    setIsLoadingAi(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-email-reply', {
        body: {
          customerMessage: subject,
          conversationContext: `Creating new conversation about: ${subject}`,
        },
      });

      if (error) throw error;

      if (data?.suggestions) {
        setAiSuggestions(data.suggestions);
        toast.success('AI suggestions generated');
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      toast.error('Failed to get AI suggestions');
    } finally {
      setIsLoadingAi(false);
    }
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: string) => {
    setSelectedSuggestion(suggestion);
    setShowAiDialog(true);
  };

  // Use suggestion as-is
  const handleUseAsIs = () => {
    if (selectedSuggestion) {
      setInitialMessage(selectedSuggestion);
      setShowAiDialog(false);
      toast.success('Suggestion inserted');
    }
  };

  // Refine suggestion
  const handleRefine = async (instructions: string) => {
    if (!selectedSuggestion) return;

    setIsRefining(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-email-reply', {
        body: {
          customerMessage: subject,
          conversationContext: `Refine this message: ${selectedSuggestion}`,
          refinementInstructions: instructions,
        },
      });

      if (error) throw error;

      if (data?.refinedText) {
        setSelectedSuggestion(data.refinedText);
        toast.success('Suggestion refined');
      }
    } catch (error) {
      console.error('Error refining suggestion:', error);
      toast.error('Failed to refine suggestion');
    } finally {
      setIsRefining(false);
    }
  };

  // Translation handler
  const handleTranslate = async () => {
    if (!initialMessage.trim()) {
      toast.error('Please enter a message first');
      return;
    }

    setIsTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke('translate-text', {
        body: {
          text: initialMessage,
          sourceLanguage,
          targetLanguage,
        },
      });

      if (error) throw error;

      if (data?.translatedText) {
        setInitialMessage(data.translatedText);
        toast.success('Message translated');
      }
    } catch (error) {
      console.error('Error translating text:', error);
      toast.error('Failed to translate text');
    } finally {
      setIsTranslating(false);
    }
  };

  // Template selection handler
  const handleTemplateSelect = (content: string) => {
    setInitialMessage(content);
    toast.success('Template inserted');
  };

  // Customer selection handler
  const handleCustomerSelect = (customer: Customer | null) => {
    setSelectedCustomer(customer);
    if (customer) {
      setCustomerEmail(customer.email || customer.metadata?.noddi_email || '');
      setCustomerName(customer.full_name);
    }
  };

  // Available languages for translation
  const languages = [
    { code: 'auto', name: 'Auto Detect' },
    { code: 'en', name: 'English' },
    { code: 'no', name: 'Norwegian' },
    { code: 'sv', name: 'Swedish' },
    { code: 'da', name: 'Danish' },
    { code: 'de', name: 'German' },
    { code: 'fr', name: 'French' },
    { code: 'es', name: 'Spanish' },
  ];

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
            <span>{t('conversation.newConversation')}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-base">
                <User className="h-4 w-4" />
                <span>{t('conversation.customerInformation')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer-email">{t('conversation.emailAddress')} *</Label>
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
                  <Label htmlFor="customer-name">{t('conversation.customerName')}</Label>
                  <Input
                    id="customer-name"
                    placeholder={t('conversation.customerName')}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Noddi Customer Search */}
          {profile?.organization_id && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-base">
                  <User className="h-4 w-4" />
                  <span>Search Customer in Noddi</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <NoddiCustomerSearch
                  selectedCustomer={selectedCustomer}
                  onSelectCustomer={handleCustomerSelect}
                  organizationId={profile.organization_id}
                  showEmailSearch={false}
                />
              </CardContent>
            </Card>
          )}

          {/* Conversation Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-base">
                <Mail className="h-4 w-4" />
                <span>{t('conversation.conversationDetails')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">{t('conversation.subject')} *</Label>
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
                  <Label htmlFor="inbox">{t('conversation.inbox')}</Label>
                  <Select value={selectedInboxId} onValueChange={setSelectedInboxId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('conversation.selectInbox')} />
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
                  <Label htmlFor="priority">{t('conversation.priority')}</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t('conversation.low')}</SelectItem>
                      <SelectItem value="normal">{t('conversation.normal')}</SelectItem>
                      <SelectItem value="high">{t('conversation.high')}</SelectItem>
                      <SelectItem value="urgent">{t('conversation.urgent')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="initial-message">{t('conversation.initialMessage')}</Label>
                  
                  {/* Editor Toolbar */}
                  <div className="flex items-center gap-1">
                    {/* AI Suggestions */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleGetAiSuggestions}
                          disabled={isLoadingAi || !subject.trim()}
                          title="Get AI suggestions"
                        >
                          {isLoadingAi ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                        </Button>
                      </PopoverTrigger>
                      {aiSuggestions.length > 0 && (
                        <PopoverContent className="w-96 max-h-96 overflow-y-auto">
                          <div className="space-y-2">
                            <p className="text-sm font-medium">AI Suggestions</p>
                            {aiSuggestions.map((suggestion, index) => (
                              <Card
                                key={index}
                                className="p-3 cursor-pointer hover:bg-accent transition-colors"
                                onClick={() => handleSelectSuggestion(suggestion)}
                              >
                                <p className="text-sm line-clamp-3">{suggestion}</p>
                              </Card>
                            ))}
                          </div>
                        </PopoverContent>
                      )}
                    </Popover>

                    {/* Translation */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={!initialMessage.trim()}
                          title="Translate message"
                        >
                          <Languages className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-3">
                          <p className="text-sm font-medium">Translate Message</p>
                          <div className="space-y-2">
                            <Label>From</Label>
                            <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {languages.map((lang) => (
                                  <SelectItem key={lang.code} value={lang.code}>
                                    {lang.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>To</Label>
                            <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {languages.filter(l => l.code !== 'auto').map((lang) => (
                                  <SelectItem key={lang.code} value={lang.code}>
                                    {lang.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            type="button"
                            onClick={handleTranslate}
                            disabled={isTranslating}
                            className="w-full"
                          >
                            {isTranslating ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Translating...
                              </>
                            ) : (
                              'Translate'
                            )}
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>

                    {/* Templates */}
                    <TemplateSelector
                      onSelectTemplate={handleTemplateSelect}
                      isMobile={false}
                    />
                  </div>
                </div>

                <Textarea
                  id="initial-message"
                  placeholder={t('conversation.initialMessagePlaceholder')}
                  value={initialMessage}
                  onChange={(e) => setInitialMessage(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {t('conversation.initialMessageNote')}
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
              {t('conversation.cancel')}
            </Button>
            <Button 
              type="submit"
              disabled={createConversationMutation.isPending}
            >
              {createConversationMutation.isPending ? t('conversation.creating') : t('conversation.createConversation')}
            </Button>
          </div>
        </form>

        {/* AI Suggestion Dialog */}
        <AiSuggestionDialog
          open={showAiDialog}
          onOpenChange={setShowAiDialog}
          suggestion={selectedSuggestion || ''}
          onUseAsIs={handleUseAsIs}
          onRefine={handleRefine}
          isRefining={isRefining}
        />
      </DialogContent>
    </Dialog>
  );
};
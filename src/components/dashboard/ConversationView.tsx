import React, { useState, useRef } from 'react';
import { useAutoContrast } from '@/hooks/useAutoContrast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { 
  MoreHorizontal, 
  Archive, 
  Clock, 
  UserPlus, 
  Star,
  Paperclip,
  Send,
  Smile,
  Bold,
  Italic,
  Link2,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface ConversationViewProps {
  conversationId?: string | null;
}

export const ConversationView: React.FC<ConversationViewProps> = ({ conversationId }) => {
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const sendingTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const queryClient = useQueryClient();
  const { getMessageTextColor, autoContrastEnabled } = useAutoContrast();

  // Debug logging
  React.useEffect(() => {
    console.log('Auto contrast enabled:', autoContrastEnabled);
    console.log('Agent text color:', getMessageTextColor('agent'));
    console.log('Customer text color:', getMessageTextColor('customer'));
    console.log('Internal text color:', getMessageTextColor('internal'));
  }, [autoContrastEnabled, getMessageTextColor]);

  const handleSendMessage = async () => {
    if (!replyText.trim()) return;
    
    setIsSending(true);
    
    try {
      // First, save the message to the database with 'sending' status
      const { data: newMessage, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content: replyText.trim(),
          is_internal: isInternalNote,
          sender_type: 'agent',
          content_type: 'text',
          email_status: isInternalNote ? 'sent' : 'sending'  // Internal notes don't need email sending
        })
        .select()
        .single();

      if (error) throw error;

      // Reset form and refresh data immediately to show the message
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });

      // If it's not an internal note, send the actual email
      if (!isInternalNote && newMessage) {
        console.log('Calling email sending function for message:', newMessage.id);
        
        // Set up 15-second timeout
        console.log('Setting up 15-second timeout for message:', newMessage.id);
        const timeoutId = setTimeout(async () => {
          console.log('⏰ 15-second timeout triggered for message:', newMessage.id);
          
          // Check if timeout is still tracked (not cleared)
          const isStillTracked = sendingTimeouts.current.has(newMessage.id);
          console.log('Timeout still tracked:', isStillTracked);
          
          if (isStillTracked) {
            // Update message status to failed
            const { error: timeoutUpdateError } = await supabase
              .from('messages')
              .update({ email_status: 'failed' })
              .eq('id', newMessage.id);
            
            if (timeoutUpdateError) {
              console.error('Error updating message status on timeout:', timeoutUpdateError);
            } else {
              console.log('✅ Message status updated to failed due to timeout');
            }
            
            // Remove timeout from tracking
            sendingTimeouts.current.delete(newMessage.id);
            console.log('Removed timeout from tracking. Remaining timeouts:', sendingTimeouts.current.size);
            
            queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
            toast.error('Email sending timed out after 15 seconds');
          } else {
            console.log('Timeout was already cleared, skipping update');
          }
        }, 15000);
        
        // Track the timeout
        sendingTimeouts.current.set(newMessage.id, timeoutId);
        console.log('Added timeout to tracking. Total timeouts:', sendingTimeouts.current.size);
        
        try {
          const { data: emailData, error: emailError } = await supabase.functions.invoke('send-reply-email', {
            body: { messageId: newMessage.id },
          });

          console.log('Email function response:', { data: emailData, error: emailError });

          // Clear timeout on any response
          const timeoutToCancel = sendingTimeouts.current.get(newMessage.id);
          if (timeoutToCancel) {
            console.log('Clearing timeout for successful email send:', newMessage.id);
            clearTimeout(timeoutToCancel);
            sendingTimeouts.current.delete(newMessage.id);
          }

          if (emailError) {
            console.error('Error sending email:', emailError);
            
            // Update message status to failed
            await supabase
              .from('messages')
              .update({ email_status: 'failed' })
              .eq('id', newMessage.id);
            
            toast.error(`Email failed to send: ${emailError.message}`);
          } else if (emailData?.error) {
            console.error('Email function returned error:', emailData.error);
            
            // Update message status to failed
            await supabase
              .from('messages')
              .update({ email_status: 'failed' })
              .eq('id', newMessage.id);
            
            toast.error(`Email failed to send: ${emailData.error}`);
          } else {
            console.log('Email sent successfully:', emailData);
            toast.success('Reply sent successfully');
          }
        } catch (emailError) {
          console.error('Error in email sending:', emailError);
          
          // Update message status to failed
          await supabase
            .from('messages')
            .update({ email_status: 'failed' })
            .eq('id', newMessage.id);
          
          toast.error('Reply saved but email failed to send');
        }
        
        // Refresh data again to show updated status
        queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      } else {
        toast.success('Internal note added');
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // Retry sending a failed message
  const retryMessage = async (messageId: string) => {
    try {
      // Update status to sending
      await supabase
        .from('messages')
        .update({ email_status: 'sending' })
        .eq('id', messageId);

      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });

      // Set up timeout
      const timeoutId = setTimeout(async () => {
        await supabase
          .from('messages')
          .update({ email_status: 'failed' })
          .eq('id', messageId);
        
        sendingTimeouts.current.delete(messageId);
        
        queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
        toast.error('Email sending timed out after 15 seconds');
      }, 15000);

      sendingTimeouts.current.set(messageId, timeoutId);

      // Attempt to send email
      const { data: emailData, error: emailError } = await supabase.functions.invoke('send-reply-email', {
        body: { messageId },
      });

      // Clear timeout
      const timeoutIdToCancel = sendingTimeouts.current.get(messageId);
      if (timeoutIdToCancel) {
        clearTimeout(timeoutIdToCancel);
        sendingTimeouts.current.delete(messageId);
      }

      if (emailError || emailData?.error) {
        await supabase
          .from('messages')
          .update({ email_status: 'failed' })
          .eq('id', messageId);
        
        toast.error('Email failed to send again');
      } else {
        toast.success('Email sent successfully');
      }

      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    } catch (error) {
      console.error('Error retrying message:', error);
      toast.error('Failed to retry sending message');
    }
  };

  // Delete a failed message
  const deleteMessage = async (messageId: string) => {
    const queryKey = ['messages', conversationId];
    
    try {
      console.log('Deleting message:', messageId, 'conversationId:', conversationId);
      
      // Get current messages to verify structure
      const currentMessages = queryClient.getQueryData(queryKey);
      console.log('Current messages in cache:', currentMessages);
      
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey });

      // Optimistically update to remove the message
      queryClient.setQueryData(queryKey, (old: any) => {
        console.log('Cache update - old data:', old);
        if (!old || !Array.isArray(old)) {
          console.log('No valid data in cache');
          return old;
        }
        const filtered = old.filter(msg => {
          console.log('Checking message:', msg.id, 'vs target:', messageId);
          return msg.id !== messageId;
        });
        console.log('Optimistic update - before:', old.length, 'after:', filtered.length);
        return filtered;
      });

      // Perform the deletion
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      console.log('Message deleted successfully from database');
      toast.success('Message deleted');
      
      // Don't refetch - let the optimistic update stay
      // The cache is already updated correctly
      
    } catch (error) {
      console.error('Error deleting message:', error);
      
      // If the mutation fails, invalidate to restore correct state
      queryClient.invalidateQueries({ queryKey });
      toast.error('Failed to delete message');
    }
  };

  // Fetch conversation details
  const { data: conversation, isLoading: conversationLoading } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          customer:customers(*),
          assigned_to:profiles(*)
        `)
        .eq('id', conversationId)
        .single();
      
      if (error) {
        console.error('Error fetching conversation:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!conversationId,
  });

  // Fetch messages for this conversation
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching messages:', error);
        return [];
      }
      
      return data;
    },
    enabled: !!conversationId,
  });

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-surface">
        <div className="text-center space-y-6 max-w-md mx-auto px-4">
          {/* Email Icon */}
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground" />
            </div>
          </div>
          
          {/* Empty State Text */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-foreground">No conversation selected</h3>
            <p className="text-muted-foreground">
              Choose a conversation from the list to start viewing messages
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (conversationLoading || messagesLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-surface">
        <div className="text-center space-y-4">
          <Clock className="h-8 w-8 mx-auto text-muted-foreground animate-spin" />
          <p className="text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-surface">
        <div className="text-center space-y-4">
          <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Conversation not found</p>
        </div>
      </div>
    );
  }

  // Helper function to get status icon
  const getStatusIcon = (message: any) => {
    if (message.is_internal) {
      return <CheckCircle className="h-3 w-3 text-success" />;
    }
    
    switch (message.email_status) {
      case 'sent':
        return <CheckCircle className="h-3 w-3 text-success" />;
      case 'sending':
        return <Clock className="h-3 w-3 text-warning animate-spin" />;
      case 'failed':
        return <XCircle className="h-3 w-3 text-destructive" />;
      case 'pending':
      default:
        return <Clock className="h-3 w-3 text-warning" />;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-gradient-surface">
      {/* Conversation Header */}
      <div className="p-3 md:p-4 border-b border-border bg-card/80 backdrop-blur-sm shadow-surface">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{conversation.customer?.full_name?.[0] || 'C'}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold text-foreground text-sm md:text-base line-clamp-1">{conversation.subject}</h2>
              <div className="flex items-center space-x-2 text-xs md:text-sm text-muted-foreground">
                <span className="truncate">{conversation.customer?.full_name || 'Unknown Customer'}</span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline truncate">{conversation.customer?.email}</span>
                <span className="hidden sm:inline">•</span>
                <Badge variant="outline" className="text-xs">
                  {conversation.channel}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-1 md:space-x-2">
            <Badge variant={conversation.status === 'open' ? 'default' : 'secondary'}>
              {conversation.status}
            </Badge>
            <Badge variant={conversation.priority === 'high' || conversation.priority === 'urgent' ? 'destructive' : 'secondary'}>
              {conversation.priority}
            </Badge>
            <div className="hidden sm:flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Assign
              </Button>
              <Button variant="outline" size="sm">
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </Button>
              <Button variant="outline" size="sm">
                <Clock className="h-4 w-4 mr-2" />
                Snooze
              </Button>
            </div>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-6">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No messages in this conversation yet</p>
              </div>
            ) : (
              messages.map((message, index) => {
                const messageDate = new Date(message.created_at);
                const showDate = index === 0 || 
                  formatDate(messageDate) !== formatDate(new Date(messages[index - 1].created_at));
                
                return (
                  <div key={message.id}>
                    {showDate && (
                      <div className="flex items-center justify-center my-6">
                        <div className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                          {formatDate(messageDate)}
                        </div>
                      </div>
                    )}
                    
                    <div className={`flex ${message.sender_type === 'agent' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-2xl ${message.sender_type === 'agent' ? 'ml-6 md:ml-12' : 'mr-6 md:mr-12'}`}>
                        {message.is_internal && (
                          <div 
                            className="text-xs mb-1 flex items-center font-medium"
                            style={{ color: 'hsl(var(--warning))' }}
                          >
                            <Star className="h-3 w-3 mr-1" />
                            Internal Note
                          </div>
                        )}
                        
                          <Card className={`${
                            message.is_internal 
                              ? 'bg-warning/10 border-warning/20' 
                              : message.sender_type === 'agent' 
                                ? 'bg-primary border-primary' 
                                : 'bg-card border-border'
                          }`}>
                            <CardContent className="p-4">
                              <p 
                                className="whitespace-pre-wrap"
                                style={{
                                  color: message.is_internal 
                                    ? 'rgb(31, 41, 55)' // Dark text for internal notes (warning background)
                                    : message.sender_type === 'agent' 
                                      ? 'rgb(248, 250, 252)' // White text for agent messages (blue background)
                                      : 'rgb(31, 41, 55)', // Dark text for customer messages (white background)
                                  fontSize: '0.875rem',
                                  fontWeight: message.is_internal ? '600' : '400',
                                  lineHeight: '1.25rem',
                                  opacity: 1
                                }}
                              >
                                {message.content}
                              </p>
                              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/20">
                                <div className="flex items-center space-x-2">
                                  {message.sender_type === 'agent' && (
                                    <>
                                      <Avatar className="h-4 w-4">
                                        <AvatarFallback 
                                          className="text-xs"
                                          style={{
                                            backgroundColor: 'hsl(var(--primary-foreground))',
                                            color: 'hsl(var(--primary))'
                                          }}
                                        >
                                          A
                                        </AvatarFallback>
                                      </Avatar>
                                       <span 
                                         style={{
                                           color: message.is_internal 
                                             ? 'rgb(31, 41, 55)' // Dark text for internal notes
                                             : message.sender_type === 'agent' 
                                               ? 'rgb(248, 250, 252)' // White text for agent messages
                                               : 'rgb(31, 41, 55)', // Dark text for customer messages
                                           fontSize: '0.75rem',
                                           fontWeight: '500'
                                         }}
                                       >
                                         Agent
                                       </span>
                                     </>
                                   )}
                                 </div>
                                 <div className="flex items-center space-x-2">
                                   {message.sender_type === 'agent' && getStatusIcon(message)}
                                   <span 
                                     style={{
                                       color: message.is_internal 
                                         ? 'rgb(31, 41, 55)' // Dark text for internal notes
                                         : message.sender_type === 'agent' 
                                           ? 'rgb(248, 250, 252)' // White text for agent messages
                                           : 'rgb(31, 41, 55)', // Dark text for customer messages
                                       fontSize: '0.75rem'
                                     }}
                                   >
                                     {formatTime(messageDate)}
                                   </span>
                                </div>
                              </div>
                             
                               {/* Failed/pending message actions */}
                               {message.sender_type === 'agent' && (message.email_status === 'failed' || message.email_status === 'pending' || message.email_status === 'sending') && (
                                 <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
                                   {/* Error toaster */}
                                   <div className={`border rounded-md p-3 ${
                                     message.email_status === 'failed' 
                                       ? 'bg-destructive/10 border-destructive/20' 
                                       : message.email_status === 'sending'
                                       ? 'bg-warning/10 border-warning/20'
                                       : 'bg-muted border-border'
                                   }`}>
                                     <div className="flex items-center space-x-2">
                                       {message.email_status === 'failed' ? (
                                         <>
                                           <AlertTriangle className="h-4 w-4 text-destructive" />
                                           <span className="text-sm text-destructive font-medium">
                                             Failed to send email
                                           </span>
                                         </>
                                       ) : message.email_status === 'sending' ? (
                                         <>
                                           <Clock className="h-4 w-4 text-warning animate-spin" />
                                           <span className="text-sm text-warning font-medium">
                                             Sending email...
                                           </span>
                                         </>
                                       ) : (
                                         <>
                                           <Clock className="h-4 w-4 text-muted-foreground" />
                                           <span className="text-sm text-muted-foreground font-medium">
                                             Email pending
                                           </span>
                                         </>
                                       )}
                                     </div>
                                   </div>
                                   
                                   {/* Action buttons */}
                                   <div className="flex items-center space-x-2">
                                     {message.email_status === 'failed' && (
                                       <Button
                                         variant="secondary"
                                         size="sm"
                                         onClick={() => retryMessage(message.id)}
                                         className="h-7 px-3 text-xs"
                                       >
                                         Try Again
                                       </Button>
                                     )}
                                     <Button
                                       variant="destructive"
                                       size="sm"
                                       onClick={() => deleteMessage(message.id)}
                                       className="h-7 px-3 text-xs"
                                     >
                                       Delete
                                     </Button>
                                   </div>
                                 </div>
                               )}
                           </CardContent>
                         </Card>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Reply Area */}
          <div className="border-t border-border bg-card p-3 md:p-4">
            <div className="space-y-3">
              {/* Toolbar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button variant="secondary" size="sm" className="hover:bg-accent">
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button variant="secondary" size="sm" className="hover:bg-accent">
                    <Italic className="h-4 w-4" />
                  </Button>
                  <Button variant="secondary" size="sm" className="hover:bg-accent">
                    <Link2 className="h-4 w-4" />
                  </Button>
                  <Separator orientation="vertical" className="h-4" />
                  <Button variant="secondary" size="sm" className="hover:bg-accent">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button variant="secondary" size="sm" className="hover:bg-accent">
                    <Smile className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button 
                    variant={isInternalNote ? "default" : "secondary"} 
                    size="sm"
                    onClick={() => setIsInternalNote(!isInternalNote)}
                    className="hover:bg-accent"
                  >
                    Internal Note
                  </Button>
                  <Button variant="secondary" size="sm" className="hover:bg-accent">
                    Templates
                  </Button>
                </div>
              </div>

              {/* Text Area */}
              <div className="relative">
                <Textarea
                  placeholder={isInternalNote ? "Add an internal note..." : "Type your reply..."}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className={`min-h-[100px] resize-none ${
                    isInternalNote ? 'border-warning bg-warning-muted' : ''
                  }`}
                />
              </div>

              {/* Send Button */}
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {isInternalNote ? 'This note will only be visible to your team' : 'This reply will be sent to the customer'}
                </div>
                <Button 
                  variant="default"
                  disabled={!replyText.trim() || isSending}
                  onClick={async () => {
                    setIsSending(true);
                    await handleSendMessage();
                    setIsSending(false);
                  }}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isSending 
                    ? (isInternalNote ? 'Adding...' : 'Sending...') 
                    : (isInternalNote ? 'Add Note' : 'Send Reply')
                  }
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Info Sidebar - Hidden on mobile */}
        <div className="hidden lg:block w-80 border-l border-border bg-card p-4 overflow-y-auto">
          <div className="space-y-6">
            {/* Customer Details */}
            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-foreground">Customer Details</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>{conversation.customer?.full_name?.[0] || 'C'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-medium text-foreground">{conversation.customer?.full_name || 'Unknown Customer'}</h4>
                    <p className="text-sm text-muted-foreground">{conversation.customer?.email}</p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer since:</span>
                    <span className="text-foreground">
                      {conversation.customer?.created_at ? new Date(conversation.customer.created_at).toLocaleDateString() : 'Unknown'}
                    </span>
                  </div>
                </div>
                
                <Button variant="outline" size="sm" className="w-full">
                  View Full Profile
                </Button>
              </CardContent>
            </Card>

            {/* Previous Conversations */}
            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-foreground">Previous Conversations</h3>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground text-center py-4">
                  No previous conversations
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold text-foreground">Quick Actions</h3>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Star className="h-4 w-4 mr-2" />
                  Mark as Priority
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Archive className="h-4 w-4 mr-2" />
                  Archive Conversation
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Clock className="h-4 w-4 mr-2" />
                  Snooze for Later
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
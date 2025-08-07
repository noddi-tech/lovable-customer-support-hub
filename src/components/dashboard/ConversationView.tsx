import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAutoContrast } from '@/hooks/useAutoContrast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sanitizeEmailHTML, extractTextFromHTML, shouldRenderAsHTML, fixEncodingIssues, formatEmailText, type EmailAttachment } from '@/utils/emailFormatting';
import { convertShortcodesToEmojis } from '@/utils/emojiUtils';
import { EmojiPicker } from '@/components/ui/emoji-picker';
import { EmojiAutocompleteInput } from '@/components/ui/emoji-autocomplete-input';
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
  AlertTriangle,
  Edit2,
  UserCheck,
  Save,
  X,
  Trash2,
  Lock,
  MoreVertical,
  Edit3,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import DOMPurify from 'dompurify';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CustomerNotes } from './CustomerNotes';

interface ConversationViewProps {
  conversationId?: string | null;
}

export const ConversationView: React.FC<ConversationViewProps> = ({ conversationId }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [assignedToId, setAssignedToId] = useState<string>('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [editingAssignedTo, setEditingAssignedTo] = useState<string>('');
  const [originalEditingContent, setOriginalEditingContent] = useState('');
  const [originalEditingAssignedTo, setOriginalEditingAssignedTo] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const sendingTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const queryClient = useQueryClient();
  const { getMessageTextColor, autoContrastEnabled } = useAutoContrast();
  const [isUpdatingMessage, setIsUpdatingMessage] = useState(false);

  // Helper functions
  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const processEmailContent = (content: string, contentType: string = 'text/html') => {
    // Use existing utilities to determine content type and process accordingly
    if (shouldRenderAsHTML(content, contentType)) {
      // Fix broken HTML patterns while preserving original design
      let processedContent = content;
      
      // Fix broken link pattern: "https://url" id="link-id">Link Text
      processedContent = processedContent.replace(
        /"(https?:\/\/[^"]+)"\s*(id="[^"]*")?\s*>([^<]*)/g, 
        '<a href="$1" $2>$3</a>'
      );
      
      // Fix broken image/link closures: "https://url">
      processedContent = processedContent.replace(
        /"(https?:\/\/[^"]+)">/g, 
        '<a href="$1">'
      );
      
      // Use the comprehensive email HTML sanitizer with original styles preserved
      return sanitizeEmailHTML(processedContent, [], true);
    } else {
      // Process as plain text using existing formatter
      return formatEmailText(content);
    }
  };

  const startEdit = (message: any) => {
    setEditingMessageId(message.id);
    setEditingContent(message.content);
    setEditingAssignedTo(message.assigned_to_id || '');
    setOriginalEditingContent(message.content);
    setOriginalEditingAssignedTo(message.assigned_to_id || '');
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent('');
    setEditingAssignedTo('');
    setOriginalEditingContent('');
    setOriginalEditingAssignedTo('');
  };

  const saveEdit = async () => {
    if (!editingMessageId || !editingContent.trim()) return;

    setIsUpdatingMessage(true);
    try {
      const { error } = await supabase
        .from('messages')
        .update({
          content: editingContent.trim(),
          assigned_to_id: editingAssignedTo && editingAssignedTo !== 'unassigned' ? editingAssignedTo : null,
        })
        .eq('id', editingMessageId);

      if (error) throw error;

      setEditingMessageId(null);
      setEditingContent('');
      setEditingAssignedTo('');
      setOriginalEditingContent('');
      setOriginalEditingAssignedTo('');
      
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      toast.success('Message updated successfully');
    } catch (error) {
      console.error('Error updating message:', error);
      toast.error('Failed to update message');
    } finally {
      setIsUpdatingMessage(false);
    }
  };

  // Function to extract clean text from HTML content and remove quoted emails
  const extractTextFromHTML_local = (htmlContent: string): string => {
    // Remove HTML tags and decode entities
    let textContent = htmlContent
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/&amp;/g, '&') // Replace HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\r?\n\s*\r?\n/g, '\n') // Remove extra blank lines
      .trim();

    // Remove quoted email content (common email reply patterns)
    const lines = textContent.split('\n');
    const cleanLines = [];
    let inQuotedSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for common quote patterns
      if (
        line.startsWith('>') || // Standard email quote
        line.match(/^On .+ wrote:$/i) || // "On [date] [person] wrote:"
        line.match(/^From:.+To:.+Subject:/i) || // Email headers
        line.includes('-----Original Message-----') ||
        line.includes('--- Forwarded message ---') ||
        line.match(/^\d{1,2}\/\d{1,2}\/\d{4}.+wrote:$/i) // Date patterns
      ) {
        inQuotedSection = true;
        continue;
      }
      
      // Reset quote detection if we hit a normal line after some content
      if (!line.startsWith('>') && line.length > 0 && !inQuotedSection) {
        cleanLines.push(lines[i]);
      } else if (!inQuotedSection && line.length > 0) {
        cleanLines.push(lines[i]);
      }
    }
    
    return cleanLines.join('\n').trim();
  };

  // Get message ID from URL
  const selectedMessageId = searchParams.get('message');

  // Handle message clicking
  const handleMessageClick = (messageId: string) => {
    const currentParams = new URLSearchParams(searchParams);
    currentParams.set('message', messageId);
    navigate(`/?${currentParams.toString()}`, { replace: true });
  };


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
      // Convert emoji shortcodes to actual emojis before sending
      const processedContent = convertShortcodesToEmojis(replyText.trim());
      
      // First, save the message to the database with 'sending' status
      const { data: newMessage, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content: processedContent,
          is_internal: isInternalNote,
          sender_type: 'agent',
          content_type: 'text',
          assigned_to_id: isInternalNote && assignedToId && assignedToId !== 'unassigned' ? assignedToId : null,
          email_status: isInternalNote ? 'sent' : 'sending'  // Internal notes don't need email sending
        })
        .select()
        .single();

      if (error) throw error;

      // Reset form and refresh data immediately to show the message
      setReplyText('');
      setAssignedToId('');
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

  // Fetch team members for assignment
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .eq('is_active', true);
      
      if (error) {
        console.error('Error fetching team members:', error);
        return [];
      }
      
      return data;
    },
  });

  // Handle editing internal notes
  const handleEditMessage = (message: any) => {
    setEditingMessageId(message.id);
    setEditingContent(message.content);
    setEditingAssignedTo(message.assigned_to_id || '');
    // Store original values to detect changes later
    setOriginalEditingContent(message.content);
    setOriginalEditingAssignedTo(message.assigned_to_id || '');
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || !editingContent.trim()) return;

    // Check if there are actual changes
    const contentChanged = editingContent.trim() !== originalEditingContent;
    const assignmentChanged = (editingAssignedTo || '') !== originalEditingAssignedTo;
    
    console.log('Save edit debug:', {
      editingContent: editingContent.trim(),
      originalEditingContent,
      editingAssignedTo: editingAssignedTo || '',
      originalEditingAssignedTo,
      contentChanged,
      assignmentChanged
    });
    
    if (!contentChanged && !assignmentChanged) {
      // No changes, just cancel editing
      console.log('No changes detected, canceling edit');
      setEditingMessageId(null);
      setEditingContent('');
      setEditingAssignedTo('');
      setOriginalEditingContent('');
      setOriginalEditingAssignedTo('');
      toast.info('No changes to save');
      return;
    }

    console.log('Changes detected, updating message:', editingMessageId);

    try {
      const { error } = await supabase
        .from('messages')
        .update({
          content: editingContent.trim(),
          assigned_to_id: editingAssignedTo && editingAssignedTo !== 'unassigned' ? editingAssignedTo : null,
        })
        .eq('id', editingMessageId);

      if (error) {
        console.error('Database update error:', error);
        throw error;
      }

      console.log('Database update successful');

      // Reset all editing states
      setEditingMessageId(null);
      setEditingContent('');
      setEditingAssignedTo('');
      setOriginalEditingContent('');
      setOriginalEditingAssignedTo('');
      
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      toast.success('Internal note updated successfully');
    } catch (error) {
      console.error('Error updating message:', error);
      toast.error('Failed to update internal note');
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent('');
    setEditingAssignedTo('');
    setOriginalEditingContent('');
    setOriginalEditingAssignedTo('');
  };

  // Handle delete confirmation modal
  const handleDeleteClick = (messageId: string) => {
    setMessageToDelete(messageId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (messageToDelete) {
      deleteMessage(messageToDelete);
      setMessageToDelete(null);
      setDeleteDialogOpen(false);
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

  // Helper variables that depend on conversation data
  const customer = conversation?.customer;
  const assignedAgent = conversation?.assigned_to;

  // Fetch messages for this conversation with assigned user details
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          assigned_to:profiles!assigned_to_id(user_id, full_name, email)
        `)
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

  // Scroll to selected message when it changes
  useEffect(() => {
    if (selectedMessageId && messageRefs.current.has(selectedMessageId)) {
      const messageElement = messageRefs.current.get(selectedMessageId);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedMessageId, messages]);

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

  if (conversationLoading || messagesLoading || !conversation) {
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
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatTimestamps = (message: any) => {
    const createdDate = new Date(message.created_at);
    const createdTime = formatTime(createdDate);
    
    // Check if message has been updated (for internal notes)
    if (message.is_internal && message.updated_at && message.updated_at !== message.created_at) {
      const updatedDate = new Date(message.updated_at);
      const updatedTime = formatTime(updatedDate);
      return `created: ${createdTime} • edited: ${updatedTime}`;
    }
    
    return createdTime;
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

      <div className="flex-1 flex overflow-hidden relative">
        {/* Messages Area - Full height with bottom padding for fixed reply */}
        <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 max-w-5xl mx-auto w-full pb-32">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No messages yet</p>
            </div>
          ) : (
            messages.map((message, index) => {
              const isFromCustomer = message.sender_type === 'customer';
              const isInternal = message.is_internal;
              const showAvatar = index === 0 || messages[index - 1]?.sender_type !== message.sender_type;
              const isEditing = editingMessageId === message.id;

              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3 group relative",
                    isFromCustomer ? "justify-start" : "justify-end",
                    isInternal && "opacity-75"
                  )}
                >
                  {isFromCustomer && showAvatar && (
                    <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(customer?.full_name || customer?.email || 'C')}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  {isFromCustomer && !showAvatar && (
                    <div className="w-8 flex-shrink-0" />
                  )}

                  <div className={cn(
                    "max-w-[85%] md:max-w-[70%]",
                    !isFromCustomer && "ml-auto"
                  )}>
                    <div
                      className={cn(
                        "rounded-lg p-3 relative overflow-hidden",
                        isFromCustomer
                          ? "bg-muted"
                          : isInternal
                          ? "bg-orange-100 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800"
                          : "bg-primary text-primary-foreground"
                      )}
                    >
                      {isInternal && (
                        <div className="flex items-center gap-1 mb-2 text-xs text-orange-600 dark:text-orange-400">
                          <Lock className="h-3 w-3" />
                          Internal Note
                        </div>
                      )}

                      {isEditing ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            className="min-h-[100px] resize-none"
                            autoFocus
                          />
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEdit}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={saveEdit}
                              disabled={isUpdatingMessage}
                            >
                              {isUpdatingMessage ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                'Save'
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="email-container"
                          style={{ maxWidth: '100%' }}
                          dangerouslySetInnerHTML={{
                            __html: processEmailContent(message.content, message.content_type || 'text/html')
                          }}
                        />
                      )}

                      {/* Message actions */}
                      {!isEditing && !isFromCustomer && (
                        <div className="absolute -right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => startEdit(message)}>
                                <Edit3 className="h-3 w-3 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => deleteMessage(message.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-3 w-3 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>
                        {format(new Date(message.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                      {message.sender_type === 'agent' && assignedAgent && (
                        <>
                          <span>•</span>
                          <span>{assignedAgent.full_name}</span>
                        </>
                      )}
                      {message.email_status && message.sender_type === 'agent' && (
                        <>
                          <span>•</span>
                          <span className={cn(
                            "capitalize",
                            message.email_status === 'sent' && "text-green-600 dark:text-green-400",
                            message.email_status === 'failed' && "text-red-600 dark:text-red-400",
                            message.email_status === 'pending' && "text-yellow-600 dark:text-yellow-400"
                          )}>
                            {message.email_status}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {!isFromCustomer && showAvatar && (
                    <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                        {getInitials(assignedAgent?.full_name || 'A')}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  {!isFromCustomer && !showAvatar && (
                    <div className="w-8 flex-shrink-0" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Fixed Reply Area - Sticky to viewport bottom */}
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur-sm z-50">
          <div className="p-3 md:p-4 max-w-5xl mx-auto">
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
                  <EmojiPicker onEmojiSelect={(emoji) => setReplyText(prev => prev + emoji)} />
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

              {/* Assignment dropdown for internal notes */}
              {isInternalNote && (
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-muted-foreground">Assign to:</label>
                  <Select value={assignedToId} onValueChange={setAssignedToId}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          {member.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Text Area with Emoji Autocomplete */}
              <div className="relative">
                <EmojiAutocompleteInput
                  value={replyText}
                  onChange={setReplyText}
                  placeholder={isInternalNote ? "Add an internal note... (try :smile:)" : "Type your reply... (try :blush:)"}
                  className={`min-h-[100px] resize-none w-full p-3 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                    isInternalNote ? 'border-warning bg-warning/5' : ''
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

            {/* Customer Notes */}
            <CustomerNotes customerId={conversation.customer?.id} />

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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
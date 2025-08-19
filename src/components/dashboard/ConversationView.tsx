import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAutoContrast } from '@/hooks/useAutoContrast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sanitizeEmailHTML, extractTextFromHTML, shouldRenderAsHTML, fixEncodingIssues, formatEmailText, stripQuotedEmailHTML, stripQuotedEmailText, type EmailAttachment } from '@/utils/emailFormatting';
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
  ArchiveRestore,
  Clock, 
  UserPlus, 
  Star,
  Paperclip,
  Send,
  RefreshCw,
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
  Sparkles,
  Loader2,
  Move,
  ChevronLeft,
  ChevronRight
 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CustomerNotes } from './CustomerNotes';
import { useTranslation } from 'react-i18next';
import { useDateFormatting } from '@/hooks/useDateFormatting';

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
  const { t } = useTranslation();
  const { relative, dateTime, time, timezone } = useDateFormatting();
  const [isUpdatingMessage, setIsUpdatingMessage] = useState(false);
  const [postSendStatus, setPostSendStatus] = useState<'open' | 'pending' | 'closed'>('closed');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignSelectedUserId, setAssignSelectedUserId] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [snoozeDialogOpen, setSnoozeDialogOpen] = useState(false);
  const [snoozeDate, setSnoozeDate] = useState<Date | undefined>();
  const [snoozeTime, setSnoozeTime] = useState<string>('09:00');
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [selectedInboxId, setSelectedInboxId] = useState<string>('');
  const [isMoving, setIsMoving] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // AI suggestions state
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Array<{ title?: string; reply: string; rationale?: string; tags?: string[]; confidence?: number }>>([]);
  const [aiError, setAiError] = useState<string>('');

  // Helper functions
  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const processEmailContent = (content: string, contentType: string = 'text/html', attachments: EmailAttachment[] = [], messageId?: string) => {
    // Use existing utilities to determine content type and process accordingly
    if (shouldRenderAsHTML(content, contentType)) {
      // Strip quoted previous messages first, then fix common patterns
      let processedContent = stripQuotedEmailHTML(content);
      
      // Fix broken link pattern: "https://url" id="link-id">Link Text
      processedContent = processedContent.replace(
        /"(https?:\/\/[^\"]+)"\s*(id="[^"]*")?\s*>([^<]*)/g, 
        '<a href="$1" $2>$3</a>'
      );
      
      // Fix broken image/link closures: "https://url">
      processedContent = processedContent.replace(
        /"(https?:\/\/[^\"]+)">/g, 
        '<a href="$1">'
      );
      
      // Use the comprehensive email HTML sanitizer with original styles preserved
      return sanitizeEmailHTML(processedContent, attachments, true, messageId);
    } else {
      // Process as plain text: strip quoted content, then format
      const stripped = stripQuotedEmailText(content);
      return formatEmailText(stripped);
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
      toast.success(t('conversation.internalNoteUpdated'));
    } catch (error) {
      console.error('Error updating message:', error);
      toast.error(t('conversation.failedToUpdateNote'));
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
      const { data: userData } = await supabase.auth.getUser();
      const { data: newMessage, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content: processedContent,
          is_internal: isInternalNote,
          sender_type: 'agent',
          sender_id: userData?.user?.id || null,
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
            
            // Create a persistent notification for the agent
            try {
              const { data: userData } = await supabase.auth.getUser();
              await supabase.from('notifications').insert({
                user_id: userData?.user?.id,
                title: 'Email Failed to Send',
                message: 'Your reply could not be sent (timeout). Click to open and retry.',
                type: 'error',
                data: {
                  conversation_id: conversationId,
                  message_id: newMessage.id,
                  note_preview: extractTextFromHTML_local(processedContent).slice(0, 100)
                }
              });
            } catch (notifyErr) {
              console.error('Failed to create failure notification:', notifyErr);
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
            
            // Create a persistent notification for the agent
            try {
              const { data: userData } = await supabase.auth.getUser();
              await supabase.from('notifications').insert({
                user_id: userData?.user?.id,
                title: 'Email Failed to Send',
                message: 'Email failed to send: SendGrid credits exceeded. Please increase credits in SendGrid and try again.',
                type: 'error',
                data: { conversation_id: conversationId, message_id: newMessage.id, note_preview: extractTextFromHTML_local(processedContent).slice(0, 100) }
              });
            } catch (notifyErr) {
              console.error('Failed to create failure notification:', notifyErr);
            }
            
            toast.error('Email failed to send: SendGrid credits exceeded. Please increase credits in SendGrid and try again.');
          } else if (emailData?.error) {
            console.error('Email function returned error:', emailData.error);
            
            // Update message status to failed
            await supabase
              .from('messages')
              .update({ email_status: 'failed' })
              .eq('id', newMessage.id);
            
            // Create a persistent notification for the agent
            try {
              const { data: userData } = await supabase.auth.getUser();
              await supabase.from('notifications').insert({
                user_id: userData?.user?.id,
                title: 'Email Failed to Send',
                message: 'Email failed to send: SendGrid credits exceeded. Please increase credits in SendGrid and try again.',
                type: 'error',
                data: { conversation_id: conversationId, message_id: newMessage.id, note_preview: extractTextFromHTML_local(processedContent).slice(0, 100) }
              });
            } catch (notifyErr) {
              console.error('Failed to create failure notification:', notifyErr);
            }
            
            toast.error('Email failed to send: SendGrid credits exceeded. Please increase credits in SendGrid and try again.');
          } else {
            console.log('Email sent successfully:', emailData);
            
            // Update message status to sent
            await supabase
              .from('messages')
              .update({ email_status: 'sent' })
              .eq('id', newMessage.id);
            
            // Update conversation status after successful send
            try {
              await supabase
                .from('conversations')
                .update({ status: postSendStatus })
                .eq('id', conversationId as string);
              queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
              queryClient.invalidateQueries({ queryKey: ['conversations'] });
              queryClient.invalidateQueries({ queryKey: ['conversation-counts'] });
            } catch (e) {
              console.error('Failed to update conversation status:', e);
            }
            
            toast.success('Reply sent successfully');
          }
        } catch (emailError) {
          console.error('Error in email sending:', emailError);
          
          // Update message status to failed
          await supabase
            .from('messages')
            .update({ email_status: 'failed' })
            .eq('id', newMessage.id);
          
          // Create a persistent notification for the agent
          try {
            const { data: userData } = await supabase.auth.getUser();
            await supabase.from('notifications').insert({
              user_id: userData?.user?.id,
              title: 'Email Failed to Send',
              message: 'Reply saved but email failed to send. SendGrid credits exceeded. Please increase credits in SendGrid and try again.',
              type: 'error',
              data: { conversation_id: conversationId, message_id: newMessage.id, note_preview: extractTextFromHTML_local(processedContent).slice(0, 100) }
            });
          } catch (notifyErr) {
            console.error('Failed to create failure notification:', notifyErr);
          }
          
          toast.error('Reply saved but email failed to send. SendGrid credits exceeded. Please increase credits in SendGrid and try again.');
        }
        
        // Refresh data again to show updated status
        queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      } else {
        // Update conversation status after adding internal note
        try {
          await supabase
            .from('conversations')
            .update({ status: postSendStatus })
            .eq('id', conversationId as string);
          queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        } catch (e) {
          console.error('Failed to update conversation status:', e);
        }
        toast.success(t('conversation.internalNoteAdded'));
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // Get AI suggested replies for the latest customer message
  const handleAISuggestClick = async () => {
    try {
      setAiError('');
      setAiLoading(true);

      // Find latest customer message in this conversation
      const latestCustomer = (messages || []).find((m: any) => m.sender_type === 'customer' && !m.is_internal);
      if (!latestCustomer) {
        toast.error('Fant ingen kundemelding i tråden');
        setAiLoading(false);
        return;
      }

      const text = latestCustomer.content_type === 'text/html'
        ? extractTextFromHTML_local(latestCustomer.content)
        : (latestCustomer.content || '');

      const { data, error } = await supabase.functions.invoke('suggest-replies', {
        body: { customerMessage: text },
      });

      if (error) throw error;

      const suggestions = (data as any)?.suggestions || [];
      setAiSuggestions(suggestions);
      setAiOpen(true);
    } catch (e: any) {
      console.error('AI suggestions failed', e);
      setAiError(e?.message || 'Kunne ikke hente AI-forslag');
      toast.error('Kunne ikke hente AI-forslag');
    } finally {
      setAiLoading(false);
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
        
        // Create a persistent notification for the agent
        try {
          const { data: userData } = await supabase.auth.getUser();
          await supabase.from('notifications').insert({
            user_id: userData?.user?.id,
            title: 'Email Failed to Send',
            message: 'Your retry timed out. Click to open and retry again.',
            type: 'error',
            data: { conversation_id: conversationId, message_id: messageId }
          });
        } catch (notifyErr) {
          console.error('Failed to create failure notification (retry timeout):', notifyErr);
        }
        
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
        
        // Create a persistent notification for the agent
        try {
          const { data: userData } = await supabase.auth.getUser();
          await supabase.from('notifications').insert({
            user_id: userData?.user?.id,
            title: 'Email Failed to Send',
            message: 'Email failed to send again',
            type: 'error',
            data: { conversation_id: conversationId, message_id: messageId }
          });
        } catch (notifyErr) {
          console.error('Failed to create failure notification (retry error):', notifyErr);
        }
        
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
      toast.success(t('conversation.messageDeleted'));
      
      // Don't refetch - let the optimistic update stay
      // The cache is already updated correctly
      
    } catch (error) {
      console.error('Error deleting message:', error);
      
      // If the mutation fails, invalidate to restore correct state
      queryClient.invalidateQueries({ queryKey });
      toast.error(t('conversation.failedToDeleteMessage'));
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

  // Fetch inboxes for moving conversations
  const { data: inboxes = [] } = useQuery({
    queryKey: ['inboxes'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_inboxes');
      if (error) {
        console.error('Error fetching inboxes:', error);
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
      toast.info(t('conversation.noChangesToSave'));
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
      toast.success(t('conversation.internalNoteUpdated'));
    } catch (error) {
      console.error('Error updating message:', error);
      toast.error(t('conversation.failedToUpdateNote'));
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
        .order('created_at', { ascending: false });
      
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
            <h3 className="text-lg font-medium text-foreground">{t('conversation.noConversationSelected')}</h3>
            <p className="text-muted-foreground">
              {t('conversation.chooseConversation')}
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
          <p className="text-muted-foreground">{t('conversation.loadingConversation')}</p>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-surface">
        <div className="text-center space-y-4">
          <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">{t('conversation.conversationNotFound')}</p>
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

  // Helper function to format message timestamps using timezone-aware formatting
  const formatMessageTime = (dateString: string) => {
    return time(new Date(dateString));
  };

  const formatTimestamps = (message: any) => {
    const createdTime = formatMessageTime(message.created_at);
    
    // Check if message has been updated (for internal notes)
    if (message.is_internal && message.updated_at && message.updated_at !== message.created_at) {
      const updatedTime = formatMessageTime(message.updated_at);
      return `${t('conversation.messageCreated')} ${createdTime} • ${t('conversation.messageEdited')} ${updatedTime}`;
    }
    
    return createdTime;
  };

  const formatDate = (date: Date) => {
    return dateTime(date, false); // Use timezone-aware formatting
  };

  // Derive the actual email timestamp from headers when available
  const getMessageDate = (message: any): Date => {
    try {
      const headers = message?.email_headers;
      // Gmail sync stores full headers as an array of { name, value }
      if (Array.isArray(headers)) {
        const dateHeader = headers.find((h: any) => h?.name?.toLowerCase?.() === 'date')?.value;
        if (dateHeader) {
          const parsed = new Date(dateHeader);
          if (!isNaN(parsed.getTime())) return parsed;
        }
      } else if (headers && typeof headers === 'object') {
        const dateHeader = (headers as any).Date || (headers as any).date;
        if (dateHeader) {
          const parsed = new Date(dateHeader as any);
          if (!isNaN(parsed.getTime())) return parsed;
        }
      }
      if (message?.received_at) {
        const parsed = new Date(message.received_at);
        if (!isNaN(parsed.getTime())) return parsed;
      }
    } catch {}
    // Fallback to created_at (DB insert time)
    return new Date(message.created_at);
  };
  const handleAssignConversation = async () => {
    try {
      setIsAssigning(true);
      const targetUserId = assignSelectedUserId || null;
      if ((assignedAgent?.user_id ?? null) === targetUserId) {
        toast.info(t('conversation.noChangesToAssignment'));
        setAssignDialogOpen(false);
        return;
      }
      const { error } = await supabase
        .from('conversations')
        .update({ assigned_to_id: targetUserId })
        .eq('id', conversationId as string);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success(targetUserId ? t('conversation.conversationAssigned') : t('conversation.conversationUnassigned'));
      setAssignDialogOpen(false);
    } catch (e) {
      console.error('Failed to assign conversation:', e);
      toast.error(t('conversation.failedToUpdateAssignment'));
    } finally {
      setIsAssigning(false);
    }
  };

  const handleMoveConversation = async () => {
    try {
      setIsMoving(true);
      if (!selectedInboxId || selectedInboxId === conversation?.inbox_id) {
        toast.info(t('conversation.noChangesToInbox'));
        setMoveDialogOpen(false);
        return;
      }
      const { error } = await supabase
        .from('conversations')
        .update({ inbox_id: selectedInboxId })
        .eq('id', conversationId as string);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation-counts'] });
      const targetInbox = inboxes.find(i => i.id === selectedInboxId);
      toast.success(t('conversation.conversationMoved', { inboxName: targetInbox?.name || 'selected inbox' }));
      setMoveDialogOpen(false);
    } catch (e) {
      console.error('Failed to move conversation:', e);
      toast.error(t('conversation.failedToMove'));
    } finally {
      setIsMoving(false);
    }
  };
  const handleArchive = async () => {
    try {
      await supabase
        .from('conversations')
        .update({ is_archived: true })
        .eq('id', conversationId as string);
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation-counts'] });
      toast.success(t('conversation.conversationArchived'));
      const cur = new URLSearchParams(searchParams);
      cur.delete('conversation');
      cur.delete('message');
      const qs = cur.toString();
      navigate(qs ? `/?${qs}` : '/', { replace: true });
    } catch (e) {
      console.error('Failed to archive conversation:', e);
      toast.error(t('conversation.failedToArchive'));
    }
  };
  const handleUnarchive = async () => {
    try {
      await supabase
        .from('conversations')
        .update({ is_archived: false })
        .eq('id', conversationId as string);
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation-counts'] });
      toast.success(t('conversation.conversationUnarchived'));
      const cur = new URLSearchParams(searchParams);
      cur.delete('conversation');
      cur.delete('message');
      const qs = cur.toString();
      navigate(qs ? `/?${qs}` : '/', { replace: true });
    } catch (e) {
      console.error('Failed to unarchive conversation:', e);
      toast.error(t('conversation.failedToUnarchive'));
    }
  };

  // Mark conversation as closed
  const handleMarkClosed = async () => {
    try {
      await supabase
        .from('conversations')
        .update({ status: 'closed' })
        .eq('id', conversationId as string);
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation-counts'] });
      toast.success(t('conversation.conversationClosed'));
    } catch (e) {
      console.error('Failed to close conversation:', e);
      toast.error(t('conversation.failedToClose'));
    }
  };
  const setPresetSnooze = (date: Date) => {
    setSnoozeDate(date);
    // default time if none chosen: keep hours/minutes from date
    setSnoozeTime(date.toTimeString().slice(0,5));
    setSnoozeDialogOpen(true);
  };
  const handleConfirmSnooze = async () => {
    try {
      if (!conversationId) return;
      let finalDate: Date | null = null;
      if (snoozeDate) {
        const [hh, mm] = (snoozeTime || '09:00').split(':').map(Number);
        const combined = new Date(snoozeDate);
        combined.setHours(hh || 9, mm || 0, 0, 0);
        finalDate = combined;
      }
      if (!finalDate) return;
      const { data: userData } = await supabase.auth.getUser();
      await supabase
        .from('conversations')
        .update({ snooze_until: finalDate.toISOString(), snoozed_by_id: userData?.user?.id || null })
        .eq('id', conversationId as string);
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation-counts'] });
      toast.success(t('conversation.conversationSnoozed'));
      setSnoozeDialogOpen(false);
      const cur = new URLSearchParams(searchParams);
      cur.delete('conversation');
      cur.delete('message');
      const qs = cur.toString();
      navigate(qs ? `/?${qs}` : '/', { replace: true });
    } catch (e) {
      console.error('Failed to snooze conversation:', e);
      toast.error(t('conversation.failedToSnooze'));
    }
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
                <span className="truncate">{conversation.customer?.full_name || t('conversation.unknownCustomer')}</span>
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
              {t(`conversation.${conversation.status}`)}
            </Badge>
            <Badge variant={conversation.priority === 'high' || conversation.priority === 'urgent' ? 'destructive' : 'secondary'}>
              {t(`conversation.${conversation.priority}`)}
            </Badge>
            <div className="hidden sm:flex items-center space-x-2">
              <Dialog open={assignDialogOpen} onOpenChange={(open) => { setAssignDialogOpen(open); if (open) { setAssignSelectedUserId(assignedAgent?.user_id || ''); } }}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    {t('conversation.assign')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('conversation.assignConversation')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Select
                      value={assignSelectedUserId || 'unassigned'}
                      onValueChange={(v) => setAssignSelectedUserId(v === 'unassigned' ? '' : v)}
                    >
                      <SelectTrigger className="w-full">
                         <SelectValue placeholder={t('admin.selectTeamMember')} />
                      </SelectTrigger>
                      <SelectContent>
                         <SelectItem value="unassigned">{t('admin.unassigned')}</SelectItem>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.user_id} value={member.user_id}>
                            {member.full_name} ({member.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setAssignDialogOpen(false)}>
                        {t('common.cancel')}
                      </Button>
                      <Button size="sm" onClick={handleAssignConversation} disabled={isAssigning}>
                        {isAssigning ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {t('conversation.saving')}
                          </>
                        ) : (
                          t('conversation.assign')
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={moveDialogOpen} onOpenChange={(open) => { setMoveDialogOpen(open); if (open) { setSelectedInboxId(conversation?.inbox_id || ''); } }}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Move className="h-4 w-4 mr-2" />
                    {t('conversation.move')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('conversation.moveConversation')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Select
                      value={selectedInboxId}
                      onValueChange={setSelectedInboxId}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('conversation.selectInbox')} />
                      </SelectTrigger>
                      <SelectContent>
                        {inboxes.map((inbox) => (
                          <SelectItem key={inbox.id} value={inbox.id}>
                            {inbox.name}
                            {inbox.id === conversation?.inbox_id && ` (${t('conversation.current')})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setMoveDialogOpen(false)}>
                        {t('common.cancel')}
                      </Button>
                      <Button size="sm" onClick={handleMoveConversation} disabled={isMoving}>
                        {isMoving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {t('conversation.moving')}
                          </>
                        ) : (
                          t('conversation.move')
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm" onClick={handleMarkClosed} disabled={conversation.status === 'closed'}>
                <CheckCircle className="h-4 w-4 mr-2" />
                {t('conversation.closed')}
              </Button>
              {conversation.is_archived ? (
                <Button variant="outline" size="sm" onClick={handleUnarchive}>
                  <ArchiveRestore className="h-4 w-4 mr-2" />
                  {t('conversation.unarchive')}
                </Button>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Archive className="h-4 w-4 mr-2" />
                      {t('conversation.archive')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('conversation.archiveDialogTitle')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('conversation.archiveDialogDescription')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleArchive}>{t('conversation.archive')}</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button variant="outline" size="sm" onClick={() => setSnoozeDialogOpen(true)}>
                <Clock className="h-4 w-4 mr-2" />
                {t('conversation.snooze')}
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
        <ScrollArea className="flex-1">
          <div className="p-3 md:p-6 space-y-4 max-w-5xl mx-auto w-full pb-32">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{t('conversation.noMessages')}</p>
            </div>
          ) : (
            messages.map((message, index) => {
              const isFromCustomer = message.sender_type === 'customer';
              const isInternal = message.is_internal;
              const showAvatar = index === 0 || messages[index - 1]?.sender_type !== message.sender_type;
              const isEditing = editingMessageId === message.id;
              const isAgentHTML = !isFromCustomer && !isInternal && shouldRenderAsHTML(message.content, message.content_type || 'text/html');

              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3 group relative min-w-0",
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
                    "w-full min-w-0",
                    !isFromCustomer && "ml-auto"
                  )}>
                    <div
                      className={cn(
                        "w-full rounded-lg p-3 relative overflow-hidden",
                        isFromCustomer
                          ? "bg-muted text-foreground"
                          : isInternal
                          ? "bg-orange-100 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800"
                          : isAgentHTML
                          ? "bg-card border border-border text-foreground"
                          : "bg-primary/10 border border-primary/20 text-foreground"
                      )}
                    >
                      {isInternal ? (
                        <div className="flex items-center gap-1 mb-2 text-xs text-orange-600 dark:text-orange-400">
                          <Lock className="h-3 w-3" />
                          {t('conversation.internalNote')}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mb-2 text-xs">
                          {isFromCustomer ? (
                            <>
                              <Badge variant="secondary">{t('conversation.customer')}</Badge>
                              <span className="text-muted-foreground">{customer?.full_name || customer?.email}</span>
                            </>
                          ) : (
                            <>
                              <Badge variant="default">{t('conversation.agent')}</Badge>
                              <span className="text-muted-foreground">{(message as any).sender?.full_name || assignedAgent?.full_name || t('conversation.agent')}</span>
                            </>
                          )}
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
                              {t('common.cancel')}
                            </Button>
                            <Button
                              size="sm"
                              onClick={saveEdit}
                              disabled={isUpdatingMessage}
                            >
                              {isUpdatingMessage ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  {t('conversation.saving')}
                                </>
                              ) : (
                                t('conversation.save')
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="email-container email-content w-full break-words"
                          style={{ maxWidth: '100%' }}
                          dangerouslySetInnerHTML={{
                            __html: processEmailContent(
                              message.content, 
                              message.content_type || 'text/html',
                              Array.isArray(message.attachments) ? message.attachments.map(att => att as unknown as EmailAttachment) : [],
                              message.id
                            )
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
                              {!message.is_internal && message.sender_type === 'agent' && message.email_status === 'failed' && (
                                <DropdownMenuItem onClick={() => retryMessage(message.id)}>
                                  <RefreshCw className="h-3 w-3 mr-2" />
                                  {t('conversation.retrySend')}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => startEdit(message)}>
                                <Edit3 className="h-3 w-3 mr-2" />
                                {t('conversation.edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => deleteMessage(message.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-3 w-3 mr-2" />
                                {t('conversation.delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span title={getMessageDate(message).toLocaleString(undefined, { hour12: false })}>
                        {format(getMessageDate(message), 'MMM d, yyyy HH:mm:ss')}
                      </span>
                      {message.sender_type === 'agent' && (
                        <>
                          <span>•</span>
                          <span>{(message as any).sender?.full_name || assignedAgent?.full_name || t('conversation.agent')}</span>
                        </>
                      )}
                      {message.email_status && message.sender_type === 'agent' && (
                        <>
                          <span>•</span>
                           <span className={cn(
                            message.email_status === 'sent' && "text-green-600 dark:text-green-400",
                            message.email_status === 'failed' && "text-red-600 dark:text-red-400",
                            message.email_status === 'pending' && "text-yellow-600 dark:text-yellow-400"
                          )}>
                            {t(`conversation.emailStatus.${message.email_status}`)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {!isFromCustomer && showAvatar && (
                    <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                        {getInitials(((message as any).sender?.full_name) || assignedAgent?.full_name || t('conversation.agent'))}
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
        </ScrollArea>

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
                      variant="secondary" 
                      size="sm"
                      onClick={handleAISuggestClick}
                      disabled={aiLoading}
                      className="hover:bg-accent"
                      title={t('conversation.getAISuggestions')}
                    >
                      <Sparkles className="h-4 w-4 mr-1" />
                      {aiLoading ? t('conversation.suggesting') : t('conversation.aiSuggestion')}
                    </Button>
                    <Button 
                      variant={isInternalNote ? "default" : "secondary"} 
                      size="sm"
                      onClick={() => setIsInternalNote(!isInternalNote)}
                      className="hover:bg-accent"
                    >
                      {t('conversation.internalNote')}
                    </Button>
                    <Button variant="secondary" size="sm" className="hover:bg-accent">
                      {t('conversation.templates')}
                    </Button>
                  </div>
              </div>

              {/* Assignment dropdown for internal notes */}
              {isInternalNote && (
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-muted-foreground">{t('conversation.assignTo')}</label>
                  <Select value={assignedToId} onValueChange={setAssignedToId}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder={t('admin.selectTeamMember')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">{t('admin.unassigned')}</SelectItem>
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
                  placeholder={isInternalNote ? t('conversation.internalNotePlaceholder') : t('conversation.replyPlaceholder')}
                  className={`min-h-[100px] resize-none w-full p-3 border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                    isInternalNote ? 'border-warning bg-warning/5' : ''
                  }`}
                />
              </div>

              {/* Send Button */}
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {isInternalNote ? t('conversation.internalNoteNote') : t('conversation.sendToCustomer')}
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground hidden sm:block">{t('conversation.setStatus')}</label>
                  <Select value={postSendStatus} onValueChange={(v) => setPostSendStatus(v as 'open' | 'pending' | 'closed')}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder={t('conversation.selectStatus')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">{t('conversation.open')}</SelectItem>
                      <SelectItem value="pending">{t('conversation.pending')}</SelectItem>
                      <SelectItem value="closed">{t('conversation.closed')}</SelectItem>
                    </SelectContent>
                  </Select>
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
                      ? (isInternalNote ? t('conversation.adding') : t('conversation.sending')) 
                      : (isInternalNote ? t('conversation.addNote') : t('conversation.sendReply'))
                    }
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Suggestions Dialog */}
        <Dialog open={aiOpen} onOpenChange={setAiOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('conversation.aiSuggestions')}</DialogTitle>
            </DialogHeader>
            {aiLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 mr-2 animate-spin" /> {t('conversation.thinking')}
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {aiSuggestions.map((s, i) => (
                  <div key={i} className="border border-border rounded p-3 bg-card">
                    <div className="text-sm text-muted-foreground mb-1">
                      {(s.title || t('conversation.suggestion'))}{typeof s.confidence === 'number' ? ` • ${Math.round((s.confidence||0)*100)}%` : ''}{Array.isArray(s.tags) && s.tags.length ? ` • ${s.tags.join(', ')}` : ''}
                    </div>
                    <pre className="whitespace-pre-wrap text-sm">{s.reply}</pre>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => { setReplyText(s.reply); setAiOpen(false); }}>
                        {t('conversation.use')}
                      </Button>
                    </div>
                    {s.rationale && (
                      <details className="text-xs text-muted-foreground mt-2">
                        <summary>{t('conversation.whyThis')}</summary>
                        <p>{s.rationale}</p>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Customer Info Sidebar - Collapsible */}
        <div className={`hidden lg:block border-l border-border bg-card overflow-y-auto transition-all duration-300 ${
          sidebarCollapsed ? 'w-12' : 'w-80'
        }`}>
          <div className="p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full justify-center mb-4"
            >
              {sidebarCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
            
            {!sidebarCollapsed && (
              <div className="px-2 space-y-6">
                {/* Customer Details */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">{t('conversation.customerDetails')}</h3>
                  
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>{conversation.customer?.full_name?.[0] || 'C'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-medium text-foreground">{conversation.customer?.full_name || t('conversation.unknownCustomer')}</h4>
                      <p className="text-sm text-muted-foreground">{conversation.customer?.email}</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('conversation.customerSince')}</span>
                      <span className="text-foreground">
                        {conversation.customer?.created_at ? dateTime(conversation.customer.created_at, false) : t('conversation.unknown')}
                      </span>
                    </div>
                  </div>
                  
                  <Button variant="outline" size="sm" className="w-full text-xs h-8">
                    <span className="truncate">{t('conversation.viewFullProfile')}</span>
                  </Button>
                </div>

                {/* Customer Notes */}
                <CustomerNotes customerId={conversation.customer?.id} />

                {/* Previous Conversations */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">{t('conversation.previousConversations')}</h3>
                  <div className="text-sm text-muted-foreground text-center py-4">
                    {t('conversation.noPreviousConversations')}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">{t('conversation.quickActions')}</h3>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8 px-3">
                      <Star className="h-3 w-3 mr-2 flex-shrink-0" />
                      <span className="truncate">{t('conversation.markAsPriority')}</span>
                    </Button>
                    {conversation.is_archived ? (
                      <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8 px-3" onClick={handleUnarchive}>
                        <ArchiveRestore className="h-3 w-3 mr-2 flex-shrink-0" />
                        <span className="truncate">{t('conversation.unarchiveConversation')}</span>
                      </Button>
                    ) : (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8 px-3">
                            <Archive className="h-3 w-3 mr-2 flex-shrink-0" />
                            <span className="truncate">{t('conversation.archiveConversation')}</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('conversation.archiveDialogTitle')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('conversation.archiveDialogDescription')}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={handleArchive}>{t('conversation.archive')}</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8 px-3" onClick={() => setSnoozeDialogOpen(true)}>
                      <Clock className="h-3 w-3 mr-2 flex-shrink-0" />
                      <span className="truncate">{t('conversation.snoozeForLater')}</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Snooze Dialog */}
      <Dialog open={snoozeDialogOpen} onOpenChange={setSnoozeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('conversation.snoozeDialogTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setPresetSnooze(new Date(Date.now() + 3 * 60 * 60 * 1000))}>{t('conversation.laterToday')}</Button>
              <Button variant="outline" onClick={() => {
                const t = new Date();
                t.setDate(t.getDate() + 1);
                t.setHours(9, 0, 0, 0);
                setPresetSnooze(t);
              }}>{t('conversation.tomorrowMorning')}</Button>
              <Button variant="outline" onClick={() => {
                const d = new Date();
                const day = d.getDay();
                const diff = (8 - day) % 7 || 7; // days until next Monday
                const nextMon = new Date(d);
                nextMon.setDate(d.getDate() + diff);
                nextMon.setHours(9, 0, 0, 0);
                setPresetSnooze(nextMon);
              }}>{t('conversation.nextMondayMorning')}</Button>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">{t('conversation.pickDateTime')}</div>
              <div className="flex items-center gap-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[200px] justify-start">
                      {snoozeDate ? format(snoozeDate, 'PPP') : t('conversation.selectDate')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={snoozeDate}
                      onSelect={setSnoozeDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <Input type="time" value={snoozeTime} onChange={(e) => setSnoozeTime(e.target.value)} className="w-[120px]" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSnoozeDialogOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleConfirmSnooze}>{t('conversation.confirm')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('conversation.deleteMessage')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('conversation.deleteMessageConfirmation')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
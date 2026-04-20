import { useRef, useEffect, useState, useCallback } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDateFormatting } from '@/hooks/useDateFormatting';
import type { NormalizedMessage } from '@/lib/normalizeMessage';
import { useQueryClient } from '@tanstack/react-query';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Copy, Trash2, Check, CheckCheck, Paperclip, Image, Mail, AlertCircle, RefreshCw, Loader2, Lock, Edit3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { EmailRender } from '@/components/ui/email-render';
import { MentionRenderer } from '@/components/ui/mention-renderer';
import { toast } from 'sonner';
import { InlineNoteEditor } from './InlineNoteEditor';
import { useNoteMutations } from '@/hooks/useNoteMutations';
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

interface ChatMessagesListProps {
  messages: NormalizedMessage[];
  customerName?: string;
  customerEmail?: string;
  customerTyping?: boolean; // Renamed from agentTyping for clarity
  conversationId?: string;
}

export const ChatMessagesList = ({ 
  messages, 
  customerName, 
  customerEmail,
  customerTyping = false,
  conversationId
}: ChatMessagesListProps) => {
  const { relative: formatRelative } = useDateFormatting();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { canEditNote, deleteNote } = useNoteMutations();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, customerTyping]);

  // Poll for new messages every 2 seconds during live chat
  useEffect(() => {
    if (!conversationId) return;
    
    const interval = setInterval(() => {
      // Invalidate message queries to trigger refetch
      queryClient.invalidateQueries({ 
        queryKey: ['thread-messages', conversationId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['messages', conversationId] 
      });
    }, 2000);
    
    return () => clearInterval(interval);
  }, [conversationId, queryClient]);

  // Sort messages by date (oldest first for chat view)
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return '?';
  };

  const handleCopyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Message copied');
  }, []);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);
      if (error) throw error;
      toast.success('Message deleted');
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['thread-messages'] });
    } catch (error) {
      console.error('Failed to delete message:', error);
      toast.error('Failed to delete message');
    }
  }, [conversationId, queryClient]);

  const handleResendEmail = useCallback(async (messageId: string) => {
    try {
      const { error } = await supabase.functions.invoke('send-reply-email', {
        body: { messageId }
      });
      if (error) throw error;
      toast.success('Email sent successfully');
    } catch (error) {
      toast.error('Failed to send email');
    }
  }, []);

  // Render attachments
  const renderAttachments = (attachments: any[] | null | undefined) => {
    if (!attachments || attachments.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {attachments.map((attachment, index) => {
          const isImage = attachment.type?.startsWith('image/');
          
          if (isImage) {
            return (
              <a 
                key={index}
                href={attachment.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block"
              >
                <img 
                  src={attachment.url} 
                  alt={attachment.name || 'Attachment'}
                  className="max-w-[200px] max-h-[150px] rounded-lg object-cover border"
                />
              </a>
            );
          }
          
          return (
            <a
              key={index}
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
            >
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm truncate max-w-[150px]">
                {attachment.name || 'Download file'}
              </span>
            </a>
          );
        })}
      </div>
    );
  };

  return (
    <ScrollArea className="flex-1" ref={scrollAreaRef}>
      <div className="flex flex-col gap-4 p-4">
        {sortedMessages.length === 0 && (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            No messages yet
          </div>
        )}
        
        {sortedMessages.map((message) => {
          const isAgent = message.authorType === 'agent';
          const isSystem = message.authorType === 'system';
          const isInternal = message.isInternalNote;
          const senderName = message.from?.name || message.from?.email;
          const attachments = (message as any).attachments;
          
          if (isSystem) {
            return (
              <div key={message.id} className="flex justify-center py-2">
                <div className="bg-muted/50 text-muted-foreground text-xs px-4 py-2 rounded-full">
                  {message.visibleBody}
                </div>
              </div>
            );
          }
          
          return (
            <div 
              key={message.id}
              className={cn(
                "flex gap-3 max-w-[85%] group",
                isAgent ? "self-end flex-row-reverse" : "self-start"
              )}
            >
              {/* Avatar */}
              <Avatar className={cn(
                "h-8 w-8 shrink-0",
                isAgent ? "ring-2 ring-primary/20" : "ring-2 ring-muted"
              )}>
                <AvatarFallback className={cn(
                  "text-xs font-medium",
                  isAgent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {isAgent 
                    ? getInitials(senderName) 
                    : getInitials(customerName, customerEmail)
                  }
                </AvatarFallback>
              </Avatar>
              
              {/* Message content */}
              <div className={cn(
                "flex flex-col relative",
                isAgent ? "items-end" : "items-start"
              )}>
                {/* Sender name / internal note label */}
                {isInternal ? (
                  <span className="text-xs text-yellow-700 mb-1 px-1 flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Internal note
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground mb-1 px-1">
                    {isAgent ? senderName || 'Agent' : customerName || customerEmail || 'Customer'}
                  </span>
                )}
                
                {/* Message bubble with action menu */}
                <div className="relative">
                  {/* Action menu - visible on hover */}
                  <div className={cn(
                    "absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity z-10",
                    isAgent ? "-left-8" : "-right-8"
                  )}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 bg-background shadow-sm border">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align={isAgent ? "end" : "start"}>
                        <DropdownMenuItem onClick={() => handleCopyMessage(message.visibleBody)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </DropdownMenuItem>
                        {/* Edit + Delete for internal notes (author or admin) */}
                        {isInternal && canEditNote({
                          is_internal: true,
                          sender_id: message.originalMessage?.sender_id,
                        }) && (
                          <>
                            <DropdownMenuItem onClick={() => setEditingNoteId(message.id)}>
                              <Edit3 className="h-4 w-4 mr-2" />
                              Edit note
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setConfirmDeleteId(message.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete note
                            </DropdownMenuItem>
                          </>
                        )}
                        {isAgent && !isInternal && (
                          <DropdownMenuItem onClick={() => handleResendEmail(message.id)}>
                            <Mail className="h-4 w-4 mr-2" />
                            Resend Email
                          </DropdownMenuItem>
                        )}
                        {isAgent && !isInternal && (message.emailStatus === 'failed' || message.emailStatus === 'retry') && (
                          <DropdownMenuItem 
                            onClick={() => handleDeleteMessage(message.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  {/* Message bubble */}
                  <div className={cn(
                    "px-4 py-3 rounded-2xl text-sm leading-relaxed break-words chat-bubble-content overflow-hidden max-w-[280px] md:max-w-md [&_img]:max-w-full [&_img]:h-auto [&_table]:max-w-full",
                    isInternal
                      ? "bg-yellow-50 text-foreground border border-yellow-200 rounded-br-md"
                      : isAgent 
                        ? "bg-primary text-primary-foreground rounded-br-md" 
                        : "bg-muted text-foreground rounded-bl-md"
                  )}>
                    {isInternal ? (
                      editingNoteId === message.id ? (
                        <InlineNoteEditor
                          messageId={message.id}
                          initialContent={message.originalMessage?.content || message.visibleBody}
                          conversationId={conversationId}
                          context={{
                            type: 'internal_note',
                            conversation_id: conversationId,
                            message_id: message.id,
                          }}
                          onCancel={() => setEditingNoteId(null)}
                          compact
                        />
                      ) : (
                        <>
                          <MentionRenderer content={message.visibleBody} className="text-sm" />
                          {message.originalMessage?.updated_at &&
                            message.originalMessage?.created_at &&
                            new Date(message.originalMessage.updated_at).getTime() -
                              new Date(message.originalMessage.created_at).getTime() >
                              2000 && (
                              <span className="ml-2 text-[10px] text-muted-foreground italic">(edited)</span>
                            )}
                        </>
                      )
                    ) : (
                      <EmailRender
                        content={message.visibleBody}
                        contentType={message.originalMessage?.content_type || 'text/plain'}
                        attachments={attachments}
                        messageId={message.id}
                      />
                    )}
                  </div>
                </div>
                
                {/* Timestamp + delivery status */}
                <div className="flex items-center gap-1 mt-1 px-1">
                  <span className="text-xs text-muted-foreground">
                    {formatRelative(new Date(message.createdAt))}
                  </span>
                  {isAgent && !isInternal && (!message.emailStatus || message.emailStatus === 'sent') && (
                    <CheckCheck className="h-3 w-3 text-primary" />
                  )}
                </div>
                {/* Sending indicator */}
                {isAgent && message.emailStatus === 'sending' && (
                  <div className="flex items-center gap-1.5 mt-1 px-1">
                    <Loader2 className="h-3 w-3 text-muted-foreground animate-spin" />
                    <span className="text-xs text-muted-foreground">Sending email...</span>
                  </div>
                )}
                {/* Inline resend for failed/pending emails */}
                {isAgent && (message.emailStatus === 'failed' || message.emailStatus === 'retry') && (
                  <div className="flex items-center gap-1.5 mt-1 px-1">
                    <AlertCircle className="h-3 w-3 text-destructive" />
                    <span className="text-xs text-destructive font-medium">Email not sent</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-5 text-[10px] px-2 py-0 gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => handleResendEmail(message.id)}
                    >
                      <RefreshCw className="h-2.5 w-2.5" />
                      Resend
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {/* Typing indicator - shows when customer is typing */}
        {customerTyping && (
          <div className="flex gap-3 max-w-[85%] self-start">
            <Avatar className="h-8 w-8 shrink-0 ring-2 ring-muted">
              <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                {getInitials(customerName, customerEmail)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start">
              <span className="text-xs text-muted-foreground mb-1 px-1">
                {customerName || 'Customer'}
              </span>
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this internal note?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The note will be removed for everyone in the conversation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (confirmDeleteId) {
                  await deleteNote(confirmDeleteId, conversationId);
                }
                setConfirmDeleteId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ScrollArea>
  );
};
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
import { MoreHorizontal, Copy, Trash2, Check, CheckCheck, Paperclip, Image } from 'lucide-react';
import { toast } from 'sonner';

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

  const handleDeleteMessage = useCallback((messageId: string) => {
    // TODO: Implement delete functionality
    toast.info('Delete functionality coming soon');
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
                {/* Sender name */}
                <span className="text-xs text-muted-foreground mb-1 px-1">
                  {isAgent ? senderName || 'Agent' : customerName || customerEmail || 'Customer'}
                </span>
                
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
                        <DropdownMenuItem 
                          onClick={() => handleDeleteMessage(message.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  {/* Message bubble */}
                  <div className={cn(
                    "px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words",
                    isAgent 
                      ? "bg-primary text-primary-foreground rounded-br-md" 
                      : "bg-muted text-foreground rounded-bl-md"
                  )}>
                    {message.visibleBody}
                    {renderAttachments(attachments)}
                  </div>
                </div>
                
                {/* Timestamp + delivery status */}
                <div className="flex items-center gap-1 mt-1 px-1">
                  <span className="text-xs text-muted-foreground">
                    {formatRelative(new Date(message.createdAt))}
                  </span>
                  {isAgent && (
                    <CheckCheck className="h-3 w-3 text-primary" />
                  )}
                </div>
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
    </ScrollArea>
  );
};
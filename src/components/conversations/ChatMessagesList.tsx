import { useRef, useEffect } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useDateFormatting } from '@/hooks/useDateFormatting';
import type { NormalizedMessage } from '@/lib/normalizeMessage';
import { useQueryClient } from '@tanstack/react-query';

interface ChatMessagesListProps {
  messages: NormalizedMessage[];
  customerName?: string;
  customerEmail?: string;
  agentTyping?: boolean;
  conversationId?: string; // Add conversationId for polling
}

export const ChatMessagesList = ({ 
  messages, 
  customerName, 
  customerEmail,
  agentTyping = false,
  conversationId
}: ChatMessagesListProps) => {
  const { relative: formatRelative } = useDateFormatting();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, agentTyping]);

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
                "flex gap-3 max-w-[85%]",
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
                "flex flex-col",
                isAgent ? "items-end" : "items-start"
              )}>
                {/* Sender name */}
                <span className="text-xs text-muted-foreground mb-1 px-1">
                  {isAgent ? senderName || 'Agent' : customerName || customerEmail || 'Customer'}
                </span>
                
                {/* Message bubble */}
                <div className={cn(
                  "px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words",
                  isAgent 
                    ? "bg-primary text-primary-foreground rounded-br-md" 
                    : "bg-muted text-foreground rounded-bl-md"
                )}>
                  {message.visibleBody}
                </div>
                
                {/* Timestamp */}
                <span className="text-xs text-muted-foreground mt-1 px-1">
                  {formatRelative(new Date(message.createdAt))}
                </span>
              </div>
            </div>
          );
        })}
        
        {/* Typing indicator */}
        {agentTyping && (
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

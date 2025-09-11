import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageSquare, ChevronUp, ChevronDown } from "lucide-react";
import { MessageCard } from "./MessageCard";
import { useConversationMessagesList } from "@/hooks/conversations/useConversationMessages";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface ProgressiveMessagesListProps {
  conversationId: string;
  conversation: any;
  onEditMessage?: (messageId: string, content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
}

export const ProgressiveMessagesList = ({ 
  conversationId, 
  conversation, 
  onEditMessage, 
  onDeleteMessage 
}: ProgressiveMessagesListProps) => {
  const { t } = useTranslation();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  const [isNearTop, setIsNearTop] = useState(false);
  const [allCollapsed, setAllCollapsed] = useState(true);
  
  const {
    messages,
    totalNormalizedEstimated,
    normalizedCountLoaded,
    confidence,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading,
    error
  } = useConversationMessagesList(conversationId);

  // Auto-scroll to bottom when messages change (for new messages)
  useEffect(() => {
    if (shouldScrollToBottom && scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        setTimeout(() => {
          scrollElement.scrollTo({
            top: scrollElement.scrollHeight,
            behavior: 'smooth'
          });
        }, 100);
        setShouldScrollToBottom(false);
      }
    }
  }, [messages.length, shouldScrollToBottom]);

  // Handle scroll to detect when user is near top
  const handleScroll = useCallback((event: Event) => {
    const scrollElement = event.target as HTMLElement;
    const { scrollTop, scrollHeight, clientHeight } = scrollElement;
    
    // Check if we're near the top (within 100px)
    const nearTop = scrollTop < 100;
    setIsNearTop(nearTop);
    
    // Auto-load more when scrolling to top
    if (nearTop && hasNextPage && !isFetchingNextPage) {
      const currentScrollHeight = scrollHeight;
      
      fetchNextPage().then(() => {
        // Maintain scroll position after loading older messages
        setTimeout(() => {
          const newScrollHeight = scrollElement.scrollHeight;
          const scrollDiff = newScrollHeight - currentScrollHeight;
          scrollElement.scrollTop = scrollTop + scrollDiff;
        }, 50);
      });
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Attach scroll listener
  useEffect(() => {
    const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll);
      return () => scrollElement.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const handleLoadOlderMessages = () => {
    if (hasNextPage && !isFetchingNextPage) {
      const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
      const currentScrollHeight = scrollElement?.scrollHeight || 0;
      
      fetchNextPage().then(() => {
        // Maintain scroll position after loading
        setTimeout(() => {
          if (scrollElement) {
            const newScrollHeight = scrollElement.scrollHeight;
            const scrollDiff = newScrollHeight - currentScrollHeight;
            scrollElement.scrollTop = scrollElement.scrollTop + scrollDiff;
          }
        }, 50);
      });
    }
  };

  const scrollToBottom = () => {
    const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollElement) {
      scrollElement.scrollTo({
        top: scrollElement.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  // Calculate remaining count with proper confidence-based logic
  const visibleCount = normalizedCountLoaded;
  const remaining = confidence === 'high' && totalNormalizedEstimated > visibleCount
    ? Math.max(totalNormalizedEstimated - visibleCount, 0)
    : null;
  
  const loadOlderLabel = remaining === null || remaining > 500 || confidence === 'low'
    ? 'Load older messages'
    : `Load older messages (${remaining} remaining)`;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <p className="text-lg mb-2">Error loading messages</p>
          <p className="text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 relative">
      <ScrollArea className="h-full" ref={scrollAreaRef}>
        <div className="p-4 space-y-4">
          {/* Expand/Collapse All Controls */}
          {messages.length > 0 && (
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <div className="text-sm text-muted-foreground">
                {messages.length} message{messages.length > 1 ? 's' : ''}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAllCollapsed(false)}
                  className="text-xs"
                >
                  <ChevronDown className="w-3 h-3 mr-1" />
                  Expand all
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAllCollapsed(true)}
                  className="text-xs"
                >
                  <ChevronUp className="w-3 h-3 mr-1" />
                  Collapse all
                </Button>
              </div>
            </div>
          )}

          {/* Load older messages button */}
          {(hasNextPage || isFetchingNextPage) && (
            <div className="text-center pb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadOlderMessages}
                disabled={isFetchingNextPage}
                className="text-xs"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                    Loading older messages...
                  </>
                ) : (
                  loadOlderLabel
                )}
              </Button>
            </div>
          )}
          
          {/* Messages list - Cards in DESC order (newest first) */}
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{t('conversation.noMessages')}</p>
            </div>
          ) : (
            messages.map((message) => (
              <MessageCard
                key={message.dedupKey || message.id}
                message={message}
                conversation={conversation}
                defaultCollapsed={allCollapsed}
                onEdit={onEditMessage}
                onDelete={onDeleteMessage}
              />
            ))
          )}
        </div>
      </ScrollArea>
      
      {/* Scroll to bottom button */}
      {!isNearTop && messages.length > 3 && (
        <div className="absolute bottom-4 right-4 z-10">
          <Button
            variant="secondary"
            size="sm"
            onClick={scrollToBottom}
            className="rounded-full shadow-lg"
          >
            <ChevronUp className="w-4 h-4 mr-1 rotate-180" />
            Newest
          </Button>
        </div>
      )}
    </div>
  );
};
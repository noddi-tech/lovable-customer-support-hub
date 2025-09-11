import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageSquare, ChevronUp } from "lucide-react";
import { MessageItem } from "./MessageItem";
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
  
  const {
    messages,
    totalCount,
    normalizedCount,
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
                ) : (() => {
                  const remaining = Math.max(totalCount - messages.length, 0);
                  
                  // Show no count if confidence is low or remaining is too high
                  if (confidence === 'low' || remaining > 500) {
                    return 'Load older messages';
                  }
                  
                  // Show count for reasonable numbers
                  return remaining > 0 
                    ? `Load older messages (${remaining} remaining)`
                    : 'Load older messages';
                })()}
              </Button>
            </div>
          )}
          
          {/* Messages list */}
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{t('conversation.noMessages')}</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <MessageItem
                key={message.id}
                message={message}
                conversation={conversation}
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
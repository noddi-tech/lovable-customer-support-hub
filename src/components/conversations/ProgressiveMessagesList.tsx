import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageSquare, ChevronUp, ChevronDown } from "lucide-react";
import { MessageCard } from "./MessageCard";
import { useThreadMessagesList } from "@/hooks/conversations/useThreadMessagesList";
import { createNormalizationContext } from "@/lib/normalizeMessage";
import { useAuth } from "@/hooks/useAuth";
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
  const { user } = useAuth();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  const [isNearTop, setIsNearTop] = useState(false);
  const [allCollapsed, setAllCollapsed] = useState(true);
  
  // Create conversation-specific normalization context
  const normalizationCtx = useMemo(() => createNormalizationContext({
    currentUserEmail: user?.email,
    agentDomains: ['noddi.no'],        // quick win so agents resolve
    agentEmails: [],                   // keep empty or fill from org if available
    conversationCustomerEmail: conversation?.customer?.email,
    conversationCustomerName: conversation?.customer?.full_name,
  }), [user?.email, conversation?.customer?.email, conversation?.customer?.full_name]);
  
  const {
    messages,
    totalCount,
    loadedCount,
    remaining,
    confidence,
    estimatedNormalized,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading,
    error
  } = useThreadMessagesList(conversationId, normalizationCtx);

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

  // Calculate remaining count with confidence check
  const loadOlderLabel = remaining > 0 && confidence === 'high'
    ? `Load older messages (${remaining} remaining)`
    : 'Load older messages';

  // Debug probe visibility
  const isProbeMode = import.meta.env.VITE_UI_PROBE === '1';

  // Force load function for debug probe
  const handleForceLoad = () => {
    console.debug('[ProgressiveMessagesList] Force load triggered', {
      conversationId,
      hasNextPage,
      isFetchingNextPage,
      totalCount,
      loadedCount,
      remaining,
      confidence,
      estimatedNormalized
    });
    fetchNextPage();
  };

  const oldestLoadedAt = messages.length > 0 
    ? messages[messages.length - 1].createdAt 
    : null;

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
      {/* Debug Header - Only visible when VITE_UI_PROBE=1 */}
      {isProbeMode && (
        <div className="bg-orange-100 border-l-4 border-orange-500 p-3 text-xs font-mono">
          <div className="font-bold text-orange-800 mb-2">🔍 DEBUG PROBE - Conversation Threading</div>
          <div className="space-y-1 text-orange-700">
            <div><span className="font-semibold">Conversation ID:</span> {conversationId}</div>
            <div><span className="font-semibold">Pages Loaded:</span> {messages.length > 0 ? '1+' : '0'} | Has Next: {hasNextPage ? 'YES' : 'NO'}</div>
            <div><span className="font-semibold">DB Total:</span> {totalCount} | Loaded: {loadedCount} | Estimated: {estimatedNormalized}</div>
            <div><span className="font-semibold">Remaining:</span> {remaining} | Confidence: {confidence}</div>
            <div><span className="font-semibold">Oldest Cursor:</span> {oldestLoadedAt ? new Date(oldestLoadedAt).toLocaleTimeString() : 'none'}</div>
            <button 
              onClick={handleForceLoad}
              disabled={!hasNextPage || isFetchingNextPage}
              className="mt-2 px-2 py-1 bg-orange-200 hover:bg-orange-300 rounded text-xs disabled:opacity-50"
            >
              🚀 Force Load Older {isFetchingNextPage ? '(Loading...)' : ''}
            </button>
          </div>
        </div>
      )}
      
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
                onClick={() => fetchNextPage()}
                disabled={!hasNextPage || isFetchingNextPage}
                className="text-xs"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  hasNextPage && remaining > 0 ? `Load older messages (${remaining} remaining)` : 'Load older messages'
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
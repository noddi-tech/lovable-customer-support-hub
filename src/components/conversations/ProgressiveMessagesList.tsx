import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageSquare, ChevronUp, ChevronDown, ChevronsDown, ChevronsUp } from "lucide-react";
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
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [collapsedMessageIds, setCollapsedMessageIds] = useState<Set<string>>(new Set());
  const [allCollapsed, setAllCollapsed] = useState(false);
  
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

  // Initialize collapsed state - collapse all messages except the LAST one (newest)
  useEffect(() => {
    const idsToCollapse = new Set<string>();
    messages.forEach((msg, index) => {
      // Collapse all except the first message (which is newest in DESC order)
      if (index > 0) {
        idsToCollapse.add(msg.dedupKey || msg.id);
      }
    });
    setCollapsedMessageIds(idsToCollapse);
  }, [messages.map(m => m.dedupKey || m.id).join(',')]);

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
    
    // Show "jump to latest" if scrolled up more than 200px from bottom
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setShowJumpToLatest(distanceFromBottom > 200);
    
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

  // Toggle all messages collapsed/expanded
  const toggleAllMessages = () => {
    if (allCollapsed) {
      setCollapsedMessageIds(new Set());
      setAllCollapsed(false);
    } else {
      const allIds = new Set(messages.map(m => m.dedupKey || m.id));
      setCollapsedMessageIds(allIds);
      setAllCollapsed(true);
    }
  };

  return (
    <div className="flex-1 min-h-0 relative">
      {/* Floating action buttons for message management */}
      <div className="absolute top-4 right-6 z-10 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleAllMessages}
          className="shadow-md bg-card hover:bg-accent transition-all duration-200"
          title={allCollapsed ? "Expand all messages" : "Collapse all messages"}
        >
          {allCollapsed ? (
            <>
              <ChevronsDown className="h-4 w-4 mr-2" />
              <span className="text-xs">Expand All</span>
            </>
          ) : (
            <>
              <ChevronsUp className="h-4 w-4 mr-2" />
              <span className="text-xs">Collapse All</span>
            </>
          )}
        </Button>
      </div>

      {/* Sticky "Jump to Latest" Button */}
      {showJumpToLatest && (
        <div className="fixed bottom-8 right-8 z-20">
          <Button
            onClick={scrollToBottom}
            className="shadow-lg hover:shadow-xl transition-all duration-200 rounded-full h-12 px-6"
            size="default"
          >
            <ChevronDown className="h-4 w-4 mr-2" />
            Jump to latest
          </Button>
        </div>
      )}

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
        <div className="w-full max-w-6xl mx-auto px-8 py-8 space-y-6">

          {/* Messages list - Cards in ASC order (oldest first, natural email reading) */}
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{t('conversation.noMessages')}</p>
            </div>
          ) : (
              // Reverse to show oldest first (ASC)
              [...messages].reverse().map((message, index) => {
                const actualIndex = messages.length - 1 - index; // Get actual index in original array
                return (
                  <MessageCard
                    key={message.dedupKey || message.id}
                    message={message}
                    conversation={conversation}
                    isFirstInThread={index === 0}  // First in chronological order (oldest)
                    defaultCollapsed={collapsedMessageIds.has(message.dedupKey || message.id)}
                    onEdit={onEditMessage}
                    onDelete={onDeleteMessage}
                  />
                );
              })
          )}
          
          {/* Load older messages button at BOTTOM with improved styling */}
          {(hasNextPage || isFetchingNextPage) && (
            <div className="text-center pt-6 pb-2">
              <Button
                variant="outline"
                size="default"
                onClick={() => fetchNextPage()}
                disabled={!hasNextPage || isFetchingNextPage}
                className="shadow-sm hover:shadow-md transition-all duration-200"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span>Loading older messages...</span>
                  </>
                ) : (
                  <>
                    <ChevronUp className="w-4 h-4 mr-2" />
                    <span>{hasNextPage && remaining > 0 ? `Load ${remaining} older messages` : 'Load older messages'}</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
      
    </div>
  );
};
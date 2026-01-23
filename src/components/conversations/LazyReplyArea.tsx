import { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Reply, StickyNote } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useConversationView } from "@/contexts/ConversationViewContext";

// Preload function - starts downloading the chunk without waiting
const preloadReplyArea = () => import('@/components/dashboard/conversation-view/ReplyArea');

// Lazy load the actual reply component
const ReplyArea = lazy(() => preloadReplyArea().then(module => ({ default: module.ReplyArea })));

interface LazyReplyAreaProps {
  conversationId: string;
  onReply?: (content: string, isInternal: boolean) => Promise<void>;
}

const ReplyAreaSkeleton = () => (
  <div className="p-4 border-t border-border space-y-3">
    <div className="flex items-center space-x-2">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-4 rounded-full" />
    </div>
    <Skeleton className="h-32 w-full" />
    <div className="flex justify-between">
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-8 w-16" />
    </div>
  </div>
);

export const LazyReplyArea = ({ conversationId, onReply }: LazyReplyAreaProps) => {
  const { t } = useTranslation();
  const { dispatch, state } = useConversationView();
  const [showReplyArea, setShowReplyArea] = useState(false);

  // Preload the ReplyArea chunk when conversation opens
  useEffect(() => {
    preloadReplyArea();
  }, []);

  // Sync local state with context state (for collapse after send)
  useEffect(() => {
    if (!state.showReplyArea && showReplyArea) {
      setShowReplyArea(false);
    }
  }, [state.showReplyArea, showReplyArea]);

  // Keyboard shortcuts for Reply (R) and Note (N)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      // Don't trigger if reply area is already open
      if (showReplyArea) return;
      
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleShowReply();
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        handleShowNote();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showReplyArea]);

  const handleShowReply = useCallback(() => {
    // Set both local state (for lazy loading) and context state (for reply functionality)
    setShowReplyArea(true);
    dispatch({ type: 'SET_SHOW_REPLY_AREA', payload: true });
    dispatch({ type: 'SET_IS_INTERNAL_NOTE', payload: false });
  }, [dispatch]);

  const handleShowNote = useCallback(() => {
    // Set both local state (for lazy loading) and context state (for note functionality)
    setShowReplyArea(true);
    dispatch({ type: 'SET_SHOW_REPLY_AREA', payload: true });
    dispatch({ type: 'SET_IS_INTERNAL_NOTE', payload: true });
  }, [dispatch]);

  if (!showReplyArea) {
    return (
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Button
            onClick={handleShowReply}
            onMouseEnter={preloadReplyArea}
            className="flex-1"
            variant="default"
          >
            <Reply className="w-4 h-4 mr-2" />
            {t('conversation.reply')}
            <kbd className="ml-2 px-1.5 py-0.5 text-[10px] bg-primary-foreground/20 rounded hidden sm:inline">R</kbd>
          </Button>
          <Button
            onClick={handleShowNote}
            onMouseEnter={preloadReplyArea}
            className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white"
            variant="default"
          >
            <StickyNote className="w-4 h-4 mr-2" />
            {t('conversation.note') || 'Note'}
            <kbd className="ml-2 px-1.5 py-0.5 text-[10px] bg-yellow-600/30 rounded hidden sm:inline">N</kbd>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<ReplyAreaSkeleton />}>
      <ReplyArea />
    </Suspense>
  );
};

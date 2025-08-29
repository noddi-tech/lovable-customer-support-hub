import { lazy, Suspense, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Reply } from "lucide-react";
import { useTranslation } from "react-i18next";

// Lazy load the actual reply component
const ReplyArea = lazy(() => import('@/components/dashboard/conversation-view/ReplyArea').then(module => ({ default: module.ReplyArea })));

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
  const [showReplyArea, setShowReplyArea] = useState(false);

  if (!showReplyArea) {
    return (
      <div className="p-4 border-t border-border">
        <Button
          onClick={() => setShowReplyArea(true)}
          className="w-full"
          variant="default"
        >
          <Reply className="w-4 h-4 mr-2" />
          {t('conversation.reply')}
        </Button>
      </div>
    );
  }

  return (
    <Suspense fallback={<ReplyAreaSkeleton />}>
      <ReplyArea />
    </Suspense>
  );
};
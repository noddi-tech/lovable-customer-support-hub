import { Reply, StickyNote } from "lucide-react"
import { lazy, Suspense, useCallback, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useConversationView } from "@/contexts/ConversationViewContext"
import { useIsMobile } from "@/hooks/use-responsive"
import { cn } from "@/lib/utils"

// Preload function - starts downloading the chunk without waiting
const preloadReplyArea = () => import("@/components/dashboard/conversation-view/ReplyArea")

// Lazy load the actual reply component
const ReplyArea = lazy(() => preloadReplyArea().then((module) => ({ default: module.ReplyArea })))

interface LazyReplyAreaProps {
  conversationId: string
  onReply?: (content: string, isInternal: boolean) => Promise<void>
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
)

export const LazyReplyArea = (_props: LazyReplyAreaProps) => {
  const { t } = useTranslation()
  const { dispatch, state } = useConversationView()
  const isMobile = useIsMobile()
  const showReplyArea = state.showReplyArea

  // Preload the ReplyArea chunk when conversation opens
  useEffect(() => {
    void preloadReplyArea()
  }, [])

  // Mode is decided only here — not when collapsing the composer.
  const handleShowReply = useCallback(() => {
    dispatch({ type: "SET_SHOW_REPLY_AREA", payload: true })
    dispatch({ type: "SET_IS_INTERNAL_NOTE", payload: false })
  }, [dispatch])

  const handleShowNote = useCallback(() => {
    dispatch({ type: "SET_SHOW_REPLY_AREA", payload: true })
    dispatch({ type: "SET_IS_INTERNAL_NOTE", payload: true })
  }, [dispatch])

  // Keyboard shortcuts for Reply (R) and Note (N)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (showReplyArea) return

      if (e.key === "r" || e.key === "R") {
        e.preventDefault()
        handleShowReply()
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault()
        handleShowNote()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [showReplyArea, handleShowReply, handleShowNote])

  if (!showReplyArea) {
    return (
      <div
        className={cn(
          "p-3 border-t border-border",
          isMobile && "sticky bottom-0 bg-background z-10 p-2",
        )}
      >
        <div className="flex gap-2">
          <Button
            onClick={handleShowReply}
            onMouseEnter={preloadReplyArea}
            className="flex-1"
            variant="default"
            size={isMobile ? "sm" : "default"}
          >
            <Reply className="w-4 h-4 mr-2" />
            {t("conversation.reply")}
            {!isMobile && (
              <kbd className="ml-2 px-1.5 py-0.5 text-[10px] bg-primary-foreground/20 rounded hidden sm:inline">
                R
              </kbd>
            )}
          </Button>
          <Button
            onClick={handleShowNote}
            onMouseEnter={preloadReplyArea}
            className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white"
            variant="default"
            size={isMobile ? "sm" : "default"}
          >
            <StickyNote className="w-4 h-4 mr-2" />
            {t("conversation.internalNote")}
            {!isMobile && (
              <kbd className="ml-2 px-1.5 py-0.5 text-[10px] bg-yellow-600/30 rounded hidden sm:inline">
                N
              </kbd>
            )}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Suspense fallback={<ReplyAreaSkeleton />}>
      <ReplyArea />
    </Suspense>
  )
}

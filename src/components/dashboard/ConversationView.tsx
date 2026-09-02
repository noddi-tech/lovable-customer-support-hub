import { useQueryClient } from "@tanstack/react-query"
import { Loader2, MessageSquare } from "lucide-react"
import type React from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { ConversationViewProvider } from "@/contexts/ConversationViewContext"
import { useConversationMeta } from "@/hooks/conversations/useConversationMeta"
import { useIsMobile } from "@/hooks/use-responsive"
import { useAuth } from "@/hooks/useAuth"
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"
import { canGoBackInApp, getConversationBackPath } from "@/utils/conversationNavigation"
import { ConversationViewContent } from "./conversation-view/ConversationViewContent"

interface ConversationViewProps {
  conversationId: string | null
  conversationIds?: string | string[]
  showSidePanel?: boolean
}

export const ConversationView: React.FC<ConversationViewProps> = ({
  conversationId,
  conversationIds,
  showSidePanel = true,
}) => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isMobile = useIsMobile()

  // Use optimized hooks for fast loading
  const {
    data: conversation,
    isLoading: conversationLoading,
    error: conversationError,
  } = useConversationMeta(conversationId)

  // Keyboard shortcuts - Phase 3
  useKeyboardShortcuts([
    {
      key: "r",
      ctrl: true,
      action: () => {
        queryClient.invalidateQueries({ queryKey: ["conversation-messages", conversationId] })
        queryClient.invalidateQueries({ queryKey: ["conversation-meta", conversationId] })
        toast.success("Conversation refreshed")
      },
      description: "Refresh conversation",
    },
    {
      key: "Escape",
      action: () => {
        // Modal-awareness is now handled inside useKeyboardShortcuts itself
        if (canGoBackInApp()) {
          navigate(-1)
        } else {
          navigate(getConversationBackPath(window.location.pathname))
        }
      },
      description: "Back to inbox",
    },
  ])

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">{t("conversation.selectConversation")}</p>
          <p className="text-sm">{t("conversation.chooseFromList")}</p>
        </div>
      </div>
    )
  }

  if (conversationLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (conversationError || !conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <p className="text-lg mb-2">Error loading conversation</p>
          <p className="text-sm">{conversationError?.message || "Conversation not found"}</p>
        </div>
      </div>
    )
  }

  return (
    <ConversationViewProvider
      key={conversationId}
      conversationId={conversationId}
      conversationIds={conversationIds}
    >
      <ConversationViewContent
        conversationId={conversationId}
        conversation={conversation}
        showSidePanel={showSidePanel}
      />
    </ConversationViewProvider>
  )
}

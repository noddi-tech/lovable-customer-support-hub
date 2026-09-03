import { AlertCircle, ArrowLeft, CheckCircle2, CircleDot, Clock } from "lucide-react"
import type React from "react"
import { useMemo } from "react"
import { ChatReplyInput } from "@/components/conversations/ChatReplyInput"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DescribedSelectItem } from "@/components/ui/described-select-item"
import { Select, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useConversationView } from "@/contexts/ConversationViewContext"
import { useThreadMessagesList } from "@/hooks/conversations/useThreadMessagesList"
import { useAuth } from "@/hooks/useAuth"
import { useNoddihKundeData } from "@/hooks/useNoddihKundeData"
import { useVisitorOnlineStatus } from "@/hooks/useVisitorOnlineStatus"
import { useVisitorTyping } from "@/hooks/useVisitorTyping"
import { createNormalizationContext } from "@/lib/normalizeMessage"
import { CONVERSATION_STATUS_DESCRIPTIONS } from "@/lib/option-descriptions"
import { cn } from "@/lib/utils"
import { useNavigate } from "@/router/compat"
import { canGoBackInApp, getConversationBackPath } from "@/utils/conversationNavigation"
import { getCustomerDisplayWithNoddi, getCustomerInitial } from "@/utils/customerDisplayName"
import { MobileChatMessageList } from "./MobileChatMessageList"
import { MobileCustomerSummaryCard } from "./MobileCustomerSummaryCard"

interface MobileChatConversationViewProps {
  conversationId: string
  conversation: any
}

export const MobileChatConversationView: React.FC<MobileChatConversationViewProps> = ({
  conversationId,
  conversation,
}) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { conversationIds, updateStatus } = useConversationView()
  const { data: noddiData } = useNoddihKundeData(conversation.customer || null)
  const { isTyping: customerTyping } = useVisitorTyping(conversationId)
  const { data: onlineStatus } = useVisitorOnlineStatus(conversationId)

  const customerDisplay = useMemo(
    () =>
      getCustomerDisplayWithNoddi(
        noddiData,
        conversation.customer?.full_name,
        conversation.customer?.email,
      ),
    [noddiData, conversation.customer?.full_name, conversation.customer?.email],
  )

  const normCtx = useMemo(
    () =>
      createNormalizationContext({
        currentUserEmail: user?.email,
        agentDomains: ["noddi.no"],
        agentEmails: [],
        conversationCustomerEmail: conversation?.customer?.email,
        conversationCustomerName: conversation?.customer?.full_name,
      }),
    [user?.email, conversation?.customer?.email, conversation?.customer?.full_name],
  )

  const fetchIds = conversationIds || conversationId
  const { messages, isLoading } = useThreadMessagesList(fetchIds, normCtx)

  const handleBack = () => {
    if (canGoBackInApp()) {
      navigate(-1)
    } else {
      navigate(getConversationBackPath(window.location.pathname))
    }
  }

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden">
      {/* Visitor left banner */}
      {onlineStatus?.hasLeft && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800">
          <AlertCircle className="h-3 w-3 text-amber-600" />
          <span className="text-[11px] text-amber-700 dark:text-amber-400">
            Visitor left — replies sent via email
          </span>
        </div>
      )}

      {/* Compact header */}
      <div className="flex-shrink-0 px-2 py-2 border-b flex items-center gap-2 bg-card">
        <SidebarTrigger className="shrink-0 h-8 w-8" />
        <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0 h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <Avatar className="h-7 w-7 shrink-0">
          <AvatarFallback className="text-[10px]">
            {getCustomerInitial(customerDisplay.displayName, customerDisplay.email)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium truncate">{customerDisplay.displayName}</span>
            <div
              className={cn(
                "w-1.5 h-1.5 rounded-full shrink-0",
                onlineStatus?.hasLeft
                  ? "bg-amber-500"
                  : onlineStatus?.isOnline
                    ? "bg-green-500 animate-pulse"
                    : "bg-muted-foreground/40",
              )}
            />
          </div>
        </div>

        <Select
          value={conversation?.status || "open"}
          onValueChange={(s) => updateStatus({ status: s })}
        >
          <SelectTrigger className="h-6 w-[80px] text-[10px] shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <DescribedSelectItem
              value="open"
              title="Open"
              description={CONVERSATION_STATUS_DESCRIPTIONS.open}
            >
              <div className="flex items-center gap-1">
                <CircleDot className="h-3 w-3" />
                Open
              </div>
            </DescribedSelectItem>
            <DescribedSelectItem
              value="pending"
              title="Pending"
              description={CONVERSATION_STATUS_DESCRIPTIONS.pending}
            >
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Pending
              </div>
            </DescribedSelectItem>
            <DescribedSelectItem
              value="closed"
              title="Closed"
              description={CONVERSATION_STATUS_DESCRIPTIONS.closed}
            >
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Closed
              </div>
            </DescribedSelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Customer summary */}
      <MobileCustomerSummaryCard customer={conversation.customer} noddiData={noddiData} />

      {/* Messages */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
          Loading...
        </div>
      ) : (
        <MobileChatMessageList
          messages={messages}
          customerName={conversation?.customer?.full_name}
          customerEmail={conversation?.customer?.email}
          customerTyping={customerTyping}
        />
      )}

      {/* Reply input */}
      <ChatReplyInput conversationId={conversationId} />
    </div>
  )
}

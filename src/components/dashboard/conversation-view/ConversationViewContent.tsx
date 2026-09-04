import { useQueryClient } from "@tanstack/react-query"
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  CheckCircle2,
  ChevronsDown,
  ChevronsUp,
  CircleDot,
  Clock,
  Info,
  Loader2 as MobileLoader,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
  Wrench,
} from "lucide-react"
import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import {
  ProgressiveMessagesList,
  type ProgressiveMessagesListRef,
} from "@/components/conversations/ProgressiveMessagesList"
import { ChatCustomerPanel } from "@/components/dashboard/chat/ChatCustomerPanel"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useConversationPresenceSafe } from "@/contexts/ConversationPresenceContext"
import { useConversationView } from "@/contexts/ConversationViewContext"
import { useIsMobile } from "@/hooks/use-responsive"
import { useConversationShortcuts } from "@/hooks/useConversationShortcuts"
import { useNoddihKundeData } from "@/hooks/useNoddihKundeData"
import { cn } from "@/lib/utils"
import { useNavigate, useSearchParams } from "@/router/compat"
import { canGoBackInApp, getConversationBackPath } from "@/utils/conversationNavigation"
import { getCustomerDisplayWithNoddi, getCustomerInitial } from "@/utils/customerDisplayName"
import { CustomerSidePanel } from "./CustomerSidePanel"

// Lazy-load mobile components to avoid bloating desktop bundle
const MobileChatConversationView = lazy(() =>
  import("@/components/mobile/conversations/MobileChatConversationView").then((m) => ({
    default: m.MobileChatConversationView,
  })),
)
const MobileEmailConversationView = lazy(() =>
  import("@/components/mobile/conversations/MobileEmailConversationView").then((m) => ({
    default: m.MobileEmailConversationView,
  })),
)

import { formatDistanceToNow } from "date-fns"
import { PresenceAvatarStack } from "@/components/conversations/PresenceAvatarStack"
import { CreateNoddiTicketDialog } from "@/components/noddi-tickets/CreateNoddiTicketDialog"
import { EntityTagPicker } from "@/components/tags/TagPicker"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useVisitorOnlineStatus } from "@/hooks/useVisitorOnlineStatus"
import { supabase } from "@/integrations/supabase/client"
import { getLanguageFlag, getLanguageLabel } from "@/utils/languageLabels"
import { ConversationBrandPicker } from "./ConversationBrandPicker"
import { SnoozeDialog } from "./SnoozeDialog"
import { TagDialog } from "./TagDialog"
import { WidgetContextCard } from "./WidgetContextCard"

interface ConversationViewContentProps {
  conversationId: string
  conversation: any
  showSidePanel?: boolean
}

export const ConversationViewContent: React.FC<ConversationViewContentProps> = ({
  conversationId,
  conversation,
  showSidePanel = true,
}) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const isMobile = useIsMobile()
  const messagesListRef = useRef<ProgressiveMessagesListRef>(null)
  const [allExpanded, setAllExpanded] = React.useState(false)

  // Get conversationIds from context for thread viewing
  const { conversationIds } = useConversationView()

  // Presence tracking - extract stable function references
  const presenceContext = useConversationPresenceSafe()
  const trackConversation = presenceContext?.trackConversation
  const untrackConversation = presenceContext?.untrackConversation
  const isPresenceConnected = presenceContext?.isConnected

  // Track conversation for presence — always call, hook queues if channel isn't ready yet
  useEffect(() => {
    if (trackConversation && conversationId) {
      trackConversation(conversationId)
      return () => {
        untrackConversation?.()
      }
    }
  }, [conversationId, trackConversation, untrackConversation])

  // Enable keyboard shortcuts for status changes
  useConversationShortcuts()

  const [sidePanelCollapsed, setSidePanelCollapsed] = React.useState(false)
  const [showNoddiPanel, setShowNoddiPanel] = useState(true)
  const [opsTicketOpen, setOpsTicketOpen] = useState(false)

  // Cmd/Ctrl + J toggles the customer details sidebar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault()
        setShowNoddiPanel((prev) => !prev)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // Fetch Noddi data for customer display
  const { data: noddiData } = useNoddihKundeData(conversation.customer || null)

  // Smart customer display - prioritize Noddi data for the name
  const customerDisplay = useMemo(
    () =>
      getCustomerDisplayWithNoddi(
        noddiData,
        conversation.customer?.full_name,
        conversation.customer?.email,
      ),
    [noddiData, conversation.customer?.full_name, conversation.customer?.email],
  )

  const handleToggleAll = () => {
    messagesListRef.current?.toggleAllMessages()
    setAllExpanded(messagesListRef.current?.allExpanded ?? false)
  }

  // Get conversation view context
  const {
    state,
    dispatch,
    assignUsers,
    moveInboxes,
    assignConversation,
    moveConversation,
    snoozeConversation,
    addTag,
    removeTag,
    updateStatus,
  } = useConversationView()

  // Check if this is a live chat (widget channel)
  const isLiveChat = conversation?.channel === "widget"

  // Track visitor online status for live chat
  const { data: onlineStatus } = useVisitorOnlineStatus(isLiveChat ? conversationId : null)

  // Track previous status for toast notification
  const previousStatusRef = useRef(onlineStatus?.status)

  useEffect(() => {
    const prevStatus = previousStatusRef.current
    const currentStatus = onlineStatus?.status

    // Notify when status changes from active to ended/abandoned
    if (prevStatus === "active" && (currentStatus === "ended" || currentStatus === "abandoned")) {
      toast.info("Visitor has left the chat", {
        description:
          currentStatus === "abandoned" ? "Connection timed out" : "Visitor closed the chat",
      })
    }

    previousStatusRef.current = currentStatus
  }, [onlineStatus?.status])

  const navigateBack = useNavigate()
  const handleBack = () => {
    if (canGoBackInApp()) {
      navigateBack(-1)
    } else {
      navigateBack(getConversationBackPath(window.location.pathname))
    }
  }

  // ============ MOBILE: Dedicated mobile components ============
  if (isMobile) {
    const MobileComponent = isLiveChat ? MobileChatConversationView : MobileEmailConversationView
    return (
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center">
            <MobileLoader className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <MobileComponent conversationId={conversationId} conversation={conversation} />
      </Suspense>
    )
  }

  // ============ LIVE CHAT UI (WhatsApp-style) ============
  if (isLiveChat) {
    const showDetailPanel = showNoddiPanel && !isMobile
    const chatColumn = (
      <div className="flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
        {/* Visitor left banner */}
        {onlineStatus?.hasLeft && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm text-amber-700 dark:text-amber-400">
              Visitor has left the chat — replies will be sent via email
            </span>
            <span className="text-xs text-amber-600 dark:text-amber-500 ml-auto">
              {onlineStatus.status === "abandoned" ? "Timed out" : "Ended by visitor"}
            </span>
          </div>
        )}

        {/* Compact Chat Header */}
        <div className="flex-shrink-0 px-4 py-3 border-b flex items-center gap-3 bg-card shadow-sm">
          {isMobile && <SidebarTrigger className="shrink-0" />}
          <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>

          {/* Small avatar */}
          <Avatar className="h-9 w-9 ring-1 ring-border shrink-0">
            <AvatarFallback className="text-sm">
              {getCustomerInitial(customerDisplay.displayName, customerDisplay.email)}
            </AvatarFallback>
          </Avatar>

          {/* Customer info + online status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{customerDisplay.displayName}</span>
              {/* Online status dot */}
              <div
                className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  onlineStatus?.hasLeft
                    ? "bg-amber-500"
                    : onlineStatus?.isOnline
                      ? "bg-green-500 animate-pulse"
                      : "bg-gray-400",
                )}
              />
              {!isMobile && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs shrink-0",
                    onlineStatus?.hasLeft
                      ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                      : onlineStatus?.isOnline
                        ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                        : "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700",
                  )}
                >
                  {onlineStatus?.hasLeft ? "Left" : onlineStatus?.isOnline ? "Online" : "Offline"}
                </Badge>
              )}
              {!isMobile && onlineStatus?.locale && (
                <Badge
                  variant="outline"
                  className="text-xs shrink-0"
                  title={`Widget language: ${getLanguageLabel(onlineStatus.locale)}`}
                >
                  {getLanguageFlag(onlineStatus.locale)} {getLanguageLabel(onlineStatus.locale)}
                </Badge>
              )}
              {!isMobile && conversation.is_archived && (
                <Badge
                  variant="outline"
                  className="text-xs shrink-0 bg-muted text-muted-foreground"
                >
                  <Archive className="h-3 w-3 mr-0.5" />
                  Archived
                </Badge>
              )}
            </div>
            {!isMobile && (
              <div className="flex items-center gap-2">
                {customerDisplay.showEmail && customerDisplay.email && (
                  <span className="text-xs text-muted-foreground truncate">
                    {customerDisplay.email}
                  </span>
                )}
                {!onlineStatus?.isOnline && onlineStatus?.lastSeenAt && (
                  <span className="text-xs text-muted-foreground">
                    · Last seen{" "}
                    {formatDistanceToNow(new Date(onlineStatus.lastSeenAt), { addSuffix: true })}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Brand (auto-set by the widget, manually overridable here) */}
          <ConversationBrandPicker
            conversationId={conversation.id}
            metadata={conversation.metadata}
            channel={conversation.channel}
          />

          {/* Custom tags */}
          <EntityTagPicker entityType="conversation" entityId={conversation.id} />

          {/* Status dropdown */}

          <Select
            value={conversation?.status || "open"}
            onValueChange={(status) => updateStatus({ status })}
          >
            <SelectTrigger
              className={cn("h-7 text-xs shrink-0", isMobile ? "w-[90px]" : "w-[110px]")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">
                <div className="flex items-center gap-2">
                  <CircleDot className="h-3 w-3" />
                  Open
                </div>
              </SelectItem>
              <SelectItem value="pending">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  Pending
                </div>
              </SelectItem>
              <SelectItem value="closed">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3" />
                  Closed
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Noddi info button - hide on mobile */}
          {!isMobile && (
            <Button
              variant={showNoddiPanel ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setShowNoddiPanel(!showNoddiPanel)}
              title="View Noddi customer info"
              className="shrink-0 relative"
            >
              <Info className="h-4 w-4" />
              {noddiData?.data?.found && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full" />
              )}
            </Button>
          )}

          {/* Team presence - hide on mobile */}
          {!isMobile && (
            <PresenceAvatarStack
              conversationId={conversationId}
              size="sm"
              maxAvatars={2}
              showSelfFallback
            />
          )}
        </div>

        {/* Chat Messages Area - full height, compact mode skips duplicate header */}
        <ProgressiveMessagesList
          ref={messagesListRef}
          conversationId={conversationId}
          conversationIds={conversationIds}
          conversation={conversation}
          compactChatMode={true}
        />
      </div>
    )

    const detailPanel = (
      <div className="flex flex-col h-full overflow-y-auto border-l">
        <WidgetContextCard metadata={conversation.metadata} className="m-3 mb-0" />
        <ChatCustomerPanel
          customer={conversation.customer}
          conversationId={conversationId}
          onClose={() => setShowNoddiPanel(false)}
        />
      </div>
    )

    return (
      <div className="flex h-full bg-card overflow-hidden">
        {showDetailPanel ? (
          <ResizablePanelGroup
            direction="horizontal"
            className="flex-1 min-w-0"
            autoSaveId="livechat-detail-panels"
          >
            <ResizablePanel defaultSize={68} minSize={40} className="min-w-0">
              {chatColumn}
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={32} minSize={20} maxSize={50} className="min-w-0">
              {detailPanel}
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="flex flex-1 min-w-0">{chatColumn}</div>
        )}

        {/* Always-visible rail on the right edge to open/close the customer details panel */}
        {!isMobile && (
          <div className="flex-shrink-0 flex flex-col items-center border-l bg-muted/20 px-1 py-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              aria-label={
                showNoddiPanel ? "Hide customer details (⌘J)" : "Show customer details (⌘J)"
              }
              title={
                showNoddiPanel
                  ? "Hide customer details (⌘J / Ctrl+J)"
                  : "Show customer details (⌘J / Ctrl+J)"
              }
              onClick={() => setShowNoddiPanel(!showNoddiPanel)}
            >
              {showNoddiPanel ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelRightOpen className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        {/* Dialogs still needed for chat */}
        <TagDialog
          open={state.tagDialogOpen}
          onOpenChange={(open) => dispatch({ type: "SET_TAG_DIALOG", payload: open })}
          currentTags={((conversation.metadata as Record<string, any>)?.tags || []) as string[]}
          onAddTag={addTag}
          onRemoveTag={removeTag}
        />
      </div>
    )
  }

  // ============ EMAIL UI (Original layout) ============
  return (
    <div className="flex h-full overflow-hidden">
      {/* Main conversation area */}
      <div className="flex flex-col min-h-0 flex-1 min-w-0 overflow-hidden bg-background">
        {/* Compact Conversation Header */}
        <div className="flex-shrink-0 px-3 py-2 border-b border-border bg-card/80 backdrop-blur-sm shadow-sm">
          <div className="flex items-center gap-3">
            {/* Left: Back + Customer Info + Subject */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {isMobile && <SidebarTrigger className="shrink-0" />}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="flex items-center gap-1 shrink-0 h-8 px-2"
              >
                <ArrowLeft className="h-4 w-4" />
                {!isMobile && <span className="text-xs">Back</span>}
              </Button>

              <Avatar className="h-8 w-8 ring-1 ring-border shrink-0">
                <AvatarFallback className="text-xs font-semibold">
                  {getCustomerInitial(
                    conversation.customer?.full_name,
                    conversation.customer?.email,
                  )}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold truncate">
                    {conversation.customer?.full_name || customerDisplay.displayName}
                  </span>
                  {conversation.customer?.email && (
                    <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                      · {conversation.customer.email}
                    </span>
                  )}
                  {conversation.is_archived && (
                    <Badge
                      variant="outline"
                      className="text-xs shrink-0 bg-muted text-muted-foreground"
                    >
                      <Archive className="h-3 w-3 mr-0.5" />
                      Archived
                    </Badge>
                  )}
                </div>
                {conversation.subject && (
                  <p className="text-xs text-muted-foreground truncate">
                    Subject: {conversation.subject}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {!isMobile && (
                <>
                  <PresenceAvatarStack
                    conversationId={conversationId}
                    size="sm"
                    maxAvatars={3}
                    className="mr-1"
                    showSelfFallback
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void queryClient.invalidateQueries({
                        queryKey: ["conversation-messages", conversationId],
                      })
                      void queryClient.invalidateQueries({
                        queryKey: ["conversation-meta", conversationId],
                      })
                      toast.success("Conversation refreshed")
                    }}
                    className="gap-1 h-7"
                    title="Refresh (Ctrl+R)"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span className="text-xs">Refresh</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggleAll}
                    className="gap-1 h-7"
                    title={allExpanded ? "Collapse all messages" : "Expand all messages"}
                  >
                    {allExpanded ? (
                      <>
                        <ChevronsUp className="h-3.5 w-3.5" />
                        <span className="text-xs">Collapse</span>
                      </>
                    ) : (
                      <>
                        <ChevronsDown className="h-3.5 w-3.5" />
                        <span className="text-xs">Expand</span>
                      </>
                    )}
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpsTicketOpen(true)}
                className="gap-1 h-7"
                title="Create an operations ticket in Navio for this conversation"
              >
                <Wrench className="h-3.5 w-3.5" />
                {!isMobile && <span className="text-xs">Ops ticket</span>}
              </Button>
              {/* Mobile: Status dropdown inline */}
              {isMobile && (
                <Select
                  value={conversation?.status || "open"}
                  onValueChange={(status) => updateStatus({ status })}
                >
                  <SelectTrigger className="h-7 w-[90px] text-xs shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">
                      <div className="flex items-center gap-1.5">
                        <CircleDot className="h-3 w-3" />
                        Open
                      </div>
                    </SelectItem>
                    <SelectItem value="pending">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        Pending
                      </div>
                    </SelectItem>
                    <SelectItem value="closed">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3" />
                        Closed
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </div>

        {/* Messages Area with Progressive Loading */}
        <div className="flex-1 min-h-0 w-full flex flex-col bg-background">
          <ProgressiveMessagesList
            ref={messagesListRef}
            conversationId={conversationId}
            conversationIds={conversationIds}
            conversation={conversation}
          />
        </div>
      </div>

      {/* Side panel - Responsive with collapse feature */}
      {showSidePanel && !isMobile && (
        <div
          className={cn(
            "flex-shrink-0 border-l border-border transition-all duration-300 ease-in-out",
            sidePanelCollapsed ? "w-12" : "w-80 lg:w-[340px] xl:w-[380px] 2xl:w-[420px]",
          )}
        >
          <CustomerSidePanel
            conversation={conversation}
            isCollapsed={sidePanelCollapsed}
            onToggleCollapse={() => setSidePanelCollapsed(!sidePanelCollapsed)}
          />
        </div>
      )}

      {/* Dialogs */}
      <CreateNoddiTicketDialog
        open={opsTicketOpen}
        onOpenChange={setOpsTicketOpen}
        defaultTitle={
          conversation.subject ||
          `Support request from ${customerDisplay?.displayName || "customer"}`
        }
        defaultDescription={[
          `Created from a ${conversation.channel === "widget" ? "live chat" : conversation.channel || "support"} conversation in the Support Hub.`,
          conversation.customer?.email
            ? `Customer: ${customerDisplay?.displayName || ""} (${conversation.customer.email})`
            : null,
          conversation.customer?.phone ? `Phone: ${conversation.customer.phone}` : null,
          `Conversation: ${window.location.origin}/conversations/${conversationId}`,
        ]
          .filter(Boolean)
          .join("\n")}
        userGroupId={noddiData?.data?.user_group_id ?? null}
        onCreated={() => toast.success("Operations ticket created in Navio")}
      />

      <TagDialog
        open={state.tagDialogOpen}
        onOpenChange={(open) => dispatch({ type: "SET_TAG_DIALOG", payload: open })}
        currentTags={((conversation.metadata as Record<string, any>)?.tags || []) as string[]}
        onAddTag={addTag}
        onRemoveTag={removeTag}
      />

      <SnoozeDialog
        open={state.snoozeDialogOpen}
        onOpenChange={(open) =>
          dispatch({
            type: "SET_SNOOZE_DIALOG",
            payload: { open, date: new Date(), time: "09:00" },
          })
        }
        onSnooze={async (date: Date, time: string) => {
          dispatch({ type: "SET_SNOOZE_DIALOG", payload: { open: true, date, time } })
          await snoozeConversation()
        }}
      />

      {/* Assign Dialog */}
      <Dialog
        open={state.assignDialogOpen}
        onOpenChange={(open) =>
          dispatch({ type: "SET_ASSIGN_DIALOG", payload: { open, userId: "", loading: false } })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select
              value={state.assignSelectedUserId}
              onValueChange={(userId) =>
                dispatch({
                  type: "SET_ASSIGN_DIALOG",
                  payload: {
                    open: true,
                    userId,
                    loading: false,
                  },
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {assignUsers.map((user: any) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                dispatch({
                  type: "SET_ASSIGN_DIALOG",
                  payload: { open: false, userId: "", loading: false },
                })
              }
            >
              Cancel
            </Button>
            <Button
              onClick={() => assignConversation(state.assignSelectedUserId)}
              disabled={!state.assignSelectedUserId || state.assignLoading}
            >
              {state.assignLoading ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Dialog */}
      <Dialog
        open={state.moveDialogOpen}
        onOpenChange={(open) =>
          dispatch({ type: "SET_MOVE_DIALOG", payload: { open, inboxId: "", loading: false } })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select
              value={state.moveSelectedInboxId}
              onValueChange={(inboxId) =>
                dispatch({
                  type: "SET_MOVE_DIALOG",
                  payload: {
                    open: true,
                    inboxId,
                    loading: false,
                  },
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select inbox" />
              </SelectTrigger>
              <SelectContent>
                {moveInboxes.map((inbox: any) => (
                  <SelectItem key={inbox.id} value={inbox.id}>
                    {inbox.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                dispatch({
                  type: "SET_MOVE_DIALOG",
                  payload: { open: false, inboxId: "", loading: false },
                })
              }
            >
              Cancel
            </Button>
            <Button
              onClick={() => moveConversation(state.moveSelectedInboxId)}
              disabled={!state.moveSelectedInboxId || state.moveLoading}
            >
              {state.moveLoading ? "Moving..." : "Move"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Conversation Dialog */}
      <AlertDialog
        open={state.deleteDialogOpen && !state.messageToDelete}
        onOpenChange={(open) =>
          dispatch({ type: "SET_DELETE_DIALOG", payload: { open, messageId: null } })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the conversation to trash. You can find it later in the "Deleted"
              filter.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const { error } = await supabase
                  .from("conversations")
                  .update({ deleted_at: new Date().toISOString() })
                  .eq("id", conversationId)

                if (error) {
                  toast.error("Failed to delete conversation")
                } else {
                  toast.success("Conversation moved to trash")
                  void queryClient.invalidateQueries({ queryKey: ["conversations"] })
                  void queryClient.invalidateQueries({ queryKey: ["inboxCounts"] })
                  void queryClient.invalidateQueries({ queryKey: ["all-counts"] })
                  navigateBack(-1)
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

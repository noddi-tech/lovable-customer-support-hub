import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Inbox as InboxIcon, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import type React from "react"
import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { MasterDetailShell } from "@/components/admin/design/components/layouts/MasterDetailShell"
import { InboxMetricsDialog } from "@/components/dashboard/InboxMetricsDialog"
import { ChannelPageHeader } from "@/components/dashboard/shared/ChannelPageHeader"
import { InboxList } from "@/components/layout/InboxList"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useIsMobile } from "@/hooks/use-responsive"
import { useAuth } from "@/hooks/useAuth"
import { useDefaultInbox } from "@/hooks/useDefaultInbox"
import {
  useAccessibleInboxes,
  useConversations,
  useReply,
  useThread,
} from "@/hooks/useInteractionsData"
import { useInteractionsNavigation } from "@/hooks/useInteractionsNavigation"
import { supabase } from "@/integrations/supabase/client"
import type { ConversationRow } from "@/types/interactions"
import { getCustomerDisplay } from "@/utils/customerDisplayName"
import { ConversationList } from "./ConversationList"
import { ConversationView } from "./ConversationView"

// Define conversation types
type ConversationStatus = "open" | "pending" | "resolved" | "closed"
type ConversationPriority = "low" | "normal" | "high" | "urgent"
type ConversationChannel =
  | "email"
  | "chat"
  | "widget"
  | "social"
  | "facebook"
  | "instagram"
  | "whatsapp"

const FilterToggleButton = ({
  collapsed,
  onToggle,
}: {
  collapsed: boolean
  onToggle: () => void
}) => (
  <TooltipProvider delayDuration={200}>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground"
          aria-label={collapsed ? "Show filters" : "Hide filters"}
          onClick={onToggle}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" className="flex items-center gap-2">
        <span>{collapsed ? "Show filters" : "Hide filters"}</span>
        <kbd className="rounded border border-border bg-muted px-1 text-[10px]">⌘M</kbd>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
)

interface Customer {
  id: string
  full_name: string
  email: string
}

interface Conversation {
  id: string
  subject: string
  status: ConversationStatus
  priority: ConversationPriority
  is_read: boolean
  is_archived?: boolean
  channel: ConversationChannel
  updated_at: string
  received_at?: string
  inbox_id?: string
  customer?: Customer
  assigned_to?: {
    id: string
    full_name: string
    avatar_url?: string
  }
  thread_ids?: string[]
  thread_count?: number
  _fetchIds?: string | string[]
}

interface EnhancedInteractionsLayoutProps {
  activeSubTab: string
  selectedTab: string
  onTabChange: (tab: string) => void
  selectedInboxId: string
}

export const EnhancedInteractionsLayout: React.FC<EnhancedInteractionsLayoutProps> = ({
  activeSubTab,
  selectedTab,
  onTabChange,
  selectedInboxId,
}) => {
  const { t } = useTranslation()
  const navigation = useInteractionsNavigation()
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [filtersCollapsed, setFiltersCollapsed] = useState(false)
  const [metricsOpen, setMetricsOpen] = useState(false)

  // Cmd/Ctrl + M toggles the filter sidebar
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "m") {
        e.preventDefault()
        setFiltersCollapsed((prev) => !prev)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  // Dev-only performance monitoring
  useEffect(() => {
    if (import.meta.env.DEV && import.meta.env.VITE_PERF_LOG === "1") {
      performance.mark("enhanced-interactions-layout-mount-start")

      return () => {
        performance.mark("enhanced-interactions-layout-mount-end")
        performance.measure(
          "enhanced-interactions-layout-mount",
          "enhanced-interactions-layout-mount-start",
          "enhanced-interactions-layout-mount-end",
        )

        const measure = performance.getEntriesByName("enhanced-interactions-layout-mount")[0]
        if (measure) {
          console.log(`EnhancedInteractionsLayout mount time: ${measure.duration.toFixed(2)}ms`)
        }

        // Cleanup
        performance.clearMarks("enhanced-interactions-layout-mount-start")
        performance.clearMarks("enhanced-interactions-layout-mount-end")
        performance.clearMeasures("enhanced-interactions-layout-mount")
      }
    }
  }, [])

  // Get state from URL navigation
  const { conversationId, inbox, status, search } = navigation.currentState
  const isDetail = !!conversationId

  // Read thread IDs from URL if present
  const threadParam = new URLSearchParams(window.location.search).get("thread")
  const conversationIds = threadParam ? threadParam.split(",") : conversationId

  // Get accessible inboxes and the user's starred default inbox (if any)
  const { data: inboxes = [] } = useAccessibleInboxes()
  const { defaultInboxId, isLoading: defaultInboxLoading } = useDefaultInbox()

  // Fall back to the user's starred inbox; when no inbox is starred, show all inboxes
  const fallbackInboxId =
    defaultInboxId && inboxes.some((i) => i.id === defaultInboxId) ? defaultInboxId : "all"

  // Determine effective inbox ID
  const effectiveInboxId = inbox || selectedInboxId || fallbackInboxId
  const effectiveStatus = status || "all"
  const effectiveSearch = search || searchQuery

  // Apply the starred default inbox to the URL once; never auto-pick an arbitrary inbox
  const { setInbox: navigationSetInbox } = navigation
  useEffect(() => {
    if (
      !isDetail &&
      !inbox &&
      !selectedInboxId &&
      !defaultInboxLoading &&
      fallbackInboxId !== "all"
    ) {
      navigationSetInbox(fallbackInboxId)
    }
  }, [isDetail, inbox, selectedInboxId, defaultInboxLoading, fallbackInboxId, navigationSetInbox])

  // Get conversations and thread data
  // Exclude 'widget' channel since those are now in the dedicated Chat section
  const { data: conversations = [], isLoading: conversationsLoading } = useConversations({
    inboxId: effectiveInboxId,
    status: effectiveStatus,
    q: effectiveSearch,
    currentUserProfileId: profile?.id,
    excludeChannel: "widget", // Filter out chat/widget conversations - they belong in Chat section
  })

  const { data: thread, isLoading: threadLoading } = useThread(conversationId)
  const replyMutation = useReply(
    conversationId || "",
    effectiveInboxId,
    effectiveStatus,
    effectiveSearch,
  )

  // Find selected conversation
  const selectedConversation = conversationId
    ? conversations.find((c) => c.id === conversationId)
    : null

  // Mark conversation as read mutation - with optimistic cache update for instant UI feedback
  const markAsReadMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from("conversations")
        .update({ is_read: true })
        .eq("id", conversationId)
        .eq("is_read", false) // Only update if currently unread

      if (error) throw error
      return conversationId
    },
    onMutate: async (conversationId: string) => {
      // Cancel any outgoing refetches to avoid race conditions
      await queryClient.cancelQueries({ queryKey: ["conversations"] })

      // Optimistically update ALL conversation caches immediately
      // This handles both infinite query (ConversationListContext) and regular query (useConversations)
      queryClient.setQueriesData({ queryKey: ["conversations"], exact: false }, (oldData: any) => {
        if (!oldData) return oldData

        // Handle infinite query structure (pages array) - from ConversationListContext
        if (oldData.pages) {
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              conversations:
                page.conversations?.map((conv: any) =>
                  conv.id === conversationId ? { ...conv, is_read: true } : conv,
                ) || page,
            })),
          }
        }

        // Handle regular query structure (array) - from useConversations
        if (Array.isArray(oldData)) {
          return oldData.map((conv: any) =>
            conv.id === conversationId ? { ...conv, is_read: true } : conv,
          )
        }

        return oldData
      })

      return { conversationId }
    },
    onSuccess: () => {
      // Update counts (these don't have staleTime issues)
      void queryClient.invalidateQueries({ queryKey: ["inboxCounts"] })
      void queryClient.invalidateQueries({ queryKey: ["all-counts"] })
    },
    onError: (err, conversationId, context) => {
      // Rollback on error - refetch to get correct state
      void queryClient.refetchQueries({ queryKey: ["conversations"] })
    },
  })

  // Handlers
  const handleConversationSelect = useCallback(
    (conversation: ConversationRow) => {
      const conv = conversation as any
      const conversationIdsToFetch =
        conv.thread_ids && conv.thread_ids.length > 1 ? conv.thread_ids : conversation.id

      navigation.openConversation(conversation.id, conversationIdsToFetch)

      // Mark as read if it's unread (use conv since ConversationRow may not have is_read typed)
      if (conv.is_read === false) {
        markAsReadMutation.mutate(conversation.id)
      }

      // Log thread selection for debugging
      if (conv.thread_ids && conv.thread_ids.length > 1) {
        console.log("[EnhancedInteractionsLayout] Selected threaded conversation:", {
          conversationId: conversation.id,
          threadCount: conv.thread_count,
          threadIds: conv.thread_ids,
          _fetchIds: conversationIdsToFetch,
        })
      }
    },
    [navigation, markAsReadMutation],
  )

  const handleBack = useCallback(() => {
    navigation.backToList()
  }, [navigation])

  const handleInboxSelect = useCallback(
    (inboxId: string) => {
      navigation.setInbox(inboxId)
    },
    [navigation],
  )

  const handleStatusSelect = useCallback(
    (status: any) => {
      navigation.setStatus(status)
    },
    [navigation],
  )

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    // Search query is passed as prop to ConversationList, which dispatches to ConversationListContext
  }, [])

  const handleSendReply = useCallback(
    async (text: string) => {
      if (!conversationId) return
      await replyMutation.mutateAsync(text)
    },
    [conversationId, replyMutation],
  )

  // Voice sub-tabs are now handled at the Index.tsx level

  const toggleFiltersCollapsed = useCallback(() => {
    setFiltersCollapsed((prev) => !prev)
  }, [])

  // Render inbox list with search
  const renderInboxList = () => {
    if (filtersCollapsed) {
      return (
        <div className="flex flex-col items-center pt-1">
          <FilterToggleButton collapsed onToggle={toggleFiltersCollapsed} />
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {/* Collapse control */}
        <div className="flex items-center justify-end px-2">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-muted px-1 text-[10px] text-muted-foreground">
              ⌘M
            </kbd>
            <FilterToggleButton collapsed={false} onToggle={toggleFiltersCollapsed} />
          </span>
        </div>

        {/* Search Input */}
        <div className="px-2">
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="bg-background border-border focus-visible:ring-ring"
          />
        </div>

        {/* Inbox and Filter List */}
        <InboxList
          selectedInbox={effectiveInboxId}
          selectedStatus={effectiveStatus}
          onInboxSelect={handleInboxSelect}
          onStatusSelect={handleStatusSelect}
        />
      </div>
    )
  }

  // Render conversation list (without LiveChatQueue - now in Chat section)
  const renderConversationList = () => {
    const activeInbox = inboxes.find((i) => i.id === effectiveInboxId)
    const inboxLabel = effectiveInboxId === "all" || !activeInbox ? "All inboxes" : activeInbox.name

    return (
      <div className="flex flex-col h-full">
        <ChannelPageHeader
          icon={InboxIcon}
          title={inboxLabel}
          onOpenMetrics={() => setMetricsOpen(true)}
        />
        <InboxMetricsDialog
          open={metricsOpen}
          onOpenChange={setMetricsOpen}
          inboxId={effectiveInboxId === "all" ? null : effectiveInboxId}
          inboxName={inboxLabel}
        />
        <ConversationList
          selectedTab={effectiveStatus}
          onSelectConversation={(conversation) => handleConversationSelect(conversation as any)}
          selectedConversation={selectedConversation as any}
          selectedInboxId={effectiveInboxId}
          onToggleCollapse={() => {}}
          searchQuery={searchQuery}
        />
      </div>
    )
  }

  const isMobile = useIsMobile()

  const renderMessageThread = () => {
    if (!conversationId || !thread) {
      if (threadLoading) {
        if (isMobile) {
          return (
            <div className="space-y-4 p-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-16 w-full" />
            </div>
          )
        }
        return (
          <Card className="h-full">
            <CardContent className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      }
      return null
    }

    // Smart customer display to prevent duplicate email
    const customerDisplay = getCustomerDisplay(thread.customer?.full_name, thread.customer?.email)

    // Mobile: render without Card wrapper for full width
    if (isMobile) {
      return (
        <ConversationView
          conversationId={conversationId}
          conversationIds={conversationIds}
          showSidePanel={true}
        />
      )
    }

    return (
      <Card className="h-full">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-semibold mb-2">{thread.subject}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{customerDisplay.displayName}</span>
                {customerDisplay.showEmail && customerDisplay.email && (
                  <>
                    <span>•</span>
                    <span>{customerDisplay.email}</span>
                  </>
                )}
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <ConversationView
                conversationId={conversationId}
                conversationIds={conversationIds}
                showSidePanel={true}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <MasterDetailShell
      left={renderInboxList()}
      leftCollapsed={filtersCollapsed}
      center={renderConversationList()}
      detailLeft={renderMessageThread()}
      detailRight={null}
      isDetail={isDetail}
      onBack={handleBack}
      backButtonLabel={t("interactions.backToInbox", "Back to Inbox")}
    />
  )
}

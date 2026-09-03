import { useQuery } from "@tanstack/react-query"
import { MessageCircle, Settings } from "lucide-react"
import type React from "react"
import { useState } from "react"
import { LiveChatQueue } from "@/components/conversations/LiveChatQueue"
import { ChatMetricsDialog } from "@/components/dashboard/ChatMetricsDialog"
// Direct import - lazy loading was causing context provider issues
import { ConversationView } from "@/components/dashboard/ConversationView"
import { ChannelPageHeader } from "@/components/dashboard/shared/ChannelPageHeader"
import { Button } from "@/components/ui/button"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useIsMobile } from "@/hooks/use-responsive"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { useNavigate, useParams, useSearchParams } from "@/router/compat"
import { AiConversationView } from "./AiConversationView"
import { AiEscalationInfoPopover } from "./AiEscalationInfoPopover"
import { ChatConversationList } from "./ChatConversationList"
import { ChatEmptyState } from "./ChatEmptyState"
import { ChatFilters, type ChatFilterType } from "./ChatFilters"
import { LiveChatSlaDialog } from "./LiveChatSlaDialog"

export const ChatLayout: React.FC = () => {
  const navigate = useNavigate()
  const { filter: urlFilter, conversationId: selectedConversationId } = useParams<{
    filter?: string
    conversationId?: string
  }>()
  const [searchParams] = useSearchParams()
  const highlightMessageId = searchParams.get("m")
  const { profile, isAdmin } = useAuth()
  const isMobile = useIsMobile()
  const organizationId = profile?.organization_id
  const [slaOpen, setSlaOpen] = useState(false)
  const [metricsOpen, setMetricsOpen] = useState(false)

  const widgetSettingsButton = (
    <>
      <AiEscalationInfoPopover />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Live chat service levels"
            onClick={() => setSlaOpen(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Live chat SLA &amp; performance</TooltipContent>
      </Tooltip>
    </>
  )

  // Map URL filter to our filter type
  const currentFilter: ChatFilterType =
    urlFilter === "waiting"
      ? "waiting"
      : urlFilter === "ended"
        ? "ended"
        : urlFilter === "all"
          ? "all"
          : "active"

  // Fetch counts for filter badges
  const { data: counts } = useQuery({
    queryKey: ["chat-counts", organizationId],
    queryFn: async () => {
      if (!organizationId) return { active: 0, waiting: 0, ended: 0, all: 0 }

      // Count live-chat (widget conversations) + AI conversations by status.
      const [
        activeResult,
        endedResult,
        allResult,
        aiActiveResult,
        aiEndedResult,
        aiEscalatedResult,
        aiAllResult,
      ] = await Promise.all([
        supabase
          .from("conversations")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .eq("channel", "widget")
          .in("status", ["open", "pending"]) // Include pending in active count
          .is("deleted_at", null),
        supabase
          .from("conversations")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .eq("channel", "widget")
          .in("status", ["closed", "resolved"])
          .is("deleted_at", null),
        supabase
          .from("conversations")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .eq("channel", "widget")
          .is("deleted_at", null),
        supabase
          .from("widget_ai_conversations")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .in("status", ["active", "escalated", "assigned"]),
        supabase
          .from("widget_ai_conversations")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .in("status", ["resolved", "ended"]),
        supabase
          .from("widget_ai_conversations")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .eq("status", "escalated"),
        supabase
          .from("widget_ai_conversations")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId),
      ])

      // Count waiting live-chat sessions
      const { count: waitingCount } = await supabase
        .from("widget_chat_sessions")
        .select("id", { count: "exact", head: true })
        .eq("status", "waiting")

      return {
        active: (activeResult.count || 0) + (aiActiveResult.count || 0),
        waiting: (waitingCount || 0) + (aiEscalatedResult.count || 0),
        ended: (endedResult.count || 0) + (aiEndedResult.count || 0),
        all: (allResult.count || 0) + (aiAllResult.count || 0),
      }
    },
    enabled: !!organizationId,
    refetchInterval: 10000,
  })

  // A selected id may belong to the AI table (widget_ai_conversations) instead
  // of the live-chat conversations table — pick the right detail view.
  const { data: isAiConversation } = useQuery({
    queryKey: ["selected-is-ai-conversation", selectedConversationId],
    enabled: !!selectedConversationId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!selectedConversationId) return false
      const { data } = await supabase
        .from("widget_ai_conversations")
        .select("id")
        .eq("id", selectedConversationId)
        .maybeSingle()
      return !!data
    },
  })

  const renderDetail = (id: string) =>
    isAiConversation ? (
      <AiConversationView conversationId={id} />
    ) : (
      <ConversationView conversationId={id} showSidePanel={false} />
    )

  const handleFilterChange = (filter: ChatFilterType) => {
    // Navigate to filter list view (no conversation in path)
    navigate(`/interactions/chat/${filter}`)
  }

  const handleSelectChat = (conversationId: string) => {
    navigate(`/interactions/chat/conversations/${conversationId}`)
  }

  const handleBack = () => {
    navigate(-1)
  }

  // ============ MOBILE: single column, list <-> conversation ============
  if (isMobile) {
    if (selectedConversationId) {
      return (
        <div className="flex flex-col h-full bg-card overflow-hidden">
          {renderDetail(selectedConversationId)}
        </div>
      )
    }

    return (
      <div className="flex flex-col h-full bg-card overflow-hidden">
        <ChannelPageHeader
          icon={MessageCircle}
          title="Live Chat"
          onOpenMetrics={() => setMetricsOpen(true)}
          actions={widgetSettingsButton}
        />

        <ChatFilters
          currentFilter={currentFilter}
          onFilterChange={handleFilterChange}
          counts={counts}
        />

        <LiveChatQueue className="border-b" compact />

        <div className="flex-1 min-h-0 overflow-hidden">
          <ChatConversationList
            filter={currentFilter}
            selectedId={undefined}
            onSelect={handleSelectChat}
          />
        </div>

        <LiveChatSlaDialog open={slaOpen} onOpenChange={setSlaOpen} canEdit={isAdmin} />
        <ChatMetricsDialog open={metricsOpen} onOpenChange={setMetricsOpen} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <ChannelPageHeader
        icon={MessageCircle}
        title="Live Chat"
        onOpenMetrics={() => setMetricsOpen(true)}
        actions={widgetSettingsButton}
      />

      {/* Main content */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left panel: Filters, Queue, and List */}
        <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
          <div className="flex flex-col h-full border-r">
            {/* Chat Filters */}
            <ChatFilters
              currentFilter={currentFilter}
              onFilterChange={handleFilterChange}
              counts={counts}
            />

            {/* Live Chat Queue - Prominent position */}
            <LiveChatQueue className="border-b" compact={false} />

            {/* Chat Conversation List */}
            <ChatConversationList
              filter={currentFilter}
              selectedId={selectedConversationId || undefined}
              onSelect={handleSelectChat}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right panel: Selected Chat View (customer history lives in Customer Details) */}
        <ResizablePanel defaultSize={65}>
          {selectedConversationId ? renderDetail(selectedConversationId) : <ChatEmptyState />}
        </ResizablePanel>
      </ResizablePanelGroup>

      <LiveChatSlaDialog open={slaOpen} onOpenChange={setSlaOpen} canEdit={isAdmin} />
      <ChatMetricsDialog open={metricsOpen} onOpenChange={setMetricsOpen} />
    </div>
  )
}

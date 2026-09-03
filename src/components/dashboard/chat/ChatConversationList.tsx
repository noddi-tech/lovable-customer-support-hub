import { useQuery, useQueryClient } from "@tanstack/react-query"
import { MessageCircle, Search, X } from "lucide-react"
import type React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { BrandFilterSelect } from "@/components/dashboard/conversation-list/BrandFilterSelect"
import { BulkAssignMenu } from "@/components/shared/BulkAssignMenu"
import { BulkTagMenu } from "@/components/tags/BulkTagMenu"
import { matchesTagFilter, TagFilterSelect } from "@/components/tags/TagFilterSelect"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/useAuth"
import { useBulkRangeSelect } from "@/hooks/useBulkRangeSelect"
import { useConversationStatusActions } from "@/hooks/useConversationStatusActions"
import { useEntityTags } from "@/hooks/useEntityTags"
import { supabase } from "@/integrations/supabase/client"
import { getConversationBrand } from "@/lib/conversationBrand"
import type { ChatFilterType } from "./ChatFilters"
import { ChatListItem } from "./ChatListItem"

interface ChatConversation {
  id: string
  subject: string | null
  preview_text: string | null
  status: string
  updated_at: string
  is_read: boolean
  metadata?: unknown
  sla_breach_at?: string | null
  customer: {
    id: string
    full_name: string | null
    email: string | null
  } | null
  session?: {
    id: string
    status: string
    visitor_name: string | null
    visitor_email: string | null
  } | null
  /** "live" = human live chat (conversations table); "ai" = AI chat (widget_ai_conversations). */
  source?: "live" | "ai"
  /** Raw AI conversation status: active | escalated | assigned | resolved | ended. */
  ai_status?: string
  /** True when an AI chat asked for a human and no agent has taken over yet. */
  is_escalated?: boolean
}

/** Which AI conversation statuses belong to each inbox filter tab. */
const AI_STATUS_BY_FILTER: Record<ChatFilterType, string[] | null> = {
  active: ["active", "escalated", "assigned"],
  ended: ["resolved", "ended"],
  waiting: ["escalated"],
  all: null, // no status constraint
}

interface ChatConversationListProps {
  filter: ChatFilterType
  selectedId?: string
  onSelect: (conversationId: string) => void
}

export const ChatConversationList: React.FC<ChatConversationListProps> = ({
  filter,
  selectedId,
  onSelect,
}) => {
  const { profile } = useAuth()
  const organizationId = profile?.organization_id
  const [searchQuery, setSearchQuery] = useState("")
  const [brandFilter, setBrandFilter] = useState<string>("all")
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const { getTags: getChatTags } = useEntityTags("conversation")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const { setStatus } = useConversationStatusActions()
  const queryClient = useQueryClient()

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["chat-conversations", organizationId, filter],
    queryFn: async (): Promise<ChatConversation[]> => {
      if (!organizationId) return []

      // Query conversations with channel = 'widget'
      let query = supabase
        .from("conversations")
        .select(`
          id,
          subject,
          preview_text,
          status,
          updated_at,
          is_read,
          metadata,
          sla_breach_at,
          customer:customers(id, full_name, email)
        `)
        .eq("organization_id", organizationId)
        .eq("channel", "widget")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(100)

      // Apply filter based on conversation status
      if (filter === "active") {
        query = query.in("status", ["open", "pending"]) // Include pending in active
      } else if (filter === "ended") {
        query = query.in("status", ["closed", "resolved"])
      }
      // 'waiting' and 'all' require session status check which we'll filter client-side

      const { data, error } = await query

      if (error) {
        console.error("[ChatConversationList] Error fetching:", error)
        throw error
      }

      // Get session info for each conversation
      const conversationIds = (data || []).map((c) => c.id)

      const { data: sessions } = await supabase
        .from("widget_chat_sessions")
        .select("id, conversation_id, status, visitor_name, visitor_email")
        .in("conversation_id", conversationIds)

      const sessionMap = new Map((sessions || []).map((s) => [s.conversation_id, s]))

      let liveResult: ChatConversation[] = (data || []).map((conv) => ({
        ...conv,
        source: "live" as const,
        session: sessionMap.get(conv.id) || null,
      }))

      // Filter by session status for 'waiting'
      if (filter === "waiting") {
        liveResult = liveResult.filter((c) => c.session?.status === "waiting")
      }

      // ── AI conversations (widget_ai_conversations) ──────────────────────────
      // These live in a separate table but belong in the same inbox. Every AI
      // chat shows here; escalated ones are flagged so a human can take over.
      let aiQuery = supabase
        .from("widget_ai_conversations")
        .select("id, status, summary, updated_at, visitor_email, escalated_at, metadata")
        .eq("organization_id", organizationId)
        .order("updated_at", { ascending: false })
        .limit(100)

      const aiStatuses = AI_STATUS_BY_FILTER[filter]
      if (aiStatuses) aiQuery = aiQuery.in("status", aiStatuses)

      const { data: aiData, error: aiError } = await aiQuery
      if (aiError) console.error("[ChatConversationList] AI fetch error:", aiError)

      const aiResult: ChatConversation[] = (aiData || []).map((c) => {
        const resolved = c.status === "resolved" || c.status === "ended"
        return {
          id: c.id,
          subject: null,
          preview_text: c.summary || "AI conversation",
          // Map onto a conversation-style status so shared UI (SLA, styling) behaves.
          status: resolved ? "resolved" : "open",
          updated_at: c.updated_at,
          is_read: true,
          metadata: c.metadata,
          sla_breach_at: null,
          customer: {
            id: c.id,
            full_name: c.visitor_email || null,
            email: c.visitor_email || null,
          },
          session: null,
          source: "ai" as const,
          ai_status: c.status,
          is_escalated: c.status === "escalated",
        }
      })

      // Merge both sources, newest first, cap at 100.
      return [...liveResult, ...aiResult]
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 100)
    },
    enabled: !!organizationId,
    refetchInterval: 5000, // Poll every 5 seconds for real-time updates
  })

  // Distinct brands present in the loaded chats (for the brand dropdown)
  const brandOptions = useMemo(() => {
    const map = new Map<string, string>()
    conversations.forEach((conv) => {
      const brand = getConversationBrand(conv.metadata, "widget")
      if (brand) map.set(brand.key, brand.label)
    })
    return Array.from(map, ([key, label]) => ({ key, label })).sort((a, b) =>
      a.label.localeCompare(b.label),
    )
  }, [conversations])

  // Filter conversations by brand + search query
  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return conversations.filter((conv) => {
      if (brandFilter !== "all") {
        const brand = getConversationBrand(conv.metadata, "widget")
        const brandKey = brand?.key ?? "unknown"
        if (brandKey !== brandFilter) return false
      }

      if (
        !matchesTagFilter(
          getChatTags(conv.id).map((t) => t.id),
          tagFilter,
        )
      )
        return false

      if (!query) return true

      const name = conv.session?.visitor_name || conv.customer?.full_name || ""
      const email = conv.session?.visitor_email || conv.customer?.email || ""
      const preview = conv.preview_text || ""

      return (
        name.toLowerCase().includes(query) ||
        email.toLowerCase().includes(query) ||
        preview.toLowerCase().includes(query)
      )
    })
  }, [conversations, searchQuery, brandFilter, tagFilter, getChatTags])

  const orderedIds = useMemo(() => filteredConversations.map((c) => c.id), [filteredConversations])

  const setSelection = useCallback((ids: string[], selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => {
        if (selected) next.add(id)
        else next.delete(id)
      })
      return next
    })
  }, [])

  const handleBulkSelect = useBulkRangeSelect(orderedIds, setSelection)
  const selectionMode = selectedIds.size > 0

  // Drop selections for chats that are no longer in the list
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev
      const visible = new Set(orderedIds)
      const next = new Set([...prev].filter((id) => visible.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [orderedIds])

  const applyBulkStatus = useCallback(
    async (status: "open" | "pending" | "closed") => {
      const ids = [...selectedIds]
      await Promise.all(ids.map((id) => setStatus(id, status)))
      setSelectedIds(new Set())
    },
    [selectedIds, setStatus],
  )

  const applyBulkAssign = useCallback(
    async (memberId: string | null) => {
      const ids = [...selectedIds]
      const { error } = await supabase
        .from("conversations")
        .update({ assigned_to_id: memberId })
        .in("id", ids)
      if (error) {
        toast.error("Failed to assign chats")
        return
      }
      toast.success(
        memberId ? `Assigned ${ids.length} chat(s)` : `Unassigned ${ids.length} chat(s)`,
      )
      void queryClient.invalidateQueries({ queryKey: ["chat-conversations"] })
      setSelectedIds(new Set())
    },
    [queryClient, selectedIds],
  )

  const allSelected =
    filteredConversations.length > 0 && filteredConversations.every((c) => selectedIds.has(c.id))

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search + brand filter */}
      <div className="p-2 border-b space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
        </div>

        <BrandFilterSelect
          value={brandFilter}
          onChange={setBrandFilter}
          options={brandOptions}
          triggerClassName="h-9 w-full text-sm"
        />

        <TagFilterSelect
          value={tagFilter}
          onChange={setTagFilter}
          className="w-full justify-start"
        />
      </div>

      {selectionMode && (
        <div className="flex items-center gap-2 border-b bg-muted/50 px-2 py-2">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(checked) => setSelection(orderedIds, checked === true)}
            aria-label="Select all chats"
          />
          <span className="text-xs font-medium">{selectedIds.size} selected</span>
          <div className="ml-auto flex flex-wrap items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => applyBulkStatus("open")}
            >
              Open
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => applyBulkStatus("pending")}
            >
              Pending
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => applyBulkStatus("closed")}
            >
              Close
            </Button>
            <BulkAssignMenu onAssign={applyBulkAssign} className="h-7 px-2 text-xs" />
            <BulkTagMenu
              entityType="conversation"
              entityIds={[...selectedIds]}
              className="h-7 px-2 text-xs"
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setSelectedIds(new Set())}
              aria-label="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {filteredConversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center px-4">
          <MessageCircle className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-sm font-medium text-foreground mb-1">
            {searchQuery ? "No matching chats" : "No chats found"}
          </h3>
          <p className="text-xs text-muted-foreground max-w-[200px]">
            {searchQuery
              ? "Try a different search term"
              : filter === "waiting"
                ? "No visitors are waiting for a chat"
                : filter === "active"
                  ? "No active chat sessions"
                  : "Chat conversations will appear here"}
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-1 p-2">
            {filteredConversations.map((conv) => (
              <ChatListItem
                key={conv.id}
                conv={conv}
                isSelected={selectedId === conv.id}
                onSelect={() => onSelect(conv.id)}
                isBulkSelected={selectedIds.has(conv.id)}
                selectionMode={selectionMode}
                onBulkSelect={handleBulkSelect}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}

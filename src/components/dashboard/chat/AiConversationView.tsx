import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { formatDistanceToNow } from "date-fns"
import { Bot, CheckCircle2, Loader2, Send, UserRound } from "lucide-react"
import type React from "react"
import { useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { cn } from "@/lib/utils"

interface AiConversationViewProps {
  conversationId: string
}

interface AiMessageRow {
  id: string
  role: string
  content: string
  created_at: string
}

interface AiConversationRow {
  id: string
  status: string
  visitor_email: string | null
  visitor_phone: string | null
  resolved_by: string | null
  summary: string | null
  updated_at: string
  metadata: unknown
}

/** assigned_agent_id has no dedicated column on widget_ai_conversations; we
 * track it inside the metadata JSON blob instead. */
const getAssignedAgentId = (metadata: unknown): string | null => {
  if (metadata && typeof metadata === "object" && "assigned_agent_id" in metadata) {
    const value = (metadata as Record<string, unknown>).assigned_agent_id
    return typeof value === "string" ? value : null
  }
  return null
}

const STATUS_LABEL: Record<string, string> = {
  active: "AI handling",
  escalated: "Needs human",
  assigned: "You're handling",
  resolved: "Resolved",
  ended: "Ended",
}

/**
 * Agent-facing view of an AI widget conversation. The agent can watch the AI
 * handle the chat, take over (claim) when the visitor asked for a human, reply
 * into the same thread (which pauses the AI), and mark it resolved.
 */
export const AiConversationView: React.FC<AiConversationViewProps> = ({ conversationId }) => {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [reply, setReply] = useState("")

  const { data: conversation } = useQuery({
    queryKey: ["ai-conversation", conversationId],
    queryFn: async (): Promise<AiConversationRow | null> => {
      const { data } = await supabase
        .from("widget_ai_conversations")
        .select(
          "id, status, visitor_email, visitor_phone, resolved_by, summary, updated_at, metadata",
        )
        .eq("id", conversationId)
        .maybeSingle()
      return data
    },
    refetchInterval: 4000,
  })

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["ai-conversation-messages", conversationId],
    queryFn: async (): Promise<AiMessageRow[]> => {
      const { data } = await supabase
        .from("widget_ai_messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
      return data || []
    },
    refetchInterval: 4000,
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["ai-conversation", conversationId] })
    void queryClient.invalidateQueries({ queryKey: ["ai-conversation-messages", conversationId] })
    void queryClient.invalidateQueries({ queryKey: ["chat-conversations"] })
    void queryClient.invalidateQueries({ queryKey: ["chat-counts"] })
  }

  // Claim: assigned agent is tracked in metadata (no dedicated column exists).
  const claim = async (): Promise<boolean> => {
    if (!profile?.id) return false
    const currentAssignee = getAssignedAgentId(conversation?.metadata)
    if (currentAssignee === profile.id) return true
    const existingMetadata =
      conversation?.metadata && typeof conversation.metadata === "object"
        ? (conversation.metadata as Record<string, unknown>)
        : {}
    const { data, error } = await supabase
      .from("widget_ai_conversations")
      .update({
        status: "assigned",
        metadata: {
          ...existingMetadata,
          assigned_agent_id: profile.id,
          assigned_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId)
      .select("id")
    if (error) {
      toast.error("Could not take over this chat")
      return false
    }
    if (!data || data.length === 0) {
      toast.error("Another agent already took over this chat")
      invalidate()
      return false
    }
    return true
  }

  const claimMutation = useMutation({
    mutationFn: claim,
    onSuccess: (ok) => ok && invalidate(),
  })

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!profile?.id) throw new Error("Not signed in")
      // Take over on first reply if not already assigned to me.
      if (getAssignedAgentId(conversation?.metadata) !== profile.id) {
        const ok = await claim()
        if (!ok) throw new Error("claim-failed")
      }
      const { error } = await supabase.from("widget_ai_messages").insert({
        conversation_id: conversationId,
        role: "agent",
        content,
      })
      if (error) throw error
      await supabase
        .from("widget_ai_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId)
    },
    onSuccess: () => {
      setReply("")
      invalidate()
    },
    onError: (err: Error) => {
      if (err.message !== "claim-failed") toast.error("Failed to send reply")
    },
  })

  const resolveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("widget_ai_conversations")
        .update({
          status: "resolved",
          resolved_by: profile?.id ?? null,
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Conversation resolved")
      invalidate()
    },
    onError: () => toast.error("Failed to resolve"),
  })

  const assignedAgentId = getAssignedAgentId(conversation?.metadata)
  const visitorName = conversation?.visitor_email || "Visitor"
  const status = conversation?.status ?? "active"
  const isResolved = status === "resolved" || status === "ended"

  const handleSend = () => {
    const content = reply.trim()
    if (!content || sendMutation.isPending) return
    sendMutation.mutate(content)
  }

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-violet-500 shrink-0" />
            <span className="font-medium truncate">{visitorName}</span>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-1.5 py-0",
                status === "escalated" &&
                  "bg-red-50 text-red-700 border-red-300 animate-pulse dark:bg-red-900/20 dark:text-red-400",
                status === "assigned" &&
                  "bg-green-50 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-400",
                status === "active" &&
                  "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400",
              )}
            >
              {STATUS_LABEL[status] ?? status}
            </Badge>
          </div>
          {conversation?.visitor_email && (
            <span className="text-xs text-muted-foreground">{conversation.visitor_email}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isResolved && assignedAgentId !== profile?.id && (
            <Button
              size="sm"
              variant={status === "escalated" ? "default" : "outline"}
              onClick={() => claimMutation.mutate()}
              disabled={claimMutation.isPending}
            >
              {claimMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserRound className="h-4 w-4 mr-1" />
              )}
              Take over
            </Button>
          )}
          {!isResolved && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => resolveMutation.mutate()}
              disabled={resolveMutation.isPending}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Resolve
            </Button>
          )}
        </div>
      </div>

      {status === "escalated" && (
        <div className="bg-red-50 dark:bg-red-900/10 border-b border-red-200 dark:border-red-900/30 px-4 py-2 text-xs text-red-700 dark:text-red-400">
          This customer asked to talk to a human. The AI is still replying — take over when ready.
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3 p-4">
            {messages
              .filter((m) => m.role !== "system")
              .map((m) => {
                const isVisitor = m.role === "user"
                const isAgent = m.role === "agent"
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "flex flex-col max-w-[80%]",
                      isVisitor ? "ml-auto items-end" : "items-start",
                    )}
                  >
                    <span className="text-[10px] text-muted-foreground mb-0.5">
                      {isVisitor ? visitorName : isAgent ? "Agent" : "AI Assistant"} ·{" "}
                      {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                    </span>
                    <div
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words",
                        isVisitor && "bg-primary text-primary-foreground",
                        isAgent &&
                          "bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-100",
                        !isVisitor && !isAgent && "bg-muted",
                      )}
                    >
                      {m.content}
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </ScrollArea>

      {/* Reply box */}
      {!isResolved ? (
        <div className="border-t p-3">
          <div className="flex items-end gap-2">
            <Textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Reply as a human agent… (this pauses the AI)"
              className="min-h-[44px] max-h-40 resize-none"
              rows={1}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!reply.trim() || sendMutation.isPending}
              aria-label="Send reply"
            >
              {sendMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Sending a reply takes over the chat from the AI. The visitor sees your messages in the
            widget.
          </p>
        </div>
      ) : (
        <div className="border-t p-3 text-center text-xs text-muted-foreground">
          This conversation is {STATUS_LABEL[status]?.toLowerCase() ?? status}.
        </div>
      )}
    </div>
  )
}

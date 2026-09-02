import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import {
  useCustomerCalls,
  useCustomerConversations,
  useCustomerNotes,
} from "@/hooks/useCustomerRecord"
import { supabase } from "@/integrations/supabase/client"

const sel = (s: string): string => s

export type TimelineChannel = "email" | "chat" | "phone" | "note" | "case"

export interface TimelineItem {
  id: string
  channel: TimelineChannel
  at: string
  title: string
  subtitle?: string | null
  status?: string | null
  caseId?: string | null
  /** Route to open when the row is clicked. */
  href?: string | null
}

function conversationChannel(channel?: string | null): TimelineChannel {
  const c = (channel || "").toLowerCase()
  if (c === "email") return "email"
  if (c === "widget" || c === "chat" || c === "live_chat") return "chat"
  if (c === "phone" || c === "voice") return "phone"
  return "email"
}

/** Cases belonging to a customer — lightweight select for timeline use. */
export function useCustomerCases(customerId?: string | null) {
  return useQuery({
    queryKey: ["customer-record", "cases", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("cases") as any)
        .select(sel("id, case_number, title, status, priority, created_at, updated_at, closed_at"))
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(50)
      if (error) return []
      return (data ?? []) as Array<{
        id: string
        case_number: number
        title: string
        status: string
        priority: string
        created_at: string
        updated_at: string
        closed_at: string | null
      }>
    },
  })
}

/**
 * One chronological stream of every interaction we have had with a customer:
 * email threads, live chat sessions, calls, internal notes and cases.
 */
export function useCustomerTimeline(
  customerId?: string | null,
  options?: { excludeConversationId?: string | null },
) {
  const conversations = useCustomerConversations(customerId, options?.excludeConversationId ?? null)
  const calls = useCustomerCalls(customerId)
  const notes = useCustomerNotes(customerId)
  const cases = useCustomerCases(customerId)

  const items = useMemo<TimelineItem[]>(() => {
    const out: TimelineItem[] = []

    for (const c of conversations.data ?? []) {
      out.push({
        id: `conversation:${c.id}`,
        channel: conversationChannel(c.channel),
        at: c.updated_at || c.received_at || new Date(0).toISOString(),
        title:
          c.subject || (conversationChannel(c.channel) === "chat" ? "Live chat" : "(no subject)"),
        subtitle: c.preview_text,
        status: c.status,
        caseId: c.case_id,
        href: `/c/${c.id}`,
      })
    }

    for (const call of calls.data ?? []) {
      const direction = call.direction === "outbound" ? "Outbound call" : "Inbound call"
      const mins = call.duration_seconds ? Math.round(call.duration_seconds / 60) : null
      out.push({
        id: `call:${call.id}`,
        channel: "phone",
        at: call.started_at || new Date(0).toISOString(),
        title: direction,
        subtitle: mins !== null ? `${mins} min` : null,
        status: call.status,
        caseId: call.case_id,
        href: null,
      })
    }

    for (const note of notes.data ?? []) {
      out.push({
        id: `note:${note.id}`,
        channel: "note",
        at: note.created_at,
        title: note.author?.full_name ? `Note by ${note.author.full_name}` : "Internal note",
        subtitle: note.content,
        status: note.is_pinned ? "pinned" : null,
        href: null,
      })
    }

    for (const kase of cases.data ?? []) {
      out.push({
        id: `case:${kase.id}`,
        channel: "case",
        at: kase.created_at,
        title: `Case #${kase.case_number} — ${kase.title}`,
        subtitle: null,
        status: kase.status,
        caseId: kase.id,
        href: `/operations/cases/${kase.id}`,
      })
    }

    return out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  }, [conversations.data, calls.data, notes.data, cases.data])

  return {
    items,
    isLoading: conversations.isLoading || calls.isLoading || notes.isLoading || cases.isLoading,
  }
}

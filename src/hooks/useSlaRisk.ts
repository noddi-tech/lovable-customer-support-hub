import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { supabase } from "@/integrations/supabase/client"

export interface SlaRiskConversation {
  id: string
  inbox_id: string | null
  channel: string | null
  subject: string | null
  sla_breach_at: string
}

export interface InboxSlaRisk {
  breached: number
  atRisk: number
  /** Earliest deadline among the breached / at-risk conversations. */
  nextDeadline: string | null
  nextConversationId: string | null
  channels: string[]
}

/** Conversations due within this window count as "about to break". */
export const SLA_AT_RISK_WINDOW_MS = 60 * 60 * 1000

/**
 * Open conversations that have already breached their SLA or will within the
 * hour, grouped per inbox — used to flag inboxes that need attention now.
 */
export function useSlaRiskByInbox(enabled = true) {
  const now = useMemo(() => new Date().toISOString(), [])
  const horizon = useMemo(() => new Date(Date.now() + SLA_AT_RISK_WINDOW_MS).toISOString(), [])

  const query = useQuery({
    queryKey: ["sla_risk_by_inbox"],
    enabled,
    staleTime: 60_000,
    refetchInterval: 120_000,
    queryFn: async (): Promise<SlaRiskConversation[]> => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, inbox_id, channel, subject, sla_breach_at")
        .not("sla_breach_at", "is", null)
        .lte("sla_breach_at", horizon)
        // Match the inbox open-count semantics (get_all_counts): only conversations
        // that actually show as open count toward the SLA badge. Previously this used
        // `status NOT IN (closed, resolved)` with no snooze filter, so pending or
        // snoozed threads inflated the breach count even when open_count was 0.
        .eq("status", "open")
        .or(`snooze_until.is.null,snooze_until.lte.${now}`)
        // Soft-deleted / archived threads are not in the inbox list, so they
        // must not be counted as SLA breaches either.
        .is("deleted_at", null)
        .eq("is_archived", false)
        .order("sla_breach_at", { ascending: true })
        .limit(500)
      if (error) throw error
      return (data ?? []) as SlaRiskConversation[]
    },
  })

  const byInbox = useMemo(() => {
    const map = new Map<string, InboxSlaRisk>()
    const now = Date.now()
    for (const row of query.data ?? []) {
      if (!row.inbox_id || !row.sla_breach_at) continue
      const due = new Date(row.sla_breach_at).getTime()
      if (!Number.isFinite(due)) continue
      const entry = map.get(row.inbox_id) ?? {
        breached: 0,
        atRisk: 0,
        nextDeadline: null,
        nextConversationId: null,
        channels: [],
      }
      if (due <= now) entry.breached += 1
      else entry.atRisk += 1
      if (!entry.nextDeadline || due < new Date(entry.nextDeadline).getTime()) {
        entry.nextDeadline = row.sla_breach_at
        entry.nextConversationId = row.id
      }
      if (row.channel && !entry.channels.includes(row.channel)) entry.channels.push(row.channel)
      map.set(row.inbox_id, entry)
    }
    return map
  }, [query.data])

  return { ...query, byInbox }
}

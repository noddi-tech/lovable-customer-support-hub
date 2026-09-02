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
  const horizon = useMemo(() => new Date(Date.now() + SLA_AT_RISK_WINDOW_MS).toISOString(), [])

  const query = useQuery({
    queryKey: ["sla_risk_by_inbox"],
    enabled,
    staleTime: 60_000,
    refetchInterval: 120_000,
    queryFn: async (): Promise<SlaRiskConversation[]> => {
      // Uses the same thread de-duplication as get_all_counts / get_inbox_counts,
      // so the SLA badge can never disagree with the inbox open count (previously a
      // thread whose latest conversation was closed still contributed breaches).
      const { data, error } = await supabase.rpc("get_sla_risk_by_inbox", {
        p_horizon: horizon,
      })
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

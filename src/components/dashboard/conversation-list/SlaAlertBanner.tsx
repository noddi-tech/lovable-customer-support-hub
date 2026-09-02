import { AlertTriangle, ArrowRight, Timer } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Conversation } from "@/contexts/ConversationListContext"
import { formatCountdown } from "@/lib/sla"
import { cn } from "@/lib/utils"

/** Anything due within this window counts as "about to break". */
const AT_RISK_WINDOW_MS = 60 * 60 * 1000

const CHANNEL_LABELS: Record<string, string> = {
  email: "email",
  sms: "text message",
  widget: "chat",
}

function isOpen(c: Conversation) {
  return c.status !== "closed" && c.status !== "resolved"
}

interface SlaAlertBannerProps {
  conversations: Conversation[]
  onSelectConversation: (conversation: Conversation) => void
}

/**
 * Loud, actionable banner shown above the conversation list whenever this inbox
 * has conversations that have breached their SLA or are about to.
 */
export function SlaAlertBanner({ conversations, onSelectConversation }: SlaAlertBannerProps) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000)
    return () => window.clearInterval(id)
  }, [])

  const { breached, atRisk, mostUrgent, channelSummary } = useMemo(() => {
    const breachedList: Conversation[] = []
    const atRiskList: Conversation[] = []

    for (const c of conversations) {
      if (!c.sla_breach_at || !isOpen(c)) continue
      const due = new Date(c.sla_breach_at).getTime()
      if (!Number.isFinite(due)) continue
      const remaining = due - now
      if (remaining <= 0) breachedList.push(c)
      else if (remaining <= AT_RISK_WINDOW_MS) atRiskList.push(c)
    }

    const byDeadline = [...breachedList, ...atRiskList].sort(
      (a, b) => new Date(a.sla_breach_at!).getTime() - new Date(b.sla_breach_at!).getTime(),
    )

    const counts = new Map<string, number>()
    for (const c of byDeadline) {
      const key = CHANNEL_LABELS[c.channel] ?? c.channel
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }

    return {
      breached: breachedList,
      atRisk: atRiskList,
      mostUrgent: byDeadline[0],
      channelSummary: [...counts.entries()].map(
        ([label, n]) => `${n} ${label}${n === 1 ? "" : "s"}`,
      ),
    }
  }, [conversations, now])

  if (!mostUrgent) return null

  const hasBreached = breached.length > 0
  const urgentRemaining = new Date(mostUrgent.sla_breach_at!).getTime() - now

  return (
    <div
      role="alert"
      className={cn(
        "mx-2 mt-2 mb-1 rounded-md border-l-4 px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-2",
        hasBreached
          ? "border-l-red-600 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800"
          : "border-l-amber-500 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800",
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          hasBreached ? "bg-red-600 text-white animate-pulse" : "bg-amber-500 text-white",
        )}
      >
        {hasBreached ? <AlertTriangle className="h-4 w-4" /> : <Timer className="h-4 w-4" />}
      </span>

      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "text-sm font-semibold",
            hasBreached ? "text-red-700 dark:text-red-300" : "text-amber-800 dark:text-amber-300",
          )}
        >
          {hasBreached
            ? `${breached.length} conversation${breached.length === 1 ? " has" : "s have"} broken their SLA`
            : `${atRisk.length} conversation${atRisk.length === 1 ? "" : "s"} about to break SLA`}
          {hasBreached && atRisk.length > 0 && ` · ${atRisk.length} more within the hour`}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {channelSummary.join(" · ")} · next deadline{" "}
          {urgentRemaining <= 0
            ? `overdue by ${formatCountdown(urgentRemaining)}`
            : `in ${formatCountdown(urgentRemaining)}`}
          {mostUrgent.subject ? ` — “${mostUrgent.subject}”` : ""}
        </div>
      </div>

      {hasBreached && (
        <Badge variant="destructive" className="shrink-0 tabular-nums">
          {breached.length} overdue
        </Badge>
      )}

      <Button
        size="sm"
        variant={hasBreached ? "destructive" : "default"}
        className="shrink-0 h-7"
        onClick={() => onSelectConversation(mostUrgent)}
      >
        Fix now <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

export default SlaAlertBanner

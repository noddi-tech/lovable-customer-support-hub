import { Loader2, RotateCcw, Timer } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { attainmentTone, MetricTile } from "@/components/dashboard/MetricTile"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  SLA_PRIORITIES,
  type SlaPriority,
  useChannelSlaPolicies,
  useSaveChannelSla,
} from "@/hooks/useChannelSla"
import { formatMinutes, formatPct, useInboxSupportMetrics } from "@/hooks/useInboxSupportMetrics"

const CHANNEL = "widget"
const RANGES = [7, 30, 90] as const

const PRIORITY_LABELS: Record<SlaPriority, string> = {
  urgent: "Urgent",
  high: "High",
  normal: "Normal",
  low: "Low",
}

interface RowState {
  first: string
  resolution: string
}

interface LiveChatSlaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  canEdit?: boolean
}

/**
 * Support view for live chat: how chat is performing against its targets, plus
 * the chat-specific SLA targets themselves (falling back to the general
 * organization targets when no chat override exists).
 */
export function LiveChatSlaDialog({ open, onOpenChange, canEdit = false }: LiveChatSlaDialogProps) {
  const [days, setDays] = useState<number>(30)
  const { data: metrics, isLoading: metricsLoading } = useInboxSupportMetrics(
    null,
    days,
    open,
    CHANNEL,
  )
  const { data: policies = [], isLoading: policiesLoading } = useChannelSlaPolicies(CHANNEL, open)
  const { save, reset } = useSaveChannelSla(CHANNEL)
  const [rows, setRows] = useState<Record<SlaPriority, RowState>>(
    {} as Record<SlaPriority, RowState>,
  )

  const byPriority = useMemo(() => {
    const map: Record<
      string,
      { own?: (typeof policies)[number]; general?: (typeof policies)[number] }
    > = {}
    for (const p of policies) {
      map[p.priority] = map[p.priority] || {}
      if (p.channel === CHANNEL) map[p.priority].own = p
      else if (p.channel === null) map[p.priority].general = p
    }
    return map
  }, [policies])

  useEffect(() => {
    const next = {} as Record<SlaPriority, RowState>
    for (const priority of SLA_PRIORITIES) {
      const entry = byPriority[priority]
      const effective = entry?.own || entry?.general
      next[priority] = {
        first: String(effective?.first_response_minutes ?? 15),
        resolution: String(effective?.resolution_minutes ?? 60),
      }
    }
    setRows(next)
  }, [byPriority])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="h-4 w-4" /> Live chat service levels
          </DialogTitle>
          <DialogDescription>
            How live chat is tracking against its targets, and the targets themselves. Chat targets
            override the general organization targets for chat conversations only.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-1">
          {RANGES.map((r) => (
            <Button
              key={r}
              size="sm"
              variant={days === r ? "secondary" : "ghost"}
              className="h-7 px-2 text-xs"
              onClick={() => setDays(r)}
            >
              Last {r} days
            </Button>
          ))}
        </div>

        {metricsLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading chat performance…
          </div>
        ) : metrics ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <MetricTile
              label="First reply SLA"
              value={formatPct(metrics.first_response.sla_attainment_pct)}
              tone={attainmentTone(metrics.first_response.sla_attainment_pct)}
              description={`Chats answered within the target (${formatMinutes(metrics.first_response.sla_target_minutes)}).`}
            />
            <MetricTile
              label="Median first reply"
              value={formatMinutes(metrics.first_response.median_minutes)}
              description="Typical wait before an agent answers a chat."
            />
            <MetricTile
              label="Breaching now"
              value={String(metrics.backlog.breaching_now)}
              tone={metrics.backlog.breaching_now > 0 ? "bad" : "good"}
              description="Open chats already past their first-reply target."
            />
            <MetricTile
              label="Waiting on us"
              value={String(metrics.backlog.awaiting_us)}
              description="Open chats where the visitor sent the last message."
            />
          </div>
        ) : null}

        <Separator />

        <div className="space-y-3">
          {policiesLoading ? (
            <p className="text-sm text-muted-foreground">Loading targets…</p>
          ) : (
            SLA_PRIORITIES.map((priority) => {
              const entry = byPriority[priority]
              const row = rows[priority] || { first: "", resolution: "" }
              const isOverride = Boolean(entry?.own)
              const general = entry?.general

              return (
                <div key={priority} className="rounded-md border p-3 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{PRIORITY_LABELS[priority]}</span>
                    <Badge variant={isOverride ? "default" : "secondary"} className="text-[10px]">
                      {isOverride ? "Live chat target" : "General target"}
                    </Badge>
                    {general && (
                      <span className="text-[11px] text-muted-foreground">
                        General: {formatMinutes(general.first_response_minutes)} first reply ·{" "}
                        {formatMinutes(general.resolution_minutes)} resolution
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={`chat-sla-first-${priority}`} className="text-xs">
                        First reply target (minutes)
                      </Label>
                      <Input
                        id={`chat-sla-first-${priority}`}
                        type="number"
                        min={1}
                        disabled={!canEdit}
                        value={row.first}
                        onChange={(e) =>
                          setRows((prev) => ({
                            ...prev,
                            [priority]: { ...prev[priority], first: e.target.value },
                          }))
                        }
                      />
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatMinutes(Number(row.first))}
                      </p>
                    </div>
                    <div>
                      <Label htmlFor={`chat-sla-res-${priority}`} className="text-xs">
                        Resolution target (minutes)
                      </Label>
                      <Input
                        id={`chat-sla-res-${priority}`}
                        type="number"
                        min={1}
                        disabled={!canEdit}
                        value={row.resolution}
                        onChange={(e) =>
                          setRows((prev) => ({
                            ...prev,
                            [priority]: { ...prev[priority], resolution: e.target.value },
                          }))
                        }
                      />
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatMinutes(Number(row.resolution))}
                      </p>
                    </div>
                  </div>

                  {canEdit && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={save.isPending || !Number(row.first) || !Number(row.resolution)}
                        onClick={() =>
                          save.mutate({
                            priority,
                            firstResponseMinutes: Number(row.first),
                            resolutionMinutes: Number(row.resolution),
                          })
                        }
                      >
                        Save {PRIORITY_LABELS[priority].toLowerCase()} target
                      </Button>
                      {isOverride && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={reset.isPending}
                          onClick={() => reset.mutate(priority)}
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Use general target
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          The chat clock starts when the visitor's message arrives and stops on the first agent
          reply. Chat badges and breach alerts use these targets.
        </p>
      </DialogContent>
    </Dialog>
  )
}

export default LiveChatSlaDialog

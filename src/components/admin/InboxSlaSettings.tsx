import { RotateCcw, Timer } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  SLA_PRIORITIES,
  type SlaPriority,
  useInboxSlaPolicies,
  useSaveInboxSla,
} from "@/hooks/useInboxSla"
import { formatMinutes } from "@/hooks/useInboxSupportMetrics"

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

export function InboxSlaSettings({ inboxId }: { inboxId: string }) {
  const { data: policies = [], isLoading } = useInboxSlaPolicies(inboxId)
  const { save, reset } = useSaveInboxSla(inboxId)
  const [rows, setRows] = useState<Record<SlaPriority, RowState>>(
    {} as Record<SlaPriority, RowState>,
  )

  const byPriority = useMemo(() => {
    const map: Record<
      string,
      { own?: (typeof policies)[number]; org?: (typeof policies)[number] }
    > = {}
    for (const p of policies) {
      map[p.priority] = map[p.priority] || {}
      if (p.inbox_id === inboxId) map[p.priority].own = p
      else if (p.inbox_id === null) map[p.priority].org = p
    }
    return map
  }, [policies, inboxId])

  useEffect(() => {
    const next = {} as Record<SlaPriority, RowState>
    for (const priority of SLA_PRIORITIES) {
      const entry = byPriority[priority]
      const effective = entry?.own || entry?.org
      next[priority] = {
        first: String(effective?.first_response_minutes ?? 240),
        resolution: String(effective?.resolution_minutes ?? 1440),
      }
    }
    setRows(next)
  }, [byPriority])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="w-4 h-4" /> SLA levels
        </CardTitle>
        <CardDescription>
          First-reply and resolution targets for conversations landing in this inbox. Targets are
          set per priority; when no inbox-specific value exists, the organization default applies.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading SLA targets…</p>
        ) : (
          SLA_PRIORITIES.map((priority) => {
            const entry = byPriority[priority]
            const row = rows[priority] || { first: "", resolution: "" }
            const isOverride = Boolean(entry?.own)
            const orgDefault = entry?.org

            return (
              <div key={priority} className="rounded-md border p-3 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{PRIORITY_LABELS[priority]}</span>
                  <Badge variant={isOverride ? "default" : "secondary"} className="text-[10px]">
                    {isOverride ? "Inbox override" : "Organization default"}
                  </Badge>
                  {orgDefault && (
                    <span className="text-[11px] text-muted-foreground">
                      Org default: {formatMinutes(orgDefault.first_response_minutes)} first reply ·{" "}
                      {formatMinutes(orgDefault.resolution_minutes)} resolution
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`sla-first-${priority}`} className="text-xs">
                      First reply target (minutes)
                    </Label>
                    <Input
                      id={`sla-first-${priority}`}
                      type="number"
                      min={1}
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
                    <Label htmlFor={`sla-res-${priority}`} className="text-xs">
                      Resolution target (minutes)
                    </Label>
                    <Input
                      id={`sla-res-${priority}`}
                      type="number"
                      min={1}
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
                    Save {PRIORITY_LABELS[priority].toLowerCase()} SLA
                  </Button>
                  {isOverride && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={reset.isPending}
                      onClick={() => reset.mutate(priority)}
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Use org default
                    </Button>
                  )}
                </div>
              </div>
            )
          })
        )}
        <p className="text-xs text-muted-foreground">
          The first-reply clock starts when the email arrives and stops on the first outgoing agent
          reply. Breach warnings and Slack alerts use these targets.
        </p>
      </CardContent>
    </Card>
  )
}

export default InboxSlaSettings

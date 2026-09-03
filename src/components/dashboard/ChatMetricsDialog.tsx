import { MessageSquare } from "lucide-react"
import { useState } from "react"
import { attainmentTone, MetricTile } from "@/components/dashboard/MetricTile"
import { MetricsDialogShell } from "@/components/dashboard/shared/MetricsDialogShell"
import { Separator } from "@/components/ui/separator"
import { formatMinutes, formatPct } from "@/hooks/useInboxSupportMetrics"
import { useNoddiBrands } from "@/hooks/useNoddiBrands"
import { useChatSupportMetrics } from "@/hooks/useSupportKpis"

interface ChatMetricsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChatMetricsDialog({ open, onOpenChange }: ChatMetricsDialogProps) {
  const [days, setDays] = useState<number>(30)
  const { data, isLoading, error } = useChatSupportMetrics(days, open)
  const { findBrand } = useNoddiBrands()

  return (
    <MetricsDialogShell
      open={open}
      onOpenChange={onOpenChange}
      icon={MessageSquare}
      title="Live chat KPIs"
      description="Chat performance in total and per brand. Hover any tile to see what it measures."
      days={days}
      onDaysChange={setDays}
      isLoading={isLoading}
      loadingLabel="Calculating chat metrics…"
      error={error ?? null}
    >
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <MetricTile
              label="Chats"
              value={String(data.totals.chats)}
              hint={`${data.totals.per_day}/day`}
              description="Chat conversations started in this period. Use the per-day figure to plan how many agents need to be available during opening hours."
            />
            <MetricTile
              label="Median first reply"
              value={formatMinutes(data.totals.median_first_response_minutes)}
              description="Typical wait before an agent answers a chat. Chat is a synchronous channel — visitors abandon fast, so the healthy target is under a couple of minutes during staffed hours."
            />
            <MetricTile
              label="Resolution rate"
              value={formatPct(data.totals.resolution_rate_pct)}
              tone={attainmentTone(data.totals.resolution_rate_pct)}
              description="Share of chats from this period that are now closed. A falling rate means chats are being left hanging rather than wrapped up."
            />
            <MetricTile
              label="Unanswered"
              value={String(data.totals.unanswered)}
              tone={data.totals.unanswered > 0 ? "bad" : "good"}
              hint={`${data.totals.abandoned} closed without a reply`}
              description="Open chats where no agent has replied at all. Every one of these is a visitor still waiting; chats closed with no reply at all are counted separately as abandoned."
            />
            <MetricTile
              label="P90 first reply"
              value={formatMinutes(data.totals.p90_first_response_minutes)}
              description="90% of chat visitors were answered faster than this. It shows the experience of your unluckiest visitors, usually outside staffed hours."
            />
            <MetricTile
              label="Median handle time"
              value={formatMinutes(data.totals.median_resolution_minutes)}
              description="Typical time from the chat starting to it being closed. Rising handle time usually means chats are being parked instead of resolved live."
            />
            <MetricTile
              label="Replies / chat"
              value={data.totals.avg_agent_replies?.toFixed(2) ?? "—"}
              description="Average agent messages per chat. Very low values can mean chats end before a real answer; very high values mean long back-and-forth that a better canned reply or knowledge entry could shorten."
            />
            <MetricTile
              label="Visitor messages"
              value={data.totals.avg_customer_messages?.toFixed(2) ?? "—"}
              description="Average messages sent by the visitor per chat. A high count next to few agent replies is a sign the visitor is repeating themselves while waiting."
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Per brand</h3>
            {data.by_brand.length === 0 ? (
              <p className="text-sm text-muted-foreground">No chats in this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="text-left font-medium py-1.5">Brand</th>
                      <th className="text-right font-medium py-1.5">Chats</th>
                      <th className="text-right font-medium py-1.5">Resolved</th>
                      <th className="text-right font-medium py-1.5">Median 1st reply</th>
                      <th className="text-right font-medium py-1.5">Avg handle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_brand.map((row) => {
                      const brand = findBrand(row.brand)
                      return (
                        <tr key={row.brand} className="border-t">
                          <td className="py-1.5">
                            <span className="inline-flex items-center gap-2">
                              {brand?.logo_url ? (
                                <img
                                  src={brand.logo_url}
                                  alt=""
                                  className="h-4 w-4 rounded-sm object-contain"
                                  loading="lazy"
                                />
                              ) : (
                                <span
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{
                                    backgroundColor:
                                      brand?.color_primary || "hsl(var(--muted-foreground))",
                                  }}
                                />
                              )}
                              {row.brand}
                            </span>
                          </td>
                          <td className="py-1.5 text-right tabular-nums">{row.chats}</td>
                          <td className="py-1.5 text-right tabular-nums">
                            {row.resolved} ({formatPct(row.resolution_rate_pct)})
                          </td>
                          <td className="py-1.5 text-right tabular-nums">
                            {formatMinutes(row.median_first_response_minutes)}
                          </td>
                          <td className="py-1.5 text-right tabular-nums">
                            {formatMinutes(row.avg_resolution_minutes)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Brand comes from the conversation's brand label, falling back to the widget's company
              name.
            </p>
          </div>
        </div>
      )}
    </MetricsDialogShell>
  )
}

export default ChatMetricsDialog

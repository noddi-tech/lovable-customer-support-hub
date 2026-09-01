import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subDays } from 'date-fns';
import { ArrowRight, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MetricTile, attainmentTone } from '@/components/dashboard/MetricTile';
import { MetricsDialogShell } from '@/components/dashboard/shared/MetricsDialogShell';
import { useCallAnalytics } from '@/hooks/useCallAnalytics';

interface VoiceMetricsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function trendLabel(pct: number | null | undefined) {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return undefined;
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct}% vs previous period`;
}

/** Voice KPIs in the same popup frame the inbox and live chat use. */
export function VoiceMetricsDialog({ open, onOpenChange }: VoiceMetricsDialogProps) {
  const navigate = useNavigate();
  const [days, setDays] = useState<number>(30);

  const range = useMemo(() => ({ from: subDays(new Date(), days), to: new Date() }), [days]);
  const { data, isLoading } = useCallAnalytics(open ? range : undefined);

  const metrics = data?.metrics;
  const agents = data?.agentStats ?? [];

  return (
    <MetricsDialogShell
      open={open}
      onOpenChange={onOpenChange}
      icon={Phone}
      title="Voice KPIs"
      description="Call performance for the selected period. Hover any tile to see what it measures."
      days={days}
      onDaysChange={setDays}
      isLoading={isLoading}
      loadingLabel="Calculating call metrics…"
      toolbarExtra={
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1.5 px-2 text-xs"
          onClick={() => {
            onOpenChange(false);
            navigate('/voice/analytics');
          }}
        >
          Full analytics <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      }
      footer="Answer rate counts completed calls against all calls received in the period; talk time excludes ringing."
    >
      {metrics && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <MetricTile
              label="Calls"
              value={String(metrics.totalCalls)}
              hint={trendLabel(metrics.callsTrend)}
              description="Total inbound and outbound calls in the period. Compare with the previous period to spot demand spikes that need extra phone coverage."
            />
            <MetricTile
              label="Answer rate"
              value={`${metrics.answerRate}%`}
              tone={attainmentTone(metrics.answerRate)}
              hint={trendLabel(metrics.answerRateTrend)}
              description="Share of calls that were answered rather than missed. Below 90% usually means not enough agents are available during peak hours."
            />
            <MetricTile
              label="Missed calls"
              value={String(metrics.missedCalls)}
              tone={metrics.missedCalls > 0 ? 'warn' : 'good'}
              hint={trendLabel(metrics.missedTrend)}
              description="Calls that rang out without an agent picking up. Each one is a customer who has to call back or write in instead."
            />
            <MetricTile
              label="Avg talk time"
              value={`${metrics.avgDuration} min`}
              hint={trendLabel(metrics.durationTrend)}
              description="Average length of an answered call. Rising talk time can mean more complex issues or missing information agents have to look up mid-call."
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Per agent</h3>
            {agents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No calls in this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="text-left font-medium py-1.5">Agent</th>
                      <th className="text-right font-medium py-1.5">Calls</th>
                      <th className="text-right font-medium py-1.5">Answered</th>
                      <th className="text-right font-medium py-1.5">Missed</th>
                      <th className="text-right font-medium py-1.5">Avg talk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.slice(0, 8).map((agent: any) => (
                      <tr key={agent.id} className="border-t">
                        <td className="py-1.5">{agent.name}</td>
                        <td className="py-1.5 text-right tabular-nums">{agent.totalCalls}</td>
                        <td className="py-1.5 text-right tabular-nums">
                          {agent.answeredCalls} ({agent.answerRate}%)
                        </td>
                        <td className="py-1.5 text-right tabular-nums">{agent.missedCalls}</td>
                        <td className="py-1.5 text-right tabular-nums">
                          {Math.round(agent.avgDuration / 60)} min
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              Period: last {days} days
            </Badge>
          </div>
        </div>
      )}
    </MetricsDialogShell>
  );
}

export default VoiceMetricsDialog;

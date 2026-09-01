import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Timer, CheckCircle2, Gauge, Layers } from 'lucide-react';
import { MetricTile as Metric, attainmentTone } from '@/components/dashboard/MetricTile';
import { MetricsDialogShell } from '@/components/dashboard/shared/MetricsDialogShell';
import {
  useInboxSupportMetrics,
  formatMinutes,
  formatPct,
} from '@/hooks/useInboxSupportMetrics';

function SectionTitle({ icon: Icon, children }: { icon: typeof Timer; children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-medium">
      <Icon className="h-4 w-4 text-muted-foreground" />
      {children}
    </h3>
  );
}

interface InboxMetricsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inboxId: string | null;
  inboxName: string;
}

export function InboxMetricsDialog({ open, onOpenChange, inboxId, inboxName }: InboxMetricsDialogProps) {
  const [days, setDays] = useState<number>(30);
  const { data, isLoading, error } = useInboxSupportMetrics(inboxId, days, open);

  return (
    <MetricsDialogShell
      open={open}
      onOpenChange={onOpenChange}
      icon={Gauge}
      title={`${inboxName} — support KPIs`}
      description="Standard ticketing metrics for this inbox. Hover any tile to see exactly what it measures."
      days={days}
      onDaysChange={setDays}
      isLoading={isLoading}
      error={(error as Error) ?? null}
    >
      {data && (
          <div className="space-y-5">
            <section className="space-y-2">
              <SectionTitle icon={Timer}>First reply</SectionTitle>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Metric
                  label="FRT SLA met"
                  value={formatPct(data.first_response.sla_attainment_pct)}
                  tone={attainmentTone(data.first_response.sla_attainment_pct)}
                  hint={`Target ${formatMinutes(data.first_response.sla_target_minutes)}`}
                  description="Share of conversations answered within the first-reply SLA configured for the inbox and priority. Industry benchmark for email support is 90%+. Fix by adding coverage at the hours where breaches cluster."
                />
                <Metric
                  label="Median FRT"
                  value={formatMinutes(data.first_response.median_minutes)}
                  description="Median time from an email arriving to the first outgoing agent reply. Median is the honest 'typical' number — averages get skewed by a few overnight tickets."
                />
                <Metric
                  label="Avg FRT"
                  value={formatMinutes(data.first_response.avg_minutes)}
                  description="Mean first response time across all answered conversations in the period. Compare against the median: a much higher average means a long tail of slow tickets."
                />
                <Metric
                  label="P90 FRT"
                  value={formatMinutes(data.first_response.p90_minutes)}
                  description="90% of customers waited less than this for their first reply. This is what your least-lucky customers experience and is the number SLA breaches come from."
                />
              </div>
            </section>

            <Separator />

            <section className="space-y-2">
              <SectionTitle icon={CheckCircle2}>Resolution</SectionTitle>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Metric
                  label="Resolution SLA met"
                  value={formatPct(data.resolution.sla_attainment_pct)}
                  tone={attainmentTone(data.resolution.sla_attainment_pct)}
                  hint={`Target ${formatMinutes(data.resolution.sla_target_minutes)}`}
                  description="Share of closed conversations that were closed inside the resolution target for their priority. Measured from the first inbound message to the moment the conversation was closed."
                />
                <Metric
                  label="Median resolution"
                  value={formatMinutes(data.resolution.median_minutes)}
                  description="Typical full handling time, from the customer's first message to the conversation being closed. The core 'how long does it take to actually solve it' metric."
                />
                <Metric
                  label="P90 resolution"
                  value={formatMinutes(data.resolution.p90_minutes)}
                  description="90% of resolved conversations were closed faster than this. Long tails here usually mean tickets waiting on another team or on the customer."
                />
                <Metric
                  label="Resolution rate"
                  value={formatPct(data.resolution.resolution_rate_pct)}
                  tone={attainmentTone(data.resolution.resolution_rate_pct)}
                  description="Of the conversations received in this period, how many are already closed. Below ~85% over a 30-day window means backlog is growing faster than it is cleared."
                />
              </div>
            </section>

            <Separator />

            <section className="space-y-2">
              <SectionTitle icon={Gauge}>Efficiency & volume</SectionTitle>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Metric
                  label="One-touch"
                  value={formatPct(data.efficiency.one_touch_pct)}
                  description="Conversations resolved with a single agent reply. High one-touch rates mean answers are clear and complete first time; a low rate points to missing information in the first reply or a gap in the knowledge base."
                />
                <Metric
                  label="Replies / ticket"
                  value={data.efficiency.avg_agent_replies?.toFixed(2) ?? '—'}
                  description="Average number of outgoing agent messages per resolved conversation (internal notes excluded). Rising values mean more back-and-forth per case."
                />
                <Metric
                  label="Received"
                  value={String(data.volume.received)}
                  hint={`${data.volume.per_day}/day`}
                  description="New conversations that arrived in this inbox during the period. Use with staffing to size coverage — volume per day is the key input for shift planning."
                />
                <Metric
                  label="Closed"
                  value={String(data.volume.closed)}
                  description="Conversations from this period that are now closed. Compare with Received: closed should track received or the queue grows."
                />
              </div>
            </section>

            <Separator />

            <section className="space-y-2">
              <SectionTitle icon={Layers}>Backlog right now</SectionTitle>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Metric
                  label="Open"
                  value={String(data.backlog.open)}
                  description="All conversations in this inbox that are not closed, regardless of age. This is your live queue depth."
                />
                <Metric
                  label="Awaiting us"
                  value={String(data.backlog.awaiting_us)}
                  tone={data.backlog.awaiting_us > 0 ? 'warn' : 'good'}
                  description="Open conversations where the last message came from the customer — the ball is in your court. This is the number to drive to zero each day."
                />
                <Metric
                  label="SLA breached"
                  value={String(data.backlog.breaching_now)}
                  tone={data.backlog.breaching_now > 0 ? 'bad' : 'good'}
                  hint={`${data.backlog.at_risk_2h} at risk in 2h`}
                  description="Open conversations that have passed their first-reply deadline without an answer. Anything above zero needs immediate follow-up; 'at risk' are those breaching within two hours."
                />
                <Metric
                  label="Unassigned"
                  value={String(data.backlog.unassigned)}
                  tone={data.backlog.unassigned > 0 ? 'warn' : 'good'}
                  hint={
                    data.backlog.oldest_open_hours !== null
                      ? `Oldest open: ${formatMinutes((data.backlog.oldest_open_hours || 0) * 60)}`
                      : undefined
                  }
                  description="Open conversations with no owner. Unowned tickets are the most common cause of SLA breaches — auto-assignment on the inbox settings page removes them."
                />
              </div>
            </section>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge variant="outline" className="text-[10px]">
                Period: last {data.days} days
              </Badge>
              <span className="text-[11px] text-muted-foreground">
                First reply is measured from arrival to the first outgoing agent message; resolution from
                arrival to close.
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default InboxMetricsDialog;

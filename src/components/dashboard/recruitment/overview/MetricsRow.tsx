import { Card, CardContent } from '@/components/ui/card';
import type { OversiktMetrics } from '@/hooks/recruitment/useOversiktMetrics';

interface Props {
  data: OversiktMetrics['metrics'];
}

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className="text-3xl font-semibold mt-1">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-2">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export default function MetricsRow({ data }: Props) {
  const sourceSub = data.new_applicants_by_source
    .slice(0, 3)
    .map((s) => `${s.source}: ${s.count}`)
    .join(' · ');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard label="Nye søkere" value={data.new_applicants_count} sub={sourceSub || undefined} />
      <MetricCard label="Ansatt" value={data.hired_count} sub={data.conversion_rate_overall != null ? `${data.conversion_rate_overall}% konvertering` : undefined} />
      <MetricCard label="Avvist" value={data.rejected_count} />
      <MetricCard
        label="Snittid til ansettelse"
        value={data.average_days_to_hire != null ? `${data.average_days_to_hire} d` : '—'}
      />
    </div>
  );
}

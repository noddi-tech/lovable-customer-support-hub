import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuditAnalytics } from '../hooks/useAuditAnalytics';
import { FunnelChart } from './FunnelChart';
import { SourceROIChart } from './SourceROIChart';
import { TimeInStageChart } from './TimeInStageChart';

interface Props {
  organizationId: string | null;
}

export function AuditAnalyticsPanel({ organizationId }: Props) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data, isLoading } = useAuditAnalytics(organizationId, {
    from: from ? new Date(from).toISOString() : undefined,
    to: to ? new Date(to + 'T23:59:59').toISOString() : undefined,
  });

  return (
    <div className="space-y-4">
      <Card className="p-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Fra dato</Label>
          <Input type="date" className="h-8 w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Til dato</Label>
          <Input type="date" className="h-8 w-40" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="ml-auto text-xs text-muted-foreground">
          {data ? `${data.totalApplicants} søkere · ${data.totalApplications} søknader` : ''}
        </div>
      </Card>

      {isLoading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Laster…</Card>
      ) : !data ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Ingen data.</Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-4 space-y-3">
            <Heading level={3} className="text-sm font-semibold">Trakt — søkere per trinn</Heading>
            <FunnelChart data={data.funnel} />
          </Card>
          <Card className="p-4 space-y-3">
            <Heading level={3} className="text-sm font-semibold">Kilde-ROI (% ansatt)</Heading>
            <SourceROIChart data={data.sourceRoi} />
          </Card>
          <Card className="p-4 space-y-3 md:col-span-2">
            <Heading level={3} className="text-sm font-semibold">Gjennomsnittlig tid per trinn (dager)</Heading>
            <TimeInStageChart data={data.timeInStage} />
          </Card>
        </div>
      )}
    </div>
  );
}

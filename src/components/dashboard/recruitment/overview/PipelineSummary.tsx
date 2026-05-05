import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { OversiktMetrics } from '@/hooks/recruitment/useOversiktMetrics';

interface Props {
  data: OversiktMetrics['pipeline_summary'];
}

export default function PipelineSummary({ data }: Props) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Pipeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {data.stages.map((s) => (
            <button
              key={s.id}
              onClick={() => navigate(`/operations/recruitment/applicants?stage=${s.id}`)}
              className="flex items-center gap-2 px-3 py-2 rounded-md border bg-card hover:bg-accent transition-colors min-w-[120px]"
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
              <div className="text-left">
                <div className="text-xl font-semibold leading-none">{s.count}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.name}</div>
              </div>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{data.total_active_applicants} aktive søkere</p>
      </CardContent>
    </Card>
  );
}

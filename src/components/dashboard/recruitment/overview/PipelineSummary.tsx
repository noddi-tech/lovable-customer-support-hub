import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { OversiktMetrics } from '@/hooks/recruitment/useOversiktMetrics';

interface Props {
  data: OversiktMetrics['pipeline_summary'];
}

export default function PipelineSummary({ data }: Props) {
  const navigate = useNavigate();
  const activeStages = data.stages.filter((s) => !s.is_terminal);
  const terminalStages = data.stages.filter((s) => s.is_terminal);

  const renderStage = (s: typeof data.stages[number]) => (
    <button
      key={s.id}
      onClick={() => navigate(`/operations/recruitment/applicants?stage=${s.id}`)}
      className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-colors min-w-[120px] ${
        s.is_terminal ? 'bg-muted/40 hover:bg-muted' : 'bg-card hover:bg-accent'
      }`}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
      <div className="text-left">
        <div className={`text-xl font-semibold leading-none ${s.is_terminal ? 'text-muted-foreground' : ''}`}>
          {s.count}
        </div>
        <div className="text-xs text-muted-foreground mt-1">{s.name}</div>
        {s.is_terminal && (
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mt-0.5">Avsluttet</div>
        )}
      </div>
    </button>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Pipeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-stretch gap-2">
          {activeStages.map(renderStage)}
          {terminalStages.length > 0 && (
            <div className="flex items-center" aria-hidden>
              <div className="h-12 border-l mx-1" />
            </div>
          )}
          {terminalStages.map(renderStage)}
        </div>
        <p className="text-xs text-muted-foreground">{data.total_active_applicants} aktive søkere</p>
      </CardContent>
    </Card>
  );
}

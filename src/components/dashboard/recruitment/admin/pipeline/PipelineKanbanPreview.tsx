import type { Stage } from './types';

interface Props {
  stages: Stage[];
}

export function PipelineKanbanPreview({ stages }: Props) {
  const sorted = [...stages].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-2">
      {sorted.length > 6 && (
        <p className="text-xs text-muted-foreground">
          {sorted.length} stadier — scroll horisontalt for å se alle
        </p>
      )}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3 min-w-min">
          {sorted.map((stage) => (
            <div
              key={stage.id}
              className="flex-shrink-0 w-[180px] rounded-md border bg-card overflow-hidden"
            >
              <div className="h-1" style={{ backgroundColor: stage.color }} />
              <div className="p-3 space-y-1">
                <div className="font-medium text-sm truncate" title={stage.name}>
                  {stage.name}
                </div>
                <div className="text-xs text-muted-foreground">0 søkere</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

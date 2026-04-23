import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AutomationExecution } from './types';
import { ExecutionLogRow, ExecutionLogRowTooltipProvider } from './ExecutionLogRow';

interface Props {
  executions: AutomationExecution[];
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onOpenExecution: (execution: AutomationExecution) => void;
  onAcknowledge: (execution: AutomationExecution) => void;
}

export function ExecutionLogTable({
  executions,
  totalCount,
  page,
  pageSize,
  onPageChange,
  onOpenExecution,
  onAcknowledge,
}: Props) {
  const start = totalCount === 0 ? 0 : page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, totalCount);
  const hasPrev = page > 0;
  const hasNext = end < totalCount;

  return (
    <ExecutionLogRowTooltipProvider>
      <div className="space-y-4">
        <div className="hidden overflow-hidden rounded-md border md:block">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-muted-foreground">
              <tr>
                <th className="p-4 font-medium">Regel</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Søker</th>
                <th className="p-4 font-medium">Tidspunkt</th>
                <th className="p-4 font-medium">Bekreftet</th>
              </tr>
            </thead>
            <tbody>
              {executions.map((execution) => (
                <ExecutionLogRow
                  key={execution.id}
                  execution={execution}
                  onOpen={() => onOpenExecution(execution)}
                  onAcknowledge={() => onAcknowledge(execution)}
                />
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 md:hidden">
          {executions.map((execution) => (
            <ExecutionLogRow
              key={execution.id}
              execution={execution}
              onOpen={() => onOpenExecution(execution)}
              onAcknowledge={() => onAcknowledge(execution)}
            />
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            Viser {start}–{end} av {totalCount}
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={!hasPrev} onClick={() => onPageChange(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
              Forrige
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={!hasNext} onClick={() => onPageChange(page + 1)}>
              Neste
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </ExecutionLogRowTooltipProvider>
  );
}
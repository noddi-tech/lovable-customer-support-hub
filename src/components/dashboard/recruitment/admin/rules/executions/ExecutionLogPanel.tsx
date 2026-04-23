import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ExecutionLogTable } from './ExecutionLogTable';
import { ExecutionDetailDrawer } from './ExecutionDetailDrawer';
import { useExecutions } from './hooks/useExecutions';
import { useExecutionMutations } from './hooks/useExecutionMutations';
import type { AutomationExecution } from './types';

const PAGE_SIZE = 50;

export function ExecutionLogPanel() {
  const [page, setPage] = useState(0);
  const [selectedExecution, setSelectedExecution] = useState<AutomationExecution | null>(null);
  const { data, isLoading, error } = useExecutions({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    statusFilter: null,
  });
  const { acknowledgeExecution } = useExecutionMutations();

  const executions = data?.data ?? [];
  const totalCount = data?.totalCount ?? 0;

  const selectedExecutionFromList = useMemo(
    () => executions.find((execution) => execution.id === selectedExecution?.id) ?? selectedExecution,
    [executions, selectedExecution],
  );

  if (isLoading) {
    return (
      <Card className="flex min-h-[240px] items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="flex min-h-[180px] items-center justify-center text-sm text-destructive">
        Kunne ikke laste utførelsesloggen.
      </Card>
    );
  }

  if (executions.length === 0) {
    return (
      <Card className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">
        Ingen utførelser ennå
      </Card>
    );
  }

  return (
    <>
      <ExecutionLogTable
        executions={executions}
        totalCount={totalCount}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onOpenExecution={setSelectedExecution}
        onAcknowledge={(execution) =>
          acknowledgeExecution({ executionId: execution.id, showToast: true })
        }
      />

      <ExecutionDetailDrawer
        execution={selectedExecutionFromList}
        onClose={() => setSelectedExecution(null)}
        onAcknowledge={(execution) =>
          acknowledgeExecution({ executionId: execution.id, showToast: false })
        }
      />
    </>
  );
}
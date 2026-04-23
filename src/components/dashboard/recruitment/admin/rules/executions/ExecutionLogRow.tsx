import { Check, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { AutomationExecution } from './types';
import {
  formatAbsoluteNbNo,
  formatRelativeNbNo,
  getExecutionStatusMeta,
  isExecutionFailedUnacknowledged,
} from './types';

interface Props {
  execution: AutomationExecution;
  onOpen: () => void;
  onAcknowledge: () => void;
  layout?: 'table' | 'card';
}

export function ExecutionLogRow({ execution, onOpen, onAcknowledge, layout = 'table' }: Props) {
  const status = getExecutionStatusMeta(execution);
  const needsAck = isExecutionFailedUnacknowledged(execution);

  const statusBadge = (
    <Badge variant="outline" className={cn('gap-1 font-normal', status.className)}>
      {status.showAlertIcon ? <AlertTriangle className="h-3 w-3" /> : null}
      <span className={status.italic ? 'italic' : undefined}>{status.label}</span>
    </Badge>
  );

  if (layout === 'card') {
    return (
      <div
        className={cn(
          'rounded-md border p-4',
          needsAck && 'border-l-2 border-l-destructive',
        )}
        onClick={onOpen}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="font-medium">{execution.rule_name ?? '(slettet regel)'}</p>
            <p className="text-sm text-muted-foreground">Søker: {execution.applicant_name ?? '—'}</p>
            <p className="text-sm text-muted-foreground">Tidspunkt: {formatRelativeNbNo(execution.created_at)}</p>
          </div>
          {statusBadge}
        </div>

        <div className="mt-4 border-t pt-4">
          {needsAck ? (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={(event) => {
                event.stopPropagation();
                onAcknowledge();
              }}
            >
              Bekreft
            </Button>
          ) : execution.acknowledged_at ? (
            <span className="inline-flex items-center gap-1 text-sm text-success">
              <Check className="h-4 w-4" />
              Bekreftet
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <tr
        className={cn(
          'cursor-pointer border-b align-top transition-colors hover:bg-muted/40',
          needsAck && 'border-l-2 border-l-destructive',
        )}
        onClick={onOpen}
      >
        <td className="p-4 font-medium">{execution.rule_name ?? '(slettet regel)'}</td>
        <td className="p-4">
          {status.tooltip ? (
            <Tooltip>
              <TooltipTrigger asChild>{statusBadge}</TooltipTrigger>
              <TooltipContent>{status.tooltip}</TooltipContent>
            </Tooltip>
          ) : (
            statusBadge
          )}
        </td>
        <td className="p-4 text-sm text-muted-foreground">{execution.applicant_name ?? '—'}</td>
        <td className="p-4 text-sm text-muted-foreground">
          <Tooltip>
            <TooltipTrigger asChild>
              <span>{formatRelativeNbNo(execution.created_at)}</span>
            </TooltipTrigger>
            <TooltipContent>{formatAbsoluteNbNo(execution.created_at)}</TooltipContent>
          </Tooltip>
        </td>
        <td className="p-4 text-sm">
          {needsAck ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={(event) => {
                event.stopPropagation();
                onAcknowledge();
              }}
            >
              Bekreft
            </Button>
          ) : execution.acknowledged_at ? (
            <span className="inline-flex items-center gap-1 text-success">
              <Check className="h-4 w-4" />
              Bekreftet
            </span>
          ) : (
            '—'
          )}
        </td>
      </tr>
  );
}

export function ExecutionLogRowTooltipProvider({ children }: { children: React.ReactNode }) {
  return <TooltipProvider>{children}</TooltipProvider>;
}
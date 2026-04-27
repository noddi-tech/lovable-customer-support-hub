import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  formatDuration,
  getActionError,
  getActionLabel,
  isActionFailed,
  maskWebhookUrl,
} from '../executions/types';
import type { DryRunActionResult, DryRunResult } from './types';

function getStatusMeta(status: string) {
  switch (status) {
    case 'success':
      return { label: 'Vellykket', className: 'border-success/40 bg-success/10 text-success' };
    case 'partial':
      return { label: 'Delvis feilet', className: 'border-warning/40 bg-warning/10 text-warning' };
    case 'failed':
      return { label: 'Feilet', className: 'border-destructive/40 bg-destructive/10 text-destructive' };
    case 'dry_run':
    default:
      return { label: 'Test-kjøring', className: 'border-border bg-muted text-muted-foreground italic' };
  }
}

function getSimulatedActionLabel(action: DryRunActionResult) {
  switch (action.action_type) {
    case 'send_email':
      return 'Ville sendt e-post';
    case 'assign_to':
      return 'Ville tildelt ansvarlig';
    case 'webhook':
      return 'Ville kalt webhook';
    default:
      return `Ville ${getActionLabel(action.action_type)?.toLowerCase() ?? 'utført handling'}`;
  }
}

function getActionDetails(action: DryRunActionResult): Array<[string, string]> {
  switch (action.action_type) {
    case 'send_email':
      return [
        ['Til', action.recipient ?? action.recipient_email ?? '—'],
        ['Mal', action.template_name ?? action.template_id ?? '—'],
      ];
    case 'assign_to':
      return [['Ville tildelt', action.assigned_to_name ?? action.profile_name ?? action.assigned_to ?? '—']];
    case 'webhook':
      return [
        ['URL', maskWebhookUrl(action.url)],
        ['Metode', action.method ?? action.http_method ?? 'POST'],
      ];
    default:
      return [];
  }
}

export function DryRunResultCard({ result }: { result: DryRunResult }) {
  const status = getStatusMeta(result.overall_status);
  const actions: DryRunActionResult[] = Array.isArray(result.action_results)
    ? (result.action_results as DryRunActionResult[])
    : [];

  return (
    <Card>
      <CardHeader className="space-y-3 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">{result.rule_name}</CardTitle>
            <p className="text-sm text-muted-foreground">Varighet: {formatDuration(result.duration_ms)}</p>
          </div>
          <Badge variant="outline" className={cn('gap-1 font-normal', status.className)}>
            <span className={status.label === 'Test-kjøring' ? 'italic' : undefined}>{status.label}</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {actions.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Ingen handlinger ble simulert for denne regelen.
          </div>
        ) : (
          actions.map((action, index) => {
            const failed = isActionFailed(action as any);
            const details = getActionDetails(action);

            return (
              <div key={`${result.execution_id}-${index}`} className="rounded-md border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-medium">{getSimulatedActionLabel(action)}</p>
                    <p className="text-xs text-muted-foreground">{getActionLabel(action.action_type)}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'font-normal',
                      failed
                        ? 'border-destructive/40 bg-destructive/10 text-destructive'
                        : 'border-success/40 bg-success/10 text-success',
                    )}
                  >
                    {failed ? 'Ville feilet' : 'Kan kjøres'}
                  </Badge>
                </div>

                {details.length > 0 ? <Separator className="my-3" /> : null}

                {details.length > 0 ? (
                  <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                    {details.map(([label, value]) => (
                      <div key={label} className="space-y-1">
                        <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
                        <dd className="break-words">{value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}

                {failed && getActionError(action as any) ? (
                  <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive whitespace-pre-wrap break-words">
                    {getActionError(action as any)}
                  </p>
                ) : null}
              </div>
            );
          })
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <Link
          to="/admin/recruitment?tab=automation&subtab=log"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Åpne i utførelseslogg
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </CardFooter>
    </Card>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, ExternalLink, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import type { AutomationExecution } from './types';
import {
  formatAbsoluteNbNo,
  formatDuration,
  formatRelativeNbNo,
  getActionError,
  getActionLabel,
  getActionResults,
  getExecutionStatusMeta,
  isActionFailed,
  maskWebhookUrl,
  truncateText,
} from './types';

interface Props {
  execution: AutomationExecution | null;
  onClose: () => void;
  onAcknowledge: (execution: AutomationExecution) => void;
}

export function ExecutionDetailDrawer({ execution, onClose, onAcknowledge }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showTriggerContext, setShowTriggerContext] = useState(false);

  useEffect(() => {
    if (execution) {
      setSheetOpen(true);
      setShowTriggerContext(false);
    }
  }, [execution]);

  const handleOpenChange = (open: boolean) => {
    setSheetOpen(open);
    if (!open) {
      setTimeout(() => onClose(), 150);
    }
  };

  const status = execution ? getExecutionStatusMeta(execution) : null;
  const actionResults = useMemo(
    () => (execution ? getActionResults(execution.action_results) : []),
    [execution],
  );

  // For skipped rows, resolve template_id / would_send_to_application_id to
  // human-readable names so the drawer shows "Mal: Søknad mottatt" instead of UUIDs.
  const isSkippedExecution = execution?.overall_status === 'skipped';
  const templateIds = useMemo(
    () =>
      Array.from(
        new Set(
          actionResults
            .map((a) => a.template_id ?? a.phone_template_id)
            .filter((id): id is string => typeof id === 'string' && id.length > 0),
        ),
      ),
    [actionResults],
  );
  const applicationIds = useMemo(
    () =>
      Array.from(
        new Set(
          actionResults
            .map((a) => a.would_send_to_application_id)
            .filter((id): id is string => typeof id === 'string' && id.length > 0),
        ),
      ),
    [actionResults],
  );

  const { data: nameMaps } = useQuery({
    queryKey: ['execution-drawer-resolution', execution?.id, templateIds, applicationIds],
    enabled: !!execution && isSkippedExecution && (templateIds.length > 0 || applicationIds.length > 0),
    staleTime: 60_000,
    queryFn: async () => {
      const [templatesRes, appsRes] = await Promise.all([
        templateIds.length
          ? supabase.from('recruitment_email_templates').select('id, name').in('id', templateIds)
          : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
        applicationIds.length
          ? supabase
              .from('recruitment_applications')
              .select('id, applicant:recruitment_applicants(email, first_name, last_name)')
              .in('id', applicationIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const templateMap = new Map(
        ((templatesRes.data ?? []) as Array<{ id: string; name: string }>).map((t) => [t.id, t.name]),
      );
      const applicantEmailMap = new Map<string, string | null>(
        ((appsRes.data ?? []) as any[]).map((a) => [a.id, a.applicant?.email ?? null]),
      );
      return { templateMap, applicantEmailMap };
    },
  });

  if (!execution || !status) return null;

  return (
    <Sheet open={sheetOpen} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="sticky top-0 z-10 border-b bg-background px-6 py-4 text-left">
          <div className="flex items-center justify-between gap-3 pr-8">
            <div className="space-y-1">
              <SheetTitle className="text-left">Utførelse av {execution.rule_name ?? '(slettet regel)'}</SheetTitle>
            </div>
            <Badge variant="outline" className={cn('gap-1 font-normal', status.className)}>
              {status.showAlertIcon ? <AlertTriangle className="h-3 w-3" /> : null}
              <span className={status.italic ? 'italic' : undefined}>{status.label}</span>
            </Badge>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Metadata</h3>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <MetaItem label="Tidspunkt" value={formatAbsoluteNbNo(execution.created_at)} />
              <MetaItem label="Varighet" value={formatDuration(execution.duration_ms)} />
              <MetaItem label="Utløst av" value={execution.triggered_by_name ?? 'System'} />
              <MetaItem label="Test-kjøring" value={execution.is_dry_run ? 'Ja' : 'Nei'} />
              <MetaItem
                label="Søknad"
                value={
                  execution.applicant_id ? (
                    <Link
                      to={`/operations/recruitment/applicants/${execution.applicant_id}`}
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      {execution.applicant_name ?? execution.applicant_id}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    '—'
                  )
                }
              />
              {execution.overall_status === 'skipped' ? (
                <MetaItem label="Grunn" value={execution.skip_reason ?? 'Ikke oppgitt'} />
              ) : null}
            </dl>
          </section>

          <Separator className="my-5" />

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">
              {execution.overall_status === 'skipped'
                ? 'Handlinger som ville blitt utført'
                : 'Handlinger utført'}
            </h3>
            <div className="space-y-3">
              {actionResults.length === 0 ? (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  Ingen handlinger loggført.
                </div>
              ) : (
                actionResults.map((action, index) => {
                  const isSkipped = execution.overall_status === 'skipped' || action.skipped === true;
                  const failed = !isSkipped && isActionFailed(action);
                  return (
                    <div key={index} className="rounded-md border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{getActionLabel(action.action_type)}</p>
                          <p className="text-xs text-muted-foreground">Varighet: {formatDuration(action.duration_ms)}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            'font-normal',
                            isSkipped
                              ? 'border-amber-300/40 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
                              : failed
                                ? 'border-destructive/40 bg-destructive/10 text-destructive'
                                : 'border-success/40 bg-success/10 text-success',
                          )}
                        >
                          {isSkipped ? 'Hoppet over' : failed ? 'Feilet' : 'Vellykket'}
                        </Badge>
                      </div>

                      <div className="mt-3 space-y-2 text-sm">
                        {failed && getActionError(action) ? (
                          <p className="rounded bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive whitespace-pre-wrap break-words">
                            {getActionError(action)}
                          </p>
                        ) : null}

                        {action.action_type === 'send_email' ? (
                          <DetailGrid
                            items={[
                              ['Mottaker', action.recipient ?? action.recipient_email ?? '—'],
                              ['Mal', action.template_name ?? action.template_id ?? '—'],
                              ['SendGrid-ID', action.sendgrid_message_id ?? '—'],
                            ]}
                          />
                        ) : null}

                        {action.action_type === 'assign_to' ? (
                          <DetailGrid items={[['Tildelt', action.assigned_to_name ?? action.assigned_to ?? '—']]} />
                        ) : null}

                        {action.action_type === 'webhook' ? (
                          <DetailGrid
                            items={[
                              ['URL', maskWebhookUrl(action.url)],
                              ['HTTP-status', action.http_status?.toString() ?? '—'],
                              ['Respons', truncateText(action.response_body)],
                            ]}
                          />
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <Separator className="my-5" />

          <section className="space-y-3">
            <button
              type="button"
              className="flex w-full items-center justify-between text-left text-sm font-semibold"
              onClick={() => setShowTriggerContext((prev) => !prev)}
            >
              Utløserkontekst
              {showTriggerContext ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showTriggerContext ? (
              <pre className="overflow-x-auto rounded-md border bg-muted/40 p-4 text-xs text-foreground">
                {JSON.stringify(execution.trigger_context, null, 2)}
              </pre>
            ) : null}
          </section>
        </div>

        <SheetFooter className="sticky bottom-0 border-t bg-background px-6 py-4">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {execution.acknowledged_at ? (
                <span>
                  Bekreftet av {execution.acknowledged_by_name ?? 'Ukjent bruker'} {formatRelativeNbNo(execution.acknowledged_at)}
                </span>
              ) : null}
            </div>
            <div className="flex items-center justify-end gap-2">
              {execution.overall_status === 'failed' && execution.acknowledged_at === null ? (
                <Button type="button" variant="destructive" size="sm" onClick={() => onAcknowledge(execution)}>
                  <Check className="h-4 w-4" />
                  Bekreft feil
                </Button>
              ) : null}
              <Button type="button" variant="outline" size="sm" onClick={() => setSheetOpen(false)}>
                Lukk
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function MetaItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

function DetailGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="space-y-1">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
          <dd className="break-words text-sm">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
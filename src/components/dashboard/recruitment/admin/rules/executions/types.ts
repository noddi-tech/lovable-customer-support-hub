import type { Json } from '@/integrations/supabase/types';

export type ExecutionStatus = 'success' | 'partial' | 'failed' | 'dry_run';

export interface ActionResultItem {
  action_type?: string;
  status?: string;
  success?: boolean;
  duration_ms?: number | null;
  error?: string | null;
  error_message?: string | null;
  recipient?: string | null;
  recipient_email?: string | null;
  template_name?: string | null;
  template_id?: string | null;
  sendgrid_message_id?: string | null;
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  url?: string | null;
  http_status?: number | null;
  response_body?: string | null;
  output?: Record<string, unknown> | null;
}

export interface AutomationExecution {
  id: string;
  organization_id: string;
  rule_id: string | null;
  rule_name: string | null;
  applicant_id: string | null;
  application_id: string | null;
  overall_status: ExecutionStatus;
  action_results: Json | null;
  trigger_context: Json;
  triggered_by: string | null;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  created_at: string;
  duration_ms: number | null;
  is_dry_run: boolean;
  applicant_name?: string | null;
  triggered_by_name?: string | null;
  acknowledged_by_name?: string | null;
}

export interface ExecutionStatusMeta {
  label: string;
  className: string;
  showAlertIcon?: boolean;
  italic?: boolean;
  tooltip?: string;
}

const ACTION_LABELS: Record<string, string> = {
  send_email: 'Send e-post',
  assign_to: 'Tildel ansvarlig',
  webhook: 'Webhook',
};

export function getActionLabel(actionType?: string | null) {
  return ACTION_LABELS[actionType ?? ''] ?? actionType ?? 'Handling';
}

export function getActionResults(results: Json | null): ActionResultItem[] {
  return Array.isArray(results) ? (results as ActionResultItem[]) : [];
}

export function getExecutionStatusMeta(execution: AutomationExecution): ExecutionStatusMeta {
  const actionResults = getActionResults(execution.action_results);
  const failedActions = actionResults.filter((item) => isActionFailed(item)).length;
  const totalActions = actionResults.length;

  switch (execution.overall_status) {
    case 'success':
      return {
        label: 'Vellykket',
        className: 'border-success/40 bg-success/10 text-success',
      };
    case 'partial':
      return {
        label: 'Delvis feilet',
        className: 'border-warning/40 bg-warning/10 text-warning',
        tooltip:
          totalActions > 0 ? `${failedActions} av ${totalActions} handlinger feilet` : undefined,
      };
    case 'dry_run':
      return {
        label: 'Test-kjøring',
        className: 'border-border bg-muted text-muted-foreground italic',
        italic: true,
      };
    case 'failed':
    default:
      return {
        label: 'Feilet',
        className: 'border-destructive/40 bg-destructive/10 text-destructive',
        showAlertIcon: true,
      };
  }
}

export function isExecutionFailedUnacknowledged(execution: AutomationExecution) {
  return execution.overall_status === 'failed' && execution.acknowledged_at === null;
}

export function getApplicantIdFromTriggerContext(triggerContext: Json): string | null {
  if (!triggerContext || typeof triggerContext !== 'object' || Array.isArray(triggerContext)) {
    return null;
  }

  const applicantId = (triggerContext as Record<string, unknown>).applicant_id;
  return typeof applicantId === 'string' ? applicantId : null;
}

export function formatAbsoluteNbNo(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('nb-NO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeNbNo(iso: string | null | undefined) {
  if (!iso) return '—';

  const date = new Date(iso);
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat('nb-NO', { numeric: 'auto' });
  const ranges: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
  ];

  for (const [unit, seconds] of ranges) {
    if (Math.abs(diffSeconds) >= seconds || unit === 'minute') {
      return rtf.format(Math.round(diffSeconds / seconds), unit);
    }
  }

  return rtf.format(diffSeconds, 'second');
}

export function formatDuration(durationMs: number | null | undefined) {
  return typeof durationMs === 'number' ? `${durationMs}ms` : '—';
}

export function maskWebhookUrl(raw: string | null | undefined) {
  if (!raw) return '—';
  try {
    const url = new URL(raw);
    if (url.username) url.username = '***';
    if (url.password) url.password = '***';
    ['token', 'key', 'secret', 'signature'].forEach((param) => {
      if (url.searchParams.has(param)) url.searchParams.set(param, '***');
    });
    return url.toString();
  } catch {
    return raw.replace(/([?&](?:token|key|secret|signature)=)[^&]+/gi, '$1***');
  }
}

export function truncateText(value: string | null | undefined, max = 500) {
  if (!value) return '—';
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export function isActionFailed(action: ActionResultItem) {
  if (typeof action.success === 'boolean') return !action.success;
  return action.status === 'failed' || action.status === 'error';
}

export function getActionError(action: ActionResultItem) {
  return action.error_message ?? action.error ?? null;
}
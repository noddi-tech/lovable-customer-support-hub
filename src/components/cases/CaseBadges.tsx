import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  CASE_PRIORITY_LABELS,
  CASE_STATUS_LABELS,
  getCaseSlaState,
  type CasePriority,
  type CaseRecord,
  type CaseStatus,
} from '@/hooks/useCases';
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  CircleDot,
  Clock,
  Hourglass,
  PlayCircle,
  Users,
  type LucideIcon,
} from 'lucide-react';

const STATUS_STYLES: Record<CaseStatus, string> = {
  open: 'bg-primary/10 text-primary border-primary/20',
  in_progress: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
  waiting_customer: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
  waiting_internal: 'bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-400',
  resolved: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
  closed: 'bg-muted text-muted-foreground border-border',
};

/** One distinct icon per case status, shared by badges, selects and filters. */
export const CASE_STATUS_ICONS: Record<CaseStatus, LucideIcon> = {
  open: CircleDot,
  in_progress: PlayCircle,
  waiting_customer: Hourglass,
  waiting_internal: Users,
  resolved: CheckCircle2,
  closed: Archive,
};

/** Text colour token per status, for icons rendered outside a badge. */
export const CASE_STATUS_ICON_COLORS: Record<CaseStatus, string> = {
  open: 'text-primary',
  in_progress: 'text-blue-600 dark:text-blue-400',
  waiting_customer: 'text-amber-600 dark:text-amber-400',
  waiting_internal: 'text-violet-600 dark:text-violet-400',
  resolved: 'text-emerald-600 dark:text-emerald-400',
  closed: 'text-muted-foreground',
};

export function CaseStatusBadge({ status, className }: { status: CaseStatus; className?: string }) {
  const Icon = CASE_STATUS_ICONS[status];
  return (
    <Badge variant="outline" className={cn('gap-1 font-medium', STATUS_STYLES[status], className)}>
      <Icon className="h-3 w-3" />
      {CASE_STATUS_LABELS[status]}
    </Badge>
  );
}

/** Traffic-light scale: green (low) → yellow (normal) → orange (high) → red (urgent). */
const PRIORITY_STYLES: Record<CasePriority, string> = {
  low: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400',
  normal: 'bg-amber-400/10 text-amber-700 border-amber-400/25 dark:text-amber-400',
  high: 'bg-orange-500/10 text-orange-700 border-orange-500/25 dark:text-orange-400',
  urgent: 'bg-destructive/10 text-destructive border-destructive/25',
};

/** Solid dot colour used for the traffic-light indicator. */
export const CASE_PRIORITY_DOT: Record<CasePriority, string> = {
  low: 'bg-emerald-500',
  normal: 'bg-amber-400',
  high: 'bg-orange-500',
  urgent: 'bg-destructive',
};

export function CasePriorityBadge({ priority, className }: { priority: CasePriority; className?: string }) {
  return (
    <Badge variant="outline" className={cn('gap-1.5 font-medium', PRIORITY_STYLES[priority], className)}>
      <span
        aria-hidden
        className={cn(
          'h-2 w-2 shrink-0 rounded-full',
          CASE_PRIORITY_DOT[priority],
          priority === 'urgent' && 'animate-pulse',
        )}
      />
      {CASE_PRIORITY_LABELS[priority]}
    </Badge>
  );
}

export function CaseSlaBadge({
  record,
  className,
}: {
  record: Pick<CaseRecord, 'status' | 'due_at' | 'resolution_due_at'>;
  className?: string;
}) {
  const state = getCaseSlaState(record);
  if (state === 'none' || state === 'done') return null;

  const due = record.due_at ?? record.resolution_due_at;
  const label = due ? new Date(due).toLocaleString('nb-NO', { timeZone: 'Europe/Oslo', dateStyle: 'short', timeStyle: 'short' }) : '';

  if (state === 'breached') {
    return (
      <Badge variant="outline" className={cn('gap-1 border-destructive/20 bg-destructive/10 text-destructive', className)}>
        <AlertTriangle className="h-3 w-3" /> Overdue {label}
      </Badge>
    );
  }
  if (state === 'at_risk') {
    return (
      <Badge variant="outline" className={cn('gap-1 border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400', className)}>
        <Clock className="h-3 w-3" /> Due {label}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={cn('gap-1 text-muted-foreground', className)}>
      <Clock className="h-3 w-3" /> Due {label}
    </Badge>
  );
}

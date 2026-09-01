import { AlertTriangle, ArrowRight, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCountdown } from '@/lib/sla';
import type { InboxSlaRisk } from '@/hooks/useSlaRisk';

const CHANNEL_LABELS: Record<string, string> = {
  email: 'email',
  sms: 'text message',
  widget: 'chat',
};

interface InboxSlaAlertProps {
  risk: InboxSlaRisk;
  onFix: () => void;
  /** Corner chip variant used on the home inbox cards. */
  compact?: boolean;
}

/** Impossible-to-miss SLA warning on an inbox card, with a direct call to action. */
export function InboxSlaAlert({ risk, onFix, compact = false }: InboxSlaAlertProps) {
  const hasBreached = risk.breached > 0;
  const remaining = risk.nextDeadline ? new Date(risk.nextDeadline).getTime() - Date.now() : null;
  const channels = risk.channels.map((c) => CHANNEL_LABELS[c] ?? c).join(', ');
  const countdown =
    remaining === null ? null : remaining <= 0 ? formatCountdown(remaining) : formatCountdown(remaining);

  if (compact) {
    const full = [
      hasBreached ? `${risk.breached} SLA breached` : `${risk.atRisk} breaking within the hour`,
      hasBreached && risk.atRisk > 0 ? `${risk.atRisk} at risk` : null,
      channels || null,
      remaining === null
        ? 'deadline unknown'
        : remaining <= 0
          ? `overdue by ${countdown}`
          : `next in ${countdown}`,
    ]
      .filter(Boolean)
      .join(' · ');

    return (
      <button
        type="button"
        role="alert"
        title={`${full} — click to fix`}
        aria-label={`${full}. Fix now`}
        onClick={(e) => {
          e.stopPropagation();
          onFix();
        }}
        className={cn(
          'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[10px] font-semibold leading-none transition-colors',
          hasBreached
            ? 'border-red-400 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300'
            : 'border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300',
        )}
      >
        {hasBreached ? (
          <AlertTriangle className="h-3 w-3 shrink-0" />
        ) : (
          <Timer className="h-3 w-3 shrink-0" />
        )}
        <span className="tabular-nums">{hasBreached ? risk.breached : risk.atRisk}</span>
        {countdown && <span className="font-normal opacity-80 tabular-nums">{countdown}</span>}
      </button>
    );
  }

  return (
    <div
      role="alert"
      className={cn(
        'rounded-md border px-2 py-1.5 flex items-center gap-2',
        hasBreached
          ? 'border-red-400 bg-red-50 dark:border-red-800 dark:bg-red-950/40'
          : 'border-amber-400 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30',
      )}
    >
      <span
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white',
          hasBreached ? 'bg-red-600 animate-pulse' : 'bg-amber-500',
        )}
      >
        {hasBreached ? <AlertTriangle className="h-3 w-3" /> : <Timer className="h-3 w-3" />}
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <div
          className={cn(
            'text-[11px] font-semibold',
            hasBreached ? 'text-red-700 dark:text-red-300' : 'text-amber-800 dark:text-amber-300',
          )}
        >
          {hasBreached
            ? `${risk.breached} SLA breached`
            : `${risk.atRisk} breaking within the hour`}
          {hasBreached && risk.atRisk > 0 && ` · ${risk.atRisk} at risk`}
        </div>
        <div className="text-[10px] text-muted-foreground truncate">
          {channels && `${channels} · `}
          {remaining === null
            ? 'deadline unknown'
            : remaining <= 0
              ? `overdue by ${formatCountdown(remaining)}`
              : `next in ${formatCountdown(remaining)}`}
        </div>
      </div>
      <Button
        size="sm"
        variant={hasBreached ? 'destructive' : 'default'}
        className="h-6 shrink-0 px-2 text-[11px]"
        onClick={(e) => {
          e.stopPropagation();
          onFix();
        }}
      >
        Fix now <ArrowRight className="ml-1 h-3 w-3" />
      </Button>
    </div>
  );
}

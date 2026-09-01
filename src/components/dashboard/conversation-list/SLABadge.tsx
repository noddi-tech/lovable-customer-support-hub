import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface SLABadgeProps {
  status?: 'on_track' | 'at_risk' | 'breached' | 'met';
  slaBreachAt?: string;
}

/** Formats a duration as a compact countdown: 2d 3h / 3h 12m / 12m 30s / 45s. */
export function formatCountdown(ms: number): string {
  const total = Math.floor(Math.abs(ms) / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

/** Live-ticking clock; updates every second under an hour, otherwise every 30s. */
function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function SLABadge({ status, slaBreachAt }: SLABadgeProps) {
  const breachTime = slaBreachAt ? new Date(slaBreachAt).getTime() : NaN;
  const hasDeadline = Number.isFinite(breachTime);
  // Tick fast when the deadline is close so the countdown feels live.
  const coarse = !hasDeadline || Math.abs(breachTime - Date.now()) > 3_600_000;
  const now = useNow(coarse ? 30_000 : 1_000);

  if (!status || status === 'met') return null;

  const remainingMs = hasDeadline ? breachTime - now : null;
  const overdue = remainingMs !== null && remainingMs <= 0;
  // The stored status can lag behind the clock — trust the deadline once it passes.
  const effective = overdue ? 'breached' : status;

  const configs = {
    on_track: {
      icon: CheckCircle,
      label: 'On track',
      dotColor: 'bg-emerald-500',
      className:
        'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
    },
    at_risk: {
      icon: AlertCircle,
      label: 'At risk',
      dotColor: 'bg-amber-500',
      className:
        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
    },
    breached: {
      icon: XCircle,
      label: 'Breached',
      dotColor: 'bg-red-500',
      className:
        'bg-red-100 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-700',
    },
  } as const;

  const config = configs[effective as keyof typeof configs];
  if (!config) return null;

  const Icon = config.icon;
  const countdown = remainingMs === null ? null : formatCountdown(remainingMs);
  const urgent = effective === 'breached' || (remainingMs !== null && remainingMs <= 30 * 60_000);

  const deadlineLabel = hasDeadline
    ? new Date(breachTime).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : null;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] flex items-center gap-1 px-1.5 py-0.5 font-semibold tabular-nums cursor-help',
              config.className,
              effective === 'breached' && 'animate-pulse',
            )}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', config.dotColor)} />
            <Icon className="w-3 h-3 shrink-0" />
            {countdown ? (
              <span className="whitespace-nowrap">
                {overdue ? `+${countdown}` : countdown}
              </span>
            ) : (
              <span className="whitespace-nowrap">{config.label}</span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-[240px] text-xs leading-relaxed">
          {overdue
            ? `SLA breached ${countdown} ago — this reply is late. Answer it now or reassign it.`
            : urgent
              ? `Only ${countdown} left to send the first reply before the SLA breaks.`
              : `${countdown} left before the first-reply SLA breaks.`}
          {deadlineLabel && <div className="mt-1 opacity-70">Deadline: {deadlineLabel}</div>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

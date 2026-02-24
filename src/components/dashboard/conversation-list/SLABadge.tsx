import { Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface SLABadgeProps {
  status?: 'on_track' | 'at_risk' | 'breached' | 'met';
  slaBreachAt?: string;
}

export function SLABadge({ status, slaBreachAt }: SLABadgeProps) {
  if (!status || status === 'met') return null;

  const getTimeRemaining = () => {
    if (!slaBreachAt) return null;
    try {
      const breach = new Date(slaBreachAt);
      const now = new Date();
      const diffMs = breach.getTime() - now.getTime();
      const absDiffMs = Math.abs(diffMs);
      
      if (absDiffMs < 60000) return diffMs > 0 ? '<1m' : 'now';
      if (absDiffMs < 3600000) return `${Math.round(absDiffMs / 60000)}m`;
      if (absDiffMs < 86400000) return `${Math.round(absDiffMs / 3600000)}h`;
      return `${Math.round(absDiffMs / 86400000)}d`;
    } catch {
      return null;
    }
  };

  const configs = {
    on_track: {
      icon: CheckCircle,
      label: 'On Track',
      dotColor: 'bg-emerald-500',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
    },
    at_risk: {
      icon: AlertCircle,
      label: 'At Risk',
      dotColor: 'bg-amber-500',
      className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
    },
    breached: {
      icon: XCircle,
      label: 'Breached',
      dotColor: 'bg-red-500',
      className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
    },
  } as const;

  const config = configs[status];
  if (!config) return null;

  const Icon = config.icon;
  const timeRemaining = getTimeRemaining();

  return (
    <Badge
      variant="outline"
      className={cn('text-[10px] flex items-center gap-1 px-1.5 py-0.5 font-medium', config.className)}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', config.dotColor)} />
      <Icon className="w-3 h-3 shrink-0" />
      {timeRemaining && (status === 'at_risk' || status === 'breached') ? (
        <span>{timeRemaining}</span>
      ) : (
        <span className="hidden xl:inline">{config.label}</span>
      )}
    </Badge>
  );
}

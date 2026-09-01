import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type MetricTone = 'default' | 'good' | 'warn' | 'bad';

export interface MetricTileProps {
  label: string;
  value: string;
  /** Explains what the number measures and what to do about it — shown on hover. */
  description: string;
  tone?: MetricTone;
  hint?: string;
  className?: string;
}

/** Small KPI tile with an explanatory tooltip, shared by all metric dialogs. */
export function MetricTile({ label, value, description, tone = 'default', hint, className }: MetricTileProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('rounded-md border p-3 text-left cursor-help', className)}>
            <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              {label}
              <Info className="h-3 w-3 opacity-50" />
            </div>
            <div
              className={cn(
                'mt-1 text-xl font-semibold tabular-nums',
                tone === 'good' && 'text-emerald-600 dark:text-emerald-400',
                tone === 'warn' && 'text-amber-600 dark:text-amber-400',
                tone === 'bad' && 'text-destructive',
              )}
            >
              {value}
            </div>
            {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" align="start" className="max-w-[280px] text-xs leading-relaxed">
          {description}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function attainmentTone(pct: number | null | undefined): MetricTone {
  if (pct === null || pct === undefined) return 'default';
  if (pct >= 90) return 'good';
  if (pct >= 75) return 'warn';
  return 'bad';
}

export default MetricTile;

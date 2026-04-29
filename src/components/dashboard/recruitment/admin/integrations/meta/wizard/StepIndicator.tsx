import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  steps: { id: number; label: string }[];
  current: number;
}

export function StepIndicator({ steps, current }: Props) {
  return (
    <ol className="flex items-center w-full text-xs gap-2">
      {steps.map((step, idx) => {
        const isDone = step.id < current;
        const isActive = step.id === current;
        return (
          <li key={step.id} className="flex-1 flex items-center gap-2 min-w-0">
            <div
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium',
                isDone && 'bg-primary text-primary-foreground border-primary',
                isActive && 'border-primary text-primary',
                !isDone && !isActive && 'border-muted-foreground/30 text-muted-foreground',
              )}
            >
              {isDone ? <Check className="h-3.5 w-3.5" /> : step.id}
            </div>
            <span
              className={cn(
                'truncate',
                isActive ? 'text-foreground font-medium' : 'text-muted-foreground',
              )}
            >
              {step.label}
            </span>
            {idx < steps.length - 1 && (
              <div
                className={cn(
                  'h-px flex-1 min-w-2',
                  isDone ? 'bg-primary' : 'bg-muted-foreground/20',
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

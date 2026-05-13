import React from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { scoreTier, TIER_LABEL, TIER_PILL } from './scoreTier';

interface Props {
  score: number | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

const SIZES: Record<NonNullable<Props['size']>, string> = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
};

const ScoreCircle: React.FC<Props> = ({ score, size = 'md', showTooltip = true }) => {
  const tier = scoreTier(score);
  const sizeCls = SIZES[size];

  const circle =
    score == null ? (
      <div
        className={cn(
          'inline-flex items-center justify-center rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground',
          sizeCls,
        )}
      >
        —
      </div>
    ) : (
      <div
        className={cn(
          'inline-flex items-center justify-center rounded-full border font-semibold',
          sizeCls,
          TIER_PILL[tier],
        )}
      >
        {score}
      </div>
    );

  if (!showTooltip) return circle;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{circle}</TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            {score == null ? 'Ingen poeng ennå' : `Poeng: ${score}/10 — ${TIER_LABEL[tier]}`}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ScoreCircle;

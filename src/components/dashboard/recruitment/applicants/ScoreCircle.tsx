import React from 'react';
import { cn } from '@/lib/utils';

interface Props {
  score: number | null | undefined;
}

const ScoreCircle: React.FC<Props> = ({ score }) => {
  if (score == null) {
    return (
      <div className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-dashed border-muted-foreground/40 text-xs text-muted-foreground">
        —
      </div>
    );
  }
  const color =
    score < 30
      ? 'bg-red-100 text-red-700 border-red-200'
      : score <= 60
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : 'bg-green-100 text-green-700 border-green-200';
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center h-8 w-8 rounded-full border text-xs font-semibold',
        color
      )}
      title={`Poeng: ${score}`}
    >
      {score}
    </div>
  );
};

export default ScoreCircle;

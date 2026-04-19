import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import PipelineCard from './PipelineCard';
import type { PipelineApplication } from './usePipeline';
import type { PipelineStage } from '../applicants/useApplicants';

interface Props {
  stage: PipelineStage;
  applications: PipelineApplication[];
}

const PipelineColumn: React.FC<Props> = ({ stage, applications }) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div className="w-[280px] flex-shrink-0 flex flex-col bg-muted/30 rounded-lg border">
      <div
        className="px-3 py-2 border-t-4 rounded-t-lg flex items-center justify-between"
        style={{ borderTopColor: stage.color }}
      >
        <span className="font-semibold text-sm">{stage.name}</span>
        <Badge variant="secondary">{applications.length}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px] transition-colors',
          isOver && 'bg-primary/5'
        )}
      >
        {applications.length === 0 ? (
          <div className="border-2 border-dashed border-muted-foreground/20 rounded-md p-6 text-center text-xs text-muted-foreground">
            Ingen søkere
          </div>
        ) : (
          applications.map((app) => <PipelineCard key={app.id} app={app} />)
        )}
      </div>
    </div>
  );
};

export default PipelineColumn;

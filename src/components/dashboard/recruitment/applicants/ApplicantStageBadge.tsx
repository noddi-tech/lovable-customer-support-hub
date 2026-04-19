import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { PipelineStage } from './useApplicants';

interface Props {
  stageId: string | null | undefined;
  pipeline: { stages: PipelineStage[] } | null | undefined;
}

// Returns black or white text depending on background luminance
function contrastText(hex: string): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return '#fff';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#000' : '#fff';
}

const ApplicantStageBadge: React.FC<Props> = ({ stageId, pipeline }) => {
  if (!stageId || !pipeline) {
    return <span className="text-muted-foreground">—</span>;
  }
  const stage = pipeline.stages.find((s) => s.id === stageId);
  if (!stage) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <Badge
      className="border-transparent hover:opacity-90"
      style={{ backgroundColor: stage.color, color: contrastText(stage.color) }}
    >
      {stage.name}
    </Badge>
  );
};

export default ApplicantStageBadge;

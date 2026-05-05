import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Tag as TagIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useApplicantTags } from '@/hooks/recruitment/useApplicantTags';
import { TagChip } from '../applicants/TagPicker';
import { daysSince, type PipelineApplication } from './usePipeline';

interface Props {
  app: PipelineApplication;
  isOverlay?: boolean;
}

const SOURCE_ABBR: Record<string, { letter: string; className: string }> = {
  meta_lead_ad: { letter: 'M', className: 'bg-blue-100 text-blue-700' },
  finn: { letter: 'F', className: 'bg-orange-100 text-orange-700' },
  website: { letter: 'N', className: 'bg-purple-100 text-purple-700' },
  referral: { letter: 'R', className: 'bg-green-100 text-green-700' },
  manual: { letter: 'M', className: 'bg-muted text-muted-foreground' },
  csv_import: { letter: 'C', className: 'bg-indigo-100 text-indigo-700' },
};

function scoreColor(score: number | null) {
  if (score == null) return 'bg-muted';
  if (score < 30) return 'bg-red-500';
  if (score <= 60) return 'bg-amber-500';
  return 'bg-green-500';
}

function initials(name: string | null | undefined) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

const PipelineCard: React.FC<Props> = ({ app, isOverlay }) => {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: app.id,
    data: { app },
  });

  const days = daysSince(app.updated_at);
  const source = app.applicants?.source ?? 'manual';
  const src = SOURCE_ABBR[source] ?? SOURCE_ABBR.manual;
  const assigned = app.profiles;
  const { data: tagLinks } = useApplicantTags(app.applicant_id);
  const tags = (tagLinks ?? []).map((l) => l.recruitment_tags).filter(Boolean) as Array<{ id: string; name: string; color: string }>;

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging && !isOverlay ? 0.4 : 1,
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isOverlay) return;
    // Only navigate on a true click, not a drag end
    e.stopPropagation();
    navigate(`/operations/recruitment/applicants/${app.applicant_id}`);
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      className={cn(
        'p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow select-none',
        isOverlay && 'shadow-lg ring-2 ring-primary'
      )}
    >
      <div className="font-medium text-sm leading-tight">
        {app.applicants?.first_name} {app.applicants?.last_name}
      </div>
      <div className="text-xs text-muted-foreground truncate mt-0.5">
        {app.job_positions?.title ?? '—'}
      </div>
      <div className="flex items-center justify-between gap-2 mt-3">
        <div className="flex items-center gap-1.5">
          <span className={cn('h-2 w-2 rounded-full', scoreColor(app.score))} />
          <span className="text-xs font-medium">
            {app.score ?? '—'}
          </span>
        </div>
        <span
          className={cn(
            'text-xs',
            days > 7 ? 'text-destructive font-medium' : 'text-muted-foreground'
          )}
        >
          {days} d
        </span>
        <div className="flex items-center gap-1.5">
          {tags.length > 0 && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground border rounded px-1 py-0.5">
                    <TagIcon className="h-3 w-3" />
                    {tags.length}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {tags.map((t) => (
                      <TagChip key={t.id} tag={t} size="sm" />
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {assigned ? (
            <Avatar className="h-5 w-5">
              {assigned.avatar_url && <AvatarImage src={assigned.avatar_url} />}
              <AvatarFallback className="text-[9px]">
                {initials(assigned.full_name)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <span className="h-5 w-5 rounded-full border border-dashed border-muted-foreground/40" />
          )}
          <span
            className={cn(
              'inline-flex items-center justify-center h-5 w-5 rounded text-[10px] font-semibold',
              src.className
            )}
            title={source}
          >
            {src.letter}
          </span>
        </div>
      </div>
    </Card>
  );
};

export default PipelineCard;

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { EmailTemplate } from './types';
import type { Stage } from '../pipeline/types';
import { format } from 'date-fns';

interface Props {
  template: EmailTemplate;
  selected: boolean;
  stages: Stage[] | undefined;
  onClick: () => void;
}

export function EmailTemplateListRow({ template, selected, stages, onClick }: Props) {
  const stage = template.stage_trigger
    ? stages?.find((s) => s.id === template.stage_trigger)
    : null;
  const isOrphan = !!template.stage_trigger && !stage;
  const isDeleted = !!template.soft_deleted_at;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-md border bg-card px-3 py-2.5 transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
        selected
          ? 'border-l-4 border-l-primary border-y-input border-r-input bg-accent/50'
          : 'border-input',
      )}
    >
      <div className="font-semibold text-sm truncate">{template.name || '(uten navn)'}</div>
      <div className="text-xs text-muted-foreground truncate mt-0.5">
        {template.description || template.subject || '—'}
      </div>
      <div className="flex flex-wrap gap-1 mt-1.5">
        {template.stage_trigger ? (
          isOrphan ? (
            <Badge
              variant="outline"
              className="text-[10px] h-5 border-amber-500 text-amber-700 bg-amber-50"
            >
              Ved: {template.stage_trigger} (ukjent)
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-[10px] h-5"
              style={{
                borderColor: stage!.color,
                color: stage!.color,
                backgroundColor: `${stage!.color}15`,
              }}
            >
              Ved: {stage!.name}
            </Badge>
          )
        ) : (
          <Badge variant="secondary" className="text-[10px] h-5">
            Manuell
          </Badge>
        )}
        {!template.is_active && !isDeleted && (
          <Badge variant="outline" className="text-[10px] h-5 text-muted-foreground">
            Inaktiv
          </Badge>
        )}
        {isDeleted && (
          <Badge
            variant="outline"
            className="text-[10px] h-5 border-destructive/50 text-destructive bg-destructive/5"
          >
            Slettet {format(new Date(template.soft_deleted_at!), 'dd.MM.yyyy')}
          </Badge>
        )}
      </div>
    </button>
  );
}

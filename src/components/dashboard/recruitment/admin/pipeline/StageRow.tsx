import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Stage } from './types';

interface Props {
  stage: Stage;
  applicationCount: number | undefined;
  onEdit: () => void;
  onDelete: () => void;
}

export function StageRow({ stage, applicationCount, onEdit, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stage.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const count = applicationCount ?? 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 rounded-md border bg-card"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        aria-label="Dra for å endre rekkefølge"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div
        className="h-3 w-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: stage.color }}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium truncate">{stage.name}</span>
          <code className="text-xs text-muted-foreground font-mono">{stage.id}</code>
          {stage.is_system && (
            <Badge variant="outline" className="text-xs">
              System
            </Badge>
          )}
        </div>
      </div>

      <Badge variant="secondary" className="flex-shrink-0">
        {count === 0 ? 'Ingen søkere' : `${count} ${count === 1 ? 'søker' : 'søkere'}`}
      </Badge>

      <Button size="icon" variant="ghost" onClick={onEdit} aria-label="Rediger stadium">
        <Pencil className="h-4 w-4" />
      </Button>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                size="icon"
                variant="ghost"
                onClick={onDelete}
                disabled={stage.is_system}
                aria-label="Slett stadium"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </span>
          </TooltipTrigger>
          {stage.is_system && (
            <TooltipContent>Systemstadier kan ikke slettes</TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

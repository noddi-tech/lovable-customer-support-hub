import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  MoreVertical,
  Pencil,
  Copy,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  type AutomationRule,
  type RuleLookups,
  formatTriggerSummary,
  formatActionSummary,
} from './types';
import { useRuleMutations } from './hooks/useRuleMutations';

interface Props {
  rule: AutomationRule;
  lookups: RuleLookups;
  onEdit: () => void;
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'aldri';
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'nå nettopp';
  const min = Math.floor(sec / 60);
  if (min < 60) return `for ${min} min siden`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `for ${hr} t siden`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `for ${day} d siden`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `for ${mo} mnd siden`;
  const yr = Math.floor(mo / 12);
  return `for ${yr} år siden`;
}

export function RuleCard({ rule, lookups, onEdit }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: rule.id });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const { toggleActive, duplicateRule, deleteRule } = useRuleMutations();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : rule.is_active ? 1 : 0.6,
  };

  const triggerSummary = formatTriggerSummary(rule, lookups);
  const actionSummary = formatActionSummary(rule, lookups);

  const handleDuplicate = () => {
    duplicateRule.mutate(rule, {
      onSuccess: () => toast.success('Regel duplisert'),
      onError: (e: any) => toast.error(e?.message ?? 'Kunne ikke duplisere'),
    });
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);

    if (!open && pendingDelete) {
      setTimeout(() => {
        deleteRule.mutate(rule.id, {
          onSuccess: () => toast.success('Regel slettet'),
          onError: (e: any) => toast.error(e?.message ?? 'Kunne ikke slette'),
        });
        setPendingDelete(false);
      }, 150);
    }
  };

  const handleConfirmDelete = () => {
    setPendingDelete(true);
    setDialogOpen(false);
  };

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        className="!p-0 overflow-hidden"
      >
        <div className="flex items-stretch gap-0">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground hover:bg-muted/50 px-2 flex items-center"
            aria-label="Dra for å endre rekkefølge"
            type="button"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          <div className="flex-1 min-w-0 py-3 pr-3 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <h4 className="font-semibold text-sm truncate">{rule.name}</h4>
                {!rule.is_active && (
                  <span className="text-[10px] italic text-muted-foreground">
                    Inaktiv
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Switch
                  checked={rule.is_active}
                  onCheckedChange={(v) =>
                    toggleActive.mutate({ id: rule.id, is_active: v })
                  }
                  aria-label="Veksle aktiv"
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Handlinger"
                      className="h-8 w-8"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={onEdit}>
                      <Pencil className="h-4 w-4" />
                      Rediger
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleDuplicate}>
                      <Copy className="h-4 w-4" />
                      Dupliser
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={() => setDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Slett
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {rule.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {rule.description}
              </p>
            )}

            <div className="flex items-center gap-2 flex-wrap text-xs">
              <Badge variant="secondary" className="font-normal">
                {triggerSummary}
              </Badge>
              <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
              <Badge variant="outline" className="font-normal">
                {actionSummary}
              </Badge>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Utført {rule.execution_count ?? 0} ganger • Sist utført{' '}
              {formatRelative(rule.last_executed_at)}
            </p>
          </div>
        </div>
      </Card>

      <AlertDialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slett automasjonsregel?</AlertDialogTitle>
            <AlertDialogDescription>
              Dette vil slette '{rule.name}' permanent. Utførelseshistorikk
              bevares for revisjonsformål.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Slett regel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

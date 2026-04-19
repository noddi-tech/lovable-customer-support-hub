import { useEffect, useState } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';
import type { Stage } from './types';

interface RemovedEntry {
  stage: Stage;
  count: number;
}

interface Props {
  open: boolean;
  removedStages: RemovedEntry[];
  availableTargets: Stage[];
  onClose: () => void;
  onConfirm: (assignments: Record<string, string>) => void;
}

export function DeleteStageDialog({
  open,
  removedStages,
  availableTargets,
  onClose,
  onConfirm,
}: Props) {
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) setAssignments({});
  }, [open]);

  const allAssigned =
    removedStages.length > 0 && removedStages.every((r) => !!assignments[r.stage.id]);

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Bekreft sletting og omfordeling
          </AlertDialogTitle>
          <AlertDialogDescription>
            Følgende stadier skal slettes, men har aktive søkere. Velg et mål-stadium for hver
            slik at søkere ikke går tapt.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-2">
          {removedStages.map(({ stage, count }) => (
            <div
              key={stage.id}
              className="flex items-center gap-3 p-3 rounded-md border bg-muted/30"
            >
              <div
                className="h-3 w-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: stage.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{stage.name}</div>
                <div className="text-xs text-muted-foreground">
                  {count} {count === 1 ? 'søker' : 'søkere'}
                </div>
              </div>
              <Select
                value={assignments[stage.id] ?? ''}
                onValueChange={(v) =>
                  setAssignments((prev) => ({ ...prev, [stage.id]: v }))
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Flytt til..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTargets.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Avbryt</AlertDialogCancel>
          <AlertDialogAction
            disabled={!allAssigned}
            onClick={() => onConfirm(assignments)}
          >
            Bekreft og omfordele
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

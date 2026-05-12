import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  useCreateScoringBaseline,
  useUpdateScoringBaseline,
  type ScoringBaseline,
  type ScoringRubric,
} from '@/hooks/recruitment/useScoringBaselines';
import { RubricBuilder, emptyRubric } from './RubricBuilder';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  baseline: ScoringBaseline | null;
}

export const ScoringBaselineDialog: React.FC<Props> = ({ open, onOpenChange, baseline }) => {
  const { toast } = useToast();
  const create = useCreateScoringBaseline();
  const update = useUpdateScoringBaseline();
  const isEdit = !!baseline;

  const [name, setName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [rubric, setRubric] = useState<ScoringRubric>(emptyRubric());

  useEffect(() => {
    if (open) {
      setName(baseline?.name ?? '');
      setIsDefault(baseline?.is_default ?? false);
      setRubric((baseline?.rubric as ScoringRubric) ?? emptyRubric());
    }
  }, [open, baseline]);

  const totalWeight = rubric.criteria.reduce((a, c) => a + (Number(c.weight) || 0), 0);
  const canSave =
    name.trim().length > 0 &&
    rubric.criteria.length > 0 &&
    rubric.criteria.every((c) => c.name.trim().length > 0) &&
    totalWeight === 100;

  const handleSave = async () => {
    try {
      if (isEdit && baseline) {
        await update.mutateAsync({ id: baseline.id, name: name.trim(), rubric, is_default: isDefault });
        toast({ title: 'Baseline oppdatert' });
      } else {
        await create.mutateAsync({ name: name.trim(), rubric, is_default: isDefault });
        toast({ title: 'Baseline opprettet' });
      }
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Kunne ikke lagre', description: e?.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Rediger baseline' : 'Ny scoring-baseline'}</DialogTitle>
          <DialogDescription>
            En baseline er et gjenbrukbart sett kriterier som stillinger kan kopiere fra.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="baseline-name">Navn</Label>
            <Input
              id="baseline-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="F.eks. Standard sjåfør-rolle"
            />
          </div>

          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <div>
              <Label>Standard for nye stillinger</Label>
              <p className="text-xs text-muted-foreground">
                Nye stillinger med scoring aktivert vil bruke denne automatisk.
              </p>
            </div>
            <Switch checked={isDefault} onCheckedChange={setIsDefault} />
          </div>

          <RubricBuilder value={rubric} onChange={setRubric} />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave || create.isPending || update.isPending}
          >
            {isEdit ? 'Lagre endringer' : 'Opprett baseline'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

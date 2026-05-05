import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, Check } from 'lucide-react';
import { PRESET_COLORS, slugifyStageId, ensureUniqueStageId, type Stage } from './types';

interface Props {
  open: boolean;
  stage: Stage | null;
  mode: 'create' | 'edit';
  existingIds: string[];
  onClose: () => void;
  onSave: (updated: Stage) => void;
}

export function StageEditDialog({ open, stage, mode, existingIds, onClose, onSave }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string>(PRESET_COLORS[0].value);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [generatedId, setGeneratedId] = useState('');

  useEffect(() => {
    if (open && stage) {
      setName(stage.name);
      setDescription(stage.description ?? '');
      setColor(stage.color || PRESET_COLORS[0].value);
      setGeneratedId(stage.id);
      setAdvancedOpen(false);
    }
  }, [open, stage]);

  const isCreate = mode === 'create';
  const trimmedName = name.trim();
  const valid = trimmedName.length > 0;

  const handleNameBlur = () => {
    if (isCreate && trimmedName) {
      const base = slugifyStageId(trimmedName);
      const without = existingIds.filter((id) => id !== stage?.id);
      const unique = ensureUniqueStageId(base, without);
      setGeneratedId(unique);
    }
  };

  const handleSubmit = () => {
    if (!valid || !stage) return;
    const finalId = isCreate
      ? generatedId ||
        ensureUniqueStageId(
          slugifyStageId(trimmedName),
          existingIds.filter((id) => id !== stage.id),
        )
      : stage.id;
    onSave({
      ...stage,
      id: finalId,
      name: trimmedName,
      description: description.trim() || undefined,
      color,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isCreate ? 'Legg til stadium' : 'Rediger stadium'}</DialogTitle>
          <DialogDescription>
            {isCreate
              ? 'Definer et nytt stadium i pipelinen.'
              : 'Endre navn, farge eller beskrivelse for dette stadiet.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="stage-name">Navn</Label>
            <Input
              id="stage-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleNameBlur}
              placeholder="f.eks. Screening"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stage-desc">Beskrivelse</Label>
            <Textarea
              id="stage-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Valgfri intern beskrivelse for administratorer"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Farge</Label>
            <div className="grid grid-cols-8 gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`h-8 w-8 rounded-md flex items-center justify-center transition-all ${
                    color === c.value ? 'ring-2 ring-ring ring-offset-2' : ''
                  }`}
                  style={{ backgroundColor: c.value }}
                  aria-label={c.label}
                  title={c.label}
                >
                  {color === c.value && <Check className="h-4 w-4 text-white" />}
                </button>
              ))}
            </div>
          </div>

          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="px-0 hover:bg-transparent">
                <ChevronDown
                  className={`h-4 w-4 mr-1 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
                />
                Avansert
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
              <Label htmlFor="stage-id">Stadium-ID</Label>
              <Input
                id="stage-id"
                value={isCreate ? generatedId : stage?.id ?? ''}
                readOnly
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Brukes internt av systemet. Kan ikke endres etter at stadiet er opprettet.
              </p>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Avbryt
          </Button>
          <Button onClick={handleSubmit} disabled={!valid}>
            {isCreate ? 'Legg til' : 'Lagre'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import React, { useMemo } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { ScoringRubric, RubricCriterion } from '@/hooks/recruitment/useScoringBaselines';

function makeCriterion(): RubricCriterion {
  return {
    id: `c_${Math.random().toString(36).slice(2, 9)}`,
    name: '',
    description: '',
    weight: 0,
    max_score: 10,
  };
}

export function emptyRubric(): ScoringRubric {
  return {
    criteria: [
      { ...makeCriterion(), name: 'Erfaring', description: 'Relevant arbeidserfaring og bakgrunn', weight: 40 },
      { ...makeCriterion(), name: 'Tilgjengelighet', description: 'Kan starte på ønsket tidspunkt', weight: 30 },
      { ...makeCriterion(), name: 'Motivasjon', description: 'Tydelig motivasjon og passform', weight: 30 },
    ],
    instructions: '',
    include_files: true,
    include_custom_fields: true,
  };
}

interface Props {
  value: ScoringRubric;
  onChange: (r: ScoringRubric) => void;
  disabled?: boolean;
}

export const RubricBuilder: React.FC<Props> = ({ value, onChange, disabled }) => {
  const totalWeight = useMemo(
    () => value.criteria.reduce((acc, c) => acc + (Number(c.weight) || 0), 0),
    [value.criteria],
  );
  const weightOk = totalWeight === 100;

  const update = (patch: Partial<ScoringRubric>) => onChange({ ...value, ...patch });
  const updateCriterion = (idx: number, patch: Partial<RubricCriterion>) => {
    const next = value.criteria.map((c, i) => (i === idx ? { ...c, ...patch } : c));
    update({ criteria: next });
  };
  const addCriterion = () => update({ criteria: [...value.criteria, makeCriterion()] });
  const removeCriterion = (idx: number) =>
    update({ criteria: value.criteria.filter((_, i) => i !== idx) });

  const distributeEvenly = () => {
    const n = value.criteria.length;
    if (n === 0) return;
    const base = Math.floor(100 / n);
    const remainder = 100 - base * n;
    update({
      criteria: value.criteria.map((c, i) => ({ ...c, weight: base + (i < remainder ? 1 : 0) })),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-semibold">Kriterier</Label>
          <p className="text-xs text-muted-foreground">
            Vekter må summere til 100. Hvert kriterium vurderes på 0–10.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-xs font-medium px-2 py-1 rounded-md',
              weightOk
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700',
            )}
          >
            Sum: {totalWeight}/100
          </span>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={distributeEvenly}
            disabled={disabled || value.criteria.length === 0}
          >
            Fordel jevnt
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {value.criteria.map((c, idx) => (
          <div
            key={c.id}
            className="rounded-md border bg-card p-3 space-y-2"
          >
            <div className="flex items-start gap-2">
              <GripVertical className="h-4 w-4 mt-2 text-muted-foreground shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-2">
                  <Input
                    value={c.name}
                    onChange={(e) => updateCriterion(idx, { name: e.target.value })}
                    placeholder="Kriterium (f.eks. Erfaring)"
                    disabled={disabled}
                  />
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={c.weight}
                      onChange={(e) =>
                        updateCriterion(idx, { weight: Number(e.target.value) || 0 })
                      }
                      disabled={disabled}
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </div>
                <Textarea
                  value={c.description}
                  onChange={(e) => updateCriterion(idx, { description: e.target.value })}
                  placeholder="Beskrivelse av hva som vurderes"
                  rows={2}
                  disabled={disabled}
                />
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => removeCriterion(idx)}
                disabled={disabled}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" size="sm" variant="outline" onClick={addCriterion} disabled={disabled}>
        <Plus className="h-3.5 w-3.5 mr-1" />
        Legg til kriterium
      </Button>

      <div className="space-y-2 pt-2 border-t">
        <Label className="text-sm font-semibold">Tilleggsinstruks (valgfritt)</Label>
        <Textarea
          value={value.instructions ?? ''}
          onChange={(e) => update({ instructions: e.target.value })}
          placeholder="Ekstra kontekst gitt til AI for hver scoring (f.eks. spesifikke bransje-krav)."
          rows={3}
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div>
            <Label className="text-sm">Inkluder CV/filer</Label>
            <p className="text-xs text-muted-foreground">Sender utdratt tekst fra opplastede filer.</p>
          </div>
          <Switch
            checked={value.include_files !== false}
            onCheckedChange={(v) => update({ include_files: v })}
            disabled={disabled}
          />
        </div>
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <div>
            <Label className="text-sm">Inkluder skjema-svar</Label>
            <p className="text-xs text-muted-foreground">Sender egendefinerte feltverdier.</p>
          </div>
          <Switch
            checked={value.include_custom_fields !== false}
            onCheckedChange={(v) => update({ include_custom_fields: v })}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sparkles, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  usePositionScoringConfig,
  useUpdatePositionScoringConfig,
} from '@/hooks/recruitment/usePositionScoringConfig';
import {
  useScoringBaselines,
  type ScoringRubric,
} from '@/hooks/recruitment/useScoringBaselines';
import { RubricBuilder, emptyRubric } from '../admin/scoring/RubricBuilder';

interface Props {
  positionId: string;
}

const NONE_VALUE = '__none__';

const PositionScoringConfig: React.FC<Props> = ({ positionId }) => {
  const { data: config, isLoading } = usePositionScoringConfig(positionId);
  const { data: baselines } = useScoringBaselines();
  const update = useUpdatePositionScoringConfig();
  const { toast } = useToast();

  const [enabled, setEnabled] = useState(false);
  const [baselineId, setBaselineId] = useState<string | null>(null);
  const [overrideRubric, setOverrideRubric] = useState(false);
  const [rubric, setRubric] = useState<ScoringRubric>(emptyRubric());
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!config) return;
    setEnabled(!!config.scoring_enabled);
    setBaselineId(config.scoring_global_baseline_id);
    setOverrideRubric(!!config.scoring_rubric);
    setRubric((config.scoring_rubric as ScoringRubric) ?? emptyRubric());
    setDirty(false);
  }, [config]);

  const markDirty = () => setDirty(true);

  const totalWeight = rubric.criteria.reduce((a, c) => a + (Number(c.weight) || 0), 0);
  const baseline = baselines?.find((b) => b.id === baselineId) ?? null;
  const effectiveRubric: ScoringRubric | null = overrideRubric
    ? rubric
    : (baseline?.rubric as ScoringRubric | undefined) ?? null;

  const canSave =
    !enabled
      ? true
      : !!effectiveRubric &&
        effectiveRubric.criteria.length > 0 &&
        effectiveRubric.criteria.every((c) => c.name.trim().length > 0) &&
        effectiveRubric.criteria.reduce((a, c) => a + (Number(c.weight) || 0), 0) === 100;

  const handleSave = async () => {
    try {
      await update.mutateAsync({
        id: positionId,
        scoring_enabled: enabled,
        scoring_global_baseline_id: enabled ? baselineId : null,
        scoring_rubric: enabled && overrideRubric ? rubric : null,
      });
      toast({ title: 'Scoring-konfigurasjon lagret' });
      setDirty(false);
    } catch (e: any) {
      toast({ title: 'Kunne ikke lagre', description: e?.message, variant: 'destructive' });
    }
  };

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI-scoring
            </CardTitle>
            <CardDescription>
              Når aktivert scorer AI nye søkere automatisk på 0–100 basert på rubrikken under.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="scoring-toggle" className="text-sm">Aktiver</Label>
            <Switch
              id="scoring-toggle"
              checked={enabled}
              onCheckedChange={(v) => { setEnabled(v); markDirty(); }}
            />
          </div>
        </div>
      </CardHeader>
      {enabled && (
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Baseline</Label>
            <Select
              value={baselineId ?? NONE_VALUE}
              onValueChange={(v) => {
                setBaselineId(v === NONE_VALUE ? null : v);
                markDirty();
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Velg en baseline" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>(Ingen — bruk egen rubrik)</SelectItem>
                {(baselines ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name} {b.is_default && '★'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(baselines ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Ingen baselines tilgjengelig. Opprett en under Rekruttering → Innstillinger →
                Scoring, eller huk av «Egen rubrik» under.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <div>
              <Label>Egen rubrik for denne stillingen</Label>
              <p className="text-xs text-muted-foreground">
                Overstyrer baseline. Endringer påvirker kun fremtidige scoringer.
              </p>
            </div>
            <Switch
              checked={overrideRubric}
              onCheckedChange={(v) => {
                setOverrideRubric(v);
                if (v && (!rubric.criteria || rubric.criteria.length === 0)) {
                  setRubric(baseline ? (baseline.rubric as ScoringRubric) : emptyRubric());
                }
                markDirty();
              }}
            />
          </div>

          {overrideRubric ? (
            <RubricBuilder value={rubric} onChange={(r) => { setRubric(r); markDirty(); }} />
          ) : baseline ? (
            <div className="rounded-md border bg-muted/30 p-3 space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Forhåndsvisning av baseline-rubrik
              </div>
              <ul className="text-sm space-y-1">
                {(baseline.rubric?.criteria ?? []).map((c) => (
                  <li key={c.id} className="flex justify-between gap-3">
                    <span>{c.name}</span>
                    <Badge variant="secondary">{c.weight}%</Badge>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {overrideRubric && totalWeight !== 100 && (
            <p className="text-xs text-amber-700 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Vekter må summere til 100 (nå: {totalWeight}).
            </p>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={!dirty || !canSave || update.isPending}>
              Lagre
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default PositionScoringConfig;

import React, { useEffect, useState } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Sparkles, AlertCircle, CheckCircle2, CircleSlash, ChevronDown, ChevronRight,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  usePositionScoringConfig,
  useUpdatePositionScoringConfig,
} from '@/hooks/recruitment/usePositionScoringConfig';
import {
  useScoringBaselines,
  type ScoringRubric,
} from '@/hooks/recruitment/useScoringBaselines';
import {
  usePositionRubricStatus,
  type PositionRubricStatus,
} from '@/hooks/recruitment/usePositionRubricStatus';
import { RubricBuilder, emptyRubric } from '../admin/scoring/RubricBuilder';

interface Props {
  positionId: string;
}

const NONE_VALUE = '__none__';

function statusCopy(s: PositionRubricStatus): { label: string; tone: 'active' | 'inactive' | 'off' } {
  switch (s.state) {
    case 'active':
      if (s.source === 'own') return { label: 'AI-scoring aktiv (egen rubrik)', tone: 'active' };
      if (s.source === 'baseline')
        return { label: `AI-scoring aktiv (bruker baseline: ${s.baselineName})`, tone: 'active' };
      return { label: `AI-scoring aktiv (org-standard: ${s.baselineName})`, tone: 'active' };
    case 'force_disabled':
      return { label: 'AI-scoring deaktivert manuelt', tone: 'off' };
    case 'inactive':
    default:
      return {
        label: 'AI-scoring ikke konfigurert — legg til rubrik eller sett en standard baseline',
        tone: 'inactive',
      };
  }
}

const PositionScoringConfig: React.FC<Props> = ({ positionId }) => {
  const qc = useQueryClient();
  const { data: config, isLoading } = usePositionScoringConfig(positionId);
  const { data: baselines } = useScoringBaselines();
  const { data: status } = usePositionRubricStatus(positionId);
  const update = useUpdatePositionScoringConfig();
  const { toast } = useToast();

  const [baselineId, setBaselineId] = useState<string | null>(null);
  const [overrideRubric, setOverrideRubric] = useState(false);
  const [rubric, setRubric] = useState<ScoringRubric>(emptyRubric());
  const [dirty, setDirty] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    if (!config) return;
    setBaselineId(config.scoring_global_baseline_id);
    setOverrideRubric(!!config.scoring_rubric);
    setRubric((config.scoring_rubric as ScoringRubric) ?? emptyRubric());
    setDirty(false);
  }, [config]);

  const markDirty = () => setDirty(true);

  const totalWeight = rubric.criteria.reduce((a, c) => a + (Number(c.weight) || 0), 0);
  const baseline = baselines?.find((b) => b.id === baselineId) ?? null;

  const canSave = overrideRubric
    ? rubric.criteria.length > 0 &&
      rubric.criteria.every((c) => c.name.trim().length > 0) &&
      totalWeight === 100
    : true;

  const handleSave = async () => {
    try {
      await update.mutateAsync({
        id: positionId,
        scoring_global_baseline_id: baselineId,
        scoring_rubric: overrideRubric ? rubric : null,
      });
      toast({ title: 'Scoring-konfigurasjon lagret' });
      setDirty(false);
      qc.invalidateQueries({ queryKey: ['position-rubric-status', positionId] });
    } catch (e: any) {
      toast({ title: 'Kunne ikke lagre', description: e?.message, variant: 'destructive' });
    }
  };

  const handleReactivate = async () => {
    try {
      await update.mutateAsync({ id: positionId, scoring_enabled: true });
      toast({ title: 'AI-scoring reaktivert' });
      qc.invalidateQueries({ queryKey: ['position-rubric-status', positionId] });
    } catch (e: any) {
      toast({ title: 'Kunne ikke reaktivere', description: e?.message, variant: 'destructive' });
    }
  };

  const handleForceDisable = async (next: boolean) => {
    try {
      await update.mutateAsync({ id: positionId, scoring_enabled: !next });
      toast({ title: next ? 'AI-scoring stoppet' : 'AI-scoring reaktivert' });
      qc.invalidateQueries({ queryKey: ['position-rubric-status', positionId] });
    } catch (e: any) {
      toast({ title: 'Kunne ikke endre', description: e?.message, variant: 'destructive' });
    }
  };

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  const copy = status ? statusCopy(status) : null;
  const isForceOff = config?.scoring_enabled === false;

  return (
    <Card>
      <CardHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI-scoring
            </CardTitle>
            <CardDescription>
              Når en rubrik er tilgjengelig, scorer AI alle søkere automatisk på 0–10. Velg en
              baseline eller lag en egen rubrik nedenfor.
            </CardDescription>
          </div>

          {copy && (
            <div
              className={
                'flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm ' +
                (copy.tone === 'active'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : copy.tone === 'off'
                  ? 'border-amber-200 bg-amber-50 text-amber-900'
                  : 'border-muted bg-muted/30 text-muted-foreground')
              }
            >
              <span className="flex items-center gap-2">
                {copy.tone === 'active' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : copy.tone === 'off' ? (
                  <CircleSlash className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {copy.label}
              </span>
              {copy.tone === 'off' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReactivate}
                  disabled={update.isPending}
                  className="h-7"
                >
                  Reaktiver
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>

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
              <SelectItem value={NONE_VALUE}>(Ingen — bruk org-standard eller egen rubrik)</SelectItem>
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

        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              {advancedOpen ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              Avansert
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <div className="flex items-start justify-between gap-4 rounded-md border px-3 py-2">
              <div className="space-y-0.5">
                <Label className="text-sm">Stopp AI-scoring for denne stillingen</Label>
                <p className="text-xs text-muted-foreground">
                  Stopper scoring uten å fjerne rubrikk. Kan reaktiveres når som helst.
                </p>
              </div>
              <Switch
                checked={isForceOff}
                onCheckedChange={(v) => handleForceDisable(v)}
                disabled={update.isPending}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

export default PositionScoringConfig;

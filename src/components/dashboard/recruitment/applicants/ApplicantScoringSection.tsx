import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  History,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useApplicationScore } from '@/hooks/recruitment/useApplicationScore';
import { useTriggerScore } from '@/hooks/recruitment/useTriggerScore';
import { useDateFormatting } from '@/hooks/useDateFormatting';
import { toast } from 'sonner';
import { scoreTier, TIER_LABEL, TIER_SOLID_BG, TIER_TEXT } from './scoreTier';
import ScoreHistoryModal from './ScoreHistoryModal';
import { cn } from '@/lib/utils';

interface Props {
  applicationId: string | null;
  positionTitle?: string | null;
}

const StateShell: React.FC<{ children: React.ReactNode; tone?: 'default' | 'muted' | 'warn' }> = ({
  children,
  tone = 'default',
}) => (
  <Card
    className={cn(
      tone === 'muted' && 'bg-muted/30',
      tone === 'warn' && 'border-amber-300 bg-amber-50/50',
    )}
  >
    <CardContent className="p-5">{children}</CardContent>
  </Card>
);

const ApplicantScoringSection: React.FC<Props> = ({ applicationId, positionTitle }) => {
  const { data, isLoading } = useApplicationScore(applicationId);
  const trigger = useTriggerScore();
  const { dateTime } = useDateFormatting();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  if (!applicationId) {
    return (
      <StateShell tone="muted">
        <p className="text-sm text-muted-foreground">
          Ingen tilknyttet stilling — score er ikke tilgjengelig.
        </p>
      </StateShell>
    );
  }

  if (isLoading) {
    return (
      <StateShell tone="muted">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Henter score...
        </div>
      </StateShell>
    );
  }

  const status = data?.score_status ?? 'unscored';
  const onRescore = () => {
    if (!applicationId) return;
    trigger.mutate(
      { application_id: applicationId, trigger_reason: 'manual' },
      {
        onSuccess: (res) => {
          toast.success(res?.already_pending ? 'Allerede i kø' : 'Score er satt i kø');
        },
        onError: (e: any) => toast.error(e?.message ?? 'Kunne ikke starte scoring'),
      },
    );
  };

  // ----- DISABLED (skipped by config) -----
  if (status === 'skipped') {
    return (
      <StateShell tone="muted">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            AI-scoring er ikke aktivert for {positionTitle || 'denne stillingen'}.
          </div>
          <Button size="sm" variant="outline" onClick={onRescore} disabled={trigger.isPending}>
            <RefreshCw className={cn('h-3.5 w-3.5', trigger.isPending && 'animate-spin')} />
            Score likevel
          </Button>
        </div>
      </StateShell>
    );
  }

  // ----- SCORING IN PROGRESS -----
  if (status === 'pending' || status === 'scoring') {
    return (
      <StateShell>
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <div>
            <div className="font-medium text-sm">AI vurderer søkeren...</div>
            <div className="text-xs text-muted-foreground">
              Dette tar vanligvis under ett minutt. Oppdateres automatisk.
            </div>
          </div>
        </div>
      </StateShell>
    );
  }

  // ----- FAILED -----
  if (status === 'failed') {
    return (
      <StateShell tone="warn">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <div className="font-medium text-sm">Scoring feilet</div>
              <div className="text-xs text-muted-foreground">
                AI-vurderingen kunne ikke fullføres. Prøv på nytt.
              </div>
            </div>
          </div>
          <Button size="sm" onClick={onRescore} disabled={trigger.isPending}>
            <RefreshCw className={cn('h-3.5 w-3.5', trigger.isPending && 'animate-spin')} />
            Prøv på nytt
          </Button>
        </div>
      </StateShell>
    );
  }

  // ----- NOT SCORED -----
  if (status === 'unscored' || data?.score == null) {
    return (
      <StateShell tone="muted">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Søkeren er ikke vurdert ennå.</span>
          </div>
          <Button size="sm" onClick={onRescore} disabled={trigger.isPending}>
            <Sparkles className="h-3.5 w-3.5" />
            Score nå
          </Button>
        </div>
      </StateShell>
    );
  }

  // ----- SCORED -----
  const tier = scoreTier(data.score);
  const strengths = data.score_strengths ?? [];
  const concerns = data.score_concerns ?? [];
  const breakdown = (data.score_breakdown ?? {}) as Record<string, number>;
  const breakdownEntries = Object.entries(breakdown);

  return (
    <>
      <Card>
        <CardContent className="p-5 space-y-5">
          {/* Top row: score + meta */}
          <div className="flex items-start gap-5">
            <div
              className={cn(
                'flex-shrink-0 h-20 w-20 rounded-2xl flex items-center justify-center text-white shadow-sm',
                TIER_SOLID_BG[tier],
              )}
            >
              <div className="text-center leading-none">
                <div className="text-3xl font-bold">{data.score?.toFixed(1)}</div>
                <div className="text-[10px] opacity-90 mt-0.5">/ 10</div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn('text-sm font-semibold', TIER_TEXT[tier])}>
                  {TIER_LABEL[tier]}
                </span>
                {data.score_model && (
                  <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {data.score_model}
                  </span>
                )}
              </div>
              {data.score_updated_at && (
                <div className="text-xs text-muted-foreground mt-1">
                  Sist oppdatert {dateTime(data.score_updated_at)}
                </div>
              )}
              {data.score_explanation && (
                <p className="text-sm text-foreground mt-2 leading-relaxed">
                  {data.score_explanation}
                </p>
              )}
            </div>
            <div className="flex-shrink-0 flex flex-col gap-1.5">
              <Button size="sm" variant="outline" onClick={onRescore} disabled={trigger.isPending}>
                <RefreshCw className={cn('h-3.5 w-3.5', trigger.isPending && 'animate-spin')} />
                Re-score nå
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setHistoryOpen(true)}>
                <History className="h-3.5 w-3.5" />
                Score-historikk
              </Button>
            </div>
          </div>

          {/* Strengths + concerns */}
          {(strengths.length > 0 || concerns.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div>
                <div className="text-xs font-medium text-green-700 mb-2">Styrker</div>
                {strengths.length === 0 ? (
                  <div className="text-xs text-muted-foreground italic">Ingen oppgitt</div>
                ) : (
                  <ul className="space-y-1.5">
                    {strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <div className="text-xs font-medium text-amber-700 mb-2">Bekymringer</div>
                {concerns.length === 0 ? (
                  <div className="text-xs text-muted-foreground italic">Ingen oppgitt</div>
                ) : (
                  <ul className="space-y-1.5">
                    {concerns.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Per-criterion breakdown */}
          {breakdownEntries.length > 0 && (
            <div className="pt-1 border-t">
              <button
                type="button"
                onClick={() => setBreakdownOpen((o) => !o)}
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground mt-3"
              >
                {breakdownOpen ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
                Per-kriterium ({breakdownEntries.length})
              </button>
              {breakdownOpen && (
                <div className="mt-3 space-y-1.5">
                  {breakdownEntries.map(([crit, val]) => {
                    const t = scoreTier(typeof val === 'number' ? val : null);
                    return (
                      <div
                        key={crit}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="text-muted-foreground truncate">{crit}</span>
                        <span className={cn('font-medium tabular-nums', TIER_TEXT[t])}>
                          {typeof val === 'number' ? val.toFixed(1) : '–'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ScoreHistoryModal
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        applicationId={applicationId}
      />
    </>
  );
};

export default ApplicantScoringSection;

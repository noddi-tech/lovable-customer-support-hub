import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Activity, ThumbsUp, ThumbsDown, VolumeX, Sparkles, Check, X, Loader2, TrendingDown, TrendingUp, RefreshCw, Info,
} from 'lucide-react';
import { useTriageHealth } from '@/hooks/useTriageHealth';
import { usePatternProposals } from '@/hooks/usePatternProposals';

const formatPct = (v: number) => `${Math.round(v * 100)}%`;

export const TriageHealthDashboard = () => {
  const { data, isLoading } = useTriageHealth();
  const { data: proposals = [], acceptProposal, rejectProposal, runMining } = usePatternProposals();

  if (isLoading || !data) {
    return (
      <Card className="bg-gradient-surface border-border/50">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const noFeedback = data.total_feedback === 0;

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card className="bg-gradient-surface border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Triage-helse</CardTitle>
                <CardDescription className="text-xs">
                  Hvor relevante er varslene? Siste 30 dager.
                </CardDescription>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => runMining.mutate()}
              disabled={runMining.isPending}
            >
              {runMining.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              )}
              Analyser nå
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-muted/30">
              <div className="text-2xl font-semibold">{data.total_alerts}</div>
              <div className="text-xs text-muted-foreground">Varsler sendt</div>
            </div>
            <div className="p-3 rounded-lg bg-success/5">
              <div className="text-2xl font-semibold text-success flex items-center gap-1">
                <ThumbsUp className="h-4 w-4" /> {formatPct(data.positive_rate)}
              </div>
              <div className="text-xs text-muted-foreground">Nyttige</div>
            </div>
            <div className="p-3 rounded-lg bg-destructive/5">
              <div className="text-2xl font-semibold text-destructive flex items-center gap-1">
                <ThumbsDown className="h-4 w-4" /> {formatPct(data.negative_rate)}
              </div>
              <div className="text-xs text-muted-foreground">Falske alarmer</div>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/5">
              <div className="text-2xl font-semibold text-amber-500 flex items-center gap-1">
                <VolumeX className="h-4 w-4" /> {formatPct(data.mute_rate)}
              </div>
              <div className="text-xs text-muted-foreground">Dempet</div>
            </div>
          </div>

          {noFeedback && (
            <Alert className="mt-4 bg-muted/30 border-border/30">
              <Info className="h-3.5 w-3.5" />
              <AlertDescription className="text-xs">
                Ingen reaksjoner registrert ennå. Be teamet reagere med 👍 / 👎 / 🔇 på Slack-varsler for å bygge opp dataen.
                Dette krever at <code className="text-[11px] bg-muted px-1 rounded">slack-event-handler</code> er konfigurert som Events URL i Slack-appen.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* AI Proposals */}
      {proposals.length > 0 && (
        <Card className="bg-gradient-surface border-primary/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Foreslåtte forbedringer
              <Badge variant="outline" className="ml-1 border-primary/40">{proposals.length}</Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              AI-genererte forslag basert på reaksjoner og historiske mønstre.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {proposals.map((p) => (
              <div key={p.id} className="border border-border/50 rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px]">
                        {p.proposal_type === 'remove_keyword' && '🚫 Fjern nøkkelord'}
                        {p.proposal_type === 'add_keyword' && '➕ Legg til nøkkelord'}
                        {p.proposal_type === 'raise_threshold' && '⬆️ Hev terskel'}
                        {p.proposal_type === 'lower_threshold' && '⬇️ Senk terskel'}
                      </Badge>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{p.value}</code>
                      {p.threshold_value && (
                        <Badge variant="outline" className="text-[10px]">→ {p.threshold_value}/5</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{p.reason}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => acceptProposal.mutate(p)}
                      disabled={acceptProposal.isPending}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Godta
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => rejectProposal.mutate(p.id)}
                      disabled={rejectProposal.isPending}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Worst triggers */}
      {data.worst_triggers.length > 0 && (
        <Card className="bg-gradient-surface border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Dårligst presterende triggere
            </CardTitle>
            <CardDescription className="text-xs">
              Triggere med ≥40% negative reaksjoner. Vurder å demote eller justere terskel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {data.worst_triggers.map((t, i) => (
              <div key={i}>
                {i > 0 && <Separator className="my-1" />}
                <div className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {t.trigger_type === 'keyword' ? 'KW' : 'AI'}
                    </Badge>
                    <span className="text-sm truncate">{t.trigger_label}</span>
                    <span className="text-xs text-muted-foreground shrink-0">— {t.total} varsler</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-xs">
                    <span className="text-destructive">{formatPct(t.negative_rate)} 👎</span>
                    {t.mute_rate > 0 && <span className="text-amber-500">{formatPct(t.mute_rate)} 🔇</span>}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Best triggers */}
      {data.best_triggers.length > 0 && (
        <Card className="bg-gradient-surface border-border/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              Best presterende triggere
            </CardTitle>
            <CardDescription className="text-xs">
              Disse fanger ekte problemer — behold dem.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {data.best_triggers.map((t, i) => (
              <div key={i}>
                {i > 0 && <Separator className="my-1" />}
                <div className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {t.trigger_type === 'keyword' ? 'KW' : 'AI'}
                    </Badge>
                    <span className="text-sm truncate">{t.trigger_label}</span>
                    <span className="text-xs text-muted-foreground shrink-0">— {t.total} varsler</span>
                  </div>
                  <span className="text-xs text-success shrink-0">{formatPct(t.positive_rate)} 👍</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

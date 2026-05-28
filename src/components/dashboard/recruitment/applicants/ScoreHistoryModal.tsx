import React, { useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUp, ChevronDown, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useScoreHistory, type ScoreHistoryEntry } from '@/hooks/recruitment/useScoreHistory';
import { useDateFormatting } from '@/hooks/useDateFormatting';
import { scoreTier, TIER_PILL } from './scoreTier';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
}

const REASON_LABEL: Record<string, string> = {
  initial: 'Første scoring',
  stage_change: 'Faseendring',
  manual: 'Manuell',
  data_change: 'Data oppdatert',
  re_run: 'Re-score',
};

function fmtCost(cost?: number | null) {
  if (cost == null) return null;
  return `$${cost.toFixed(4)}`;
}

const Entry: React.FC<{ entry: ScoreHistoryEntry; prev?: ScoreHistoryEntry; idx: number }> = ({
  entry,
  prev,
}) => {
  const [open, setOpen] = useState(false);
  const { dateTime } = useDateFormatting();
  const tier = scoreTier(entry.score);
  const delta =
    entry.score != null && prev?.score != null ? Number((entry.score - prev.score).toFixed(2)) : null;
  const tokens = entry.token_usage ?? {};

  return (
    <li className="border rounded-md">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        )}
        <span
          className={cn(
            'inline-flex items-center justify-center min-w-[2.25rem] h-7 px-2 rounded border text-sm font-semibold tabular-nums',
            TIER_PILL[tier],
          )}
        >
          {entry.score != null ? entry.score.toFixed(1) : '–'}
        </span>
        {delta != null && delta !== 0 && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-xs font-medium',
              delta > 0 ? 'text-green-600' : 'text-red-600',
            )}
          >
            {delta > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {delta > 0 ? '+' : ''}
            {delta}
          </span>
        )}
        {delta === 0 && (
          <span className="inline-flex items-center text-xs text-muted-foreground">
            <ArrowRight className="h-3 w-3" />
          </span>
        )}
        <div className="flex-1 min-w-0 flex items-center gap-2 text-sm">
          <span className="text-foreground">
            {REASON_LABEL[entry.trigger_reason ?? ''] ?? entry.trigger_reason ?? 'Ukjent'}
          </span>
        </div>
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {dateTime(entry.created_at)}
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 space-y-3 text-sm border-t bg-muted/20">
          {entry.explanation && (
            <p className="text-foreground leading-relaxed">{entry.explanation}</p>
          )}
          {(entry.strengths?.length ?? 0) > 0 && (
            <div>
              <div className="text-xs font-medium text-green-700 mb-1">Styrker</div>
              <ul className="list-disc list-inside text-xs space-y-0.5 text-foreground">
                {entry.strengths!.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {(entry.concerns?.length ?? 0) > 0 && (
            <div>
              <div className="text-xs font-medium text-amber-700 mb-1">Bekymringer</div>
              <ul className="list-disc list-inside text-xs space-y-0.5 text-foreground">
                {entry.concerns!.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
          {entry.per_criterion && Object.keys(entry.per_criterion).length > 0 && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Per kriterium</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                {Object.entries(entry.per_criterion).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <span className="text-muted-foreground truncate">{k}</span>
                    <span className="tabular-nums">
                      {typeof v === 'number' ? v.toFixed(1) : '–'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1 border-t">
            {entry.model && <span>Modell: {entry.model}</span>}
            {(tokens.input != null || tokens.output != null) && (
              <span>
                Tokens: {tokens.input ?? 0} inn / {tokens.output ?? 0} ut
              </span>
            )}
            {fmtCost(tokens.cost_usd ?? null) && <span>Kostnad: {fmtCost(tokens.cost_usd!)}</span>}
          </div>
        </div>
      )}
    </li>
  );
};

const ScoreHistoryModal: React.FC<Props> = ({ open, onOpenChange, applicationId }) => {
  const { data, isLoading } = useScoreHistory(open ? applicationId : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Score-historikk</DialogTitle>
          <DialogDescription>
            Alle AI-vurderinger for denne søknaden, nyeste først.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !data || data.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Ingen historikk ennå.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.map((entry, i) => (
                <Entry key={entry.id} entry={entry} prev={data[i + 1]} idx={i} />
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ScoreHistoryModal;

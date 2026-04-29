import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Loader2,
  KeyRound,
  Webhook,
  Inbox,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { nb } from 'date-fns/locale';
import { useMetaIntegrationHealth } from '@/hooks/useMetaIntegrationHealth';
import { useTestMetaConnection } from '@/hooks/useTestMetaConnection';
import { useToast } from '@/hooks/use-toast';
import type { MetaIntegration } from './types';

interface Props {
  integration: MetaIntegration;
  onRefreshToken: () => void;
  onReconnect?: () => void;
}

function StatusRow({
  ok,
  label,
  detail,
  warn,
}: {
  ok: boolean;
  label: string;
  detail?: string | null;
  warn?: boolean;
}) {
  const Icon = ok ? CheckCircle2 : warn ? AlertTriangle : XCircle;
  const cls = ok ? 'text-emerald-600' : warn ? 'text-amber-600' : 'text-destructive';
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${cls}`} />
      <div className="min-w-0">
        <div className="leading-tight">{label}</div>
        {detail && <div className="text-xs text-muted-foreground">{detail}</div>}
      </div>
    </div>
  );
}

function relative(dt: string | null | undefined): string {
  if (!dt) return 'Aldri';
  try {
    return formatDistanceToNow(new Date(dt), { addSuffix: true, locale: nb });
  } catch {
    return 'Ukjent';
  }
}

function overallBadge(status: 'healthy' | 'degraded' | 'broken' | undefined) {
  switch (status) {
    case 'healthy':
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
          Tilkoblet og fungerer
        </Badge>
      );
    case 'degraded':
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30">
          Fungerer med advarsler
        </Badge>
      );
    case 'broken':
      return (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
          Brutt — krever oppmerksomhet
        </Badge>
      );
    default:
      return <Badge variant="secondary">Ikke sjekket</Badge>;
  }
}

export function MetaHealthTab({ integration, onRefreshToken, onReconnect }: Props) {
  const { toast } = useToast();
  const { data, isLoading } = useMetaIntegrationHealth(integration.id);
  const runHealth = useTestMetaConnection(integration.id);

  const result = data?.result ?? null;
  const checkedAt = data?.checked_at ?? null;

  const handleRun = async () => {
    try {
      await runHealth.mutateAsync();
      toast({ title: 'Helsesjekk fullført' });
    } catch (e: any) {
      toast({ title: 'Helsesjekk feilet', description: e?.message, variant: 'destructive' });
    }
  };

  const handleScrollToLog = () => {
    const el = document.getElementById('lead-ingestion-log');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="space-y-3 rounded-md border bg-muted/30 p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Ingen helsesjekk er kjørt ennå. Klikk "Test tilkobling" for å verifisere oppsettet.
        </p>
        <Button onClick={handleRun} disabled={runHealth.isPending}>
          {runHealth.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Kjører sjekk…
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Test tilkobling
            </>
          )}
        </Button>
      </div>
    );
  }

  const expiry = result.token_expires_at;
  const expired = expiry ? new Date(expiry).getTime() < Date.now() : false;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          {overallBadge(result.overall_status)}
          <p className="text-xs text-muted-foreground">Sist sjekket: {relative(checkedAt)}</p>
        </div>
        <Button size="sm" variant="outline" onClick={handleRun} disabled={runHealth.isPending}>
          {runHealth.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Test tilkobling
        </Button>
      </div>

      {result.status_message && result.overall_status !== 'healthy' && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          {result.status_message}
        </div>
      )}

      {/* Authentication */}
      <section className="space-y-2 rounded-md border p-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          Autentisering
        </div>
        <div className="space-y-1.5">
          <StatusRow
            ok={result.auth.valid}
            label={result.auth.valid ? 'Token gyldig' : 'Token ugyldig'}
            detail={result.auth.error ?? null}
          />
          <StatusRow
            ok={result.auth.is_page_token}
            label={
              result.auth.is_page_token
                ? `Token-type: Side-token for ${integration.page_name}`
                : 'Token er ikke knyttet til riktig side'
            }
            detail={
              !result.auth.is_page_token && result.auth.owner_name
                ? `Tilhører: ${result.auth.owner_name} (ID ${result.auth.owner_id})`
                : null
            }
          />
          <StatusRow
            ok={!expired && result.auth.valid}
            warn={!!expiry && !expired}
            label={
              !expiry
                ? 'Utløper: Aldri'
                : expired
                ? `Utløpt ${new Date(expiry).toLocaleDateString('nb-NO')}`
                : `Utløper ${new Date(expiry).toLocaleDateString('nb-NO')}`
            }
          />
          <StatusRow
            ok={result.auth.scopes_missing.length === 0}
            label={
              result.auth.scopes_missing.length === 0
                ? 'Tilganger: alle nødvendige er gitt'
                : `Tilganger mangler: ${result.auth.scopes_missing.join(', ')}`
            }
          />
        </div>
        {(!result.auth.valid || !result.auth.is_page_token || result.auth.scopes_missing.length > 0) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {onReconnect && (
              <Button size="sm" variant="outline" onClick={onReconnect}>
                Koble til på nytt
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onRefreshToken}>
              Forny token
            </Button>
          </div>
        )}
      </section>

      {/* Webhook */}
      <section className="space-y-2 rounded-md border p-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Webhook className="h-4 w-4 text-muted-foreground" />
          Webhook
        </div>
        <div className="space-y-1.5">
          <StatusRow
            ok={result.webhook.subscription_active}
            label={
              result.webhook.subscription_active
                ? 'Side abonnert på leadgen'
                : 'Ikke abonnert på leadgen-events'
            }
          />
          <div className="text-sm text-muted-foreground">
            Sist hendelse: {relative(result.webhook.last_event_at)}
          </div>
          <div className="flex flex-wrap gap-2 text-xs pt-1">
            <span className="rounded-md border bg-emerald-500/10 text-emerald-700 border-emerald-500/30 px-2 py-1">
              {result.webhook.events_24h.success} vellykkede
            </span>
            <span
              className={
                'rounded-md border px-2 py-1 ' +
                (result.webhook.events_24h.failed > 0
                  ? 'bg-destructive/10 text-destructive border-destructive/30'
                  : 'bg-muted text-muted-foreground')
              }
            >
              {result.webhook.events_24h.failed} mislykkede
            </span>
            <span className="rounded-md border bg-muted text-muted-foreground px-2 py-1">
              {result.webhook.events_24h.duplicate} duplikat
            </span>
            {result.webhook.events_24h.invalid > 0 && (
              <span className="rounded-md border bg-amber-500/10 text-amber-700 border-amber-500/30 px-2 py-1">
                {result.webhook.events_24h.invalid} ugyldige
              </span>
            )}
            <span className="text-muted-foreground self-center">siste 24t</span>
          </div>
        </div>
      </section>

      {/* Lead retrieval */}
      <section className="space-y-2 rounded-md border p-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Inbox className="h-4 w-4 text-muted-foreground" />
          Lead-henting
        </div>
        <div className="space-y-1.5">
          {(() => {
            const noLeadsYet =
              result.lead_retrieval.last_error === 'Ingen tidligere mottatte leads å teste mot ennå';
            if (noLeadsYet) {
              return (
                <StatusRow
                  ok={false}
                  warn
                  label="Ingen tidligere mottatte leads å teste mot — venter på første lead via webhook"
                />
              );
            }
            return (
              <StatusRow
                ok={result.lead_retrieval.can_fetch_leads}
                label={
                  result.lead_retrieval.can_fetch_leads
                    ? 'Sist mottatte lead kunne hentes på nytt'
                    : 'Klarte ikke hente leads fra Meta'
                }
                detail={result.lead_retrieval.last_error}
              />
            );
          })()}
          {result.lead_retrieval.last_success_at && (
            <div className="text-sm text-muted-foreground">
              Sist vellykket henting: {relative(result.lead_retrieval.last_success_at)}
            </div>
          )}
        </div>
      </section>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={handleScrollToLog}>
          Vis full mottakslogg
        </Button>
      </div>
    </div>
  );
}

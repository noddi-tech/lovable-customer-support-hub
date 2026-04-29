import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { META_EXPECTED_SCOPES } from '../../hooks/useMetaOAuth';

interface Props {
  grantedScopes: string[];
  onNext: () => void;
  onBack: () => void;
}

const SCOPE_LABELS: Record<string, string> = {
  leads_retrieval: 'Hente lead-data',
  pages_show_list: 'Se sidene dine',
  pages_read_engagement: 'Lese engasjement',
  pages_manage_metadata: 'Administrere webhook',
  pages_manage_ads: 'Liste lead-skjemaer',
};

export function Step3Permissions({ grantedScopes, onNext, onBack }: Props) {
  const haveData = grantedScopes.length > 0;
  const missing = META_EXPECTED_SCOPES.filter((s) => !grantedScopes.includes(s));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {haveData
          ? 'Disse tilgangene ble bekreftet av Facebook for kontoen din:'
          : 'Følgende tilganger ble forespurt. Webhook-aktivering i neste steg vil verifisere at de faktisk ble gitt.'}
      </p>

      <ul className="space-y-1.5">
        {META_EXPECTED_SCOPES.map((scope) => {
          const granted = !haveData || grantedScopes.includes(scope);
          const Icon = granted ? CheckCircle2 : XCircle;
          const cls = granted ? 'text-emerald-600' : 'text-destructive';
          return (
            <li key={scope} className="flex items-start gap-2 rounded-md border p-2.5">
              <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${cls}`} />
              <div className="min-w-0 flex-1">
                <div className="text-sm leading-tight">{SCOPE_LABELS[scope] ?? scope}</div>
                <div className="text-xs text-muted-foreground font-mono">{scope}</div>
              </div>
              {granted && haveData && (
                <span className="text-[10px] uppercase tracking-wide text-emerald-700 bg-emerald-500/10 border border-emerald-500/30 rounded px-1.5 py-0.5 self-center">
                  Gitt
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {haveData && missing.length > 0 && (
        <Alert className="border-amber-500/30 bg-amber-500/10">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-xs">
            Noen tilganger mangler ({missing.join(', ')}). Du kan likevel fortsette — webhook vil
            sannsynligvis fungere, men auto-oppdaging av skjemaer i siste steg kan feile.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between gap-2 pt-2">
        <Button variant="outline" onClick={onBack}>
          Tilbake
        </Button>
        <Button onClick={onNext}>Fortsett</Button>
      </div>
    </div>
  );
}

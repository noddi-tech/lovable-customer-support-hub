import { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Loader2, Eye, EyeOff, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMetaIntegration } from './hooks/useMetaIntegration';
import { useTestMetaConnection, useTestMetaToken } from '@/hooks/useTestMetaConnection';
import type { MetaIntegration, MetaTokenTestResult } from './types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integration: MetaIntegration | null;
}

export function MetaTokenRefreshDialog({ open, onOpenChange, integration }: Props) {
  const { toast } = useToast();
  const { updateIntegration } = useMetaIntegration();
  const testToken = useTestMetaToken();
  const runHealth = useTestMetaConnection(integration?.id);

  const [token, setToken] = useState('');
  const [show, setShow] = useState(false);
  const [validation, setValidation] = useState<MetaTokenTestResult | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setToken('');
      setShow(false);
      setValidation(null);
      setHelpOpen(false);
    }
  }, [open]);

  const handleValidate = async () => {
    if (!integration) return;
    if (token.trim().length < 20) {
      toast({ title: 'Tokenet ser for kort ut', variant: 'destructive' });
      return;
    }
    try {
      const r = await testToken.mutateAsync({
        integration_id: integration.id,
        candidate_token: token.trim(),
      });
      setValidation(r);
    } catch (e: any) {
      toast({ title: 'Validering feilet', description: e?.message, variant: 'destructive' });
    }
  };

  const handleSave = async () => {
    if (!integration || !validation?.valid) return;
    try {
      await updateIntegration.mutateAsync({
        id: integration.id,
        page_access_token: token.trim(),
      });
      // Re-run health to refresh cached state and status flags
      try {
        await runHealth.mutateAsync();
      } catch {
        // non-blocking
      }
      toast({ title: 'Token oppdatert' });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Kunne ikke lagre token', description: e?.message, variant: 'destructive' });
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Forny Page Access Token</SheetTitle>
            <SheetDescription>
              Lim inn et nytt Page Access Token fra Meta Business Suite. Vi validerer det mot Meta før lagring.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="new-meta-token">Nytt Page Access Token</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShow((v) => !v)}
                >
                  {show ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                  {show ? 'Skjul' : 'Vis'}
                </Button>
              </div>
              <Textarea
                id="new-meta-token"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  setValidation(null);
                }}
                placeholder="EAAB..."
                className={
                  'font-mono text-xs min-h-[120px] ' + (show ? '' : 'text-security-disc')
                }
                style={!show ? { WebkitTextSecurity: 'disc' as any } : undefined}
              />
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
                onClick={() => setHelpOpen(true)}
              >
                <HelpCircle className="h-3 w-3" />
                Hvor finner jeg dette? →
              </button>
            </div>

            {validation && (
              validation.valid ? (
                <Alert className="border-emerald-500/30 bg-emerald-500/10">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <AlertTitle className="text-emerald-700">Token er gyldig</AlertTitle>
                  <AlertDescription className="text-xs space-y-0.5">
                    <div>Side: {validation.owner_name ?? '—'} (ID {validation.owner_id})</div>
                    <div>Tilganger: alle nødvendige er gitt</div>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-destructive/30 bg-destructive/10">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <AlertTitle className="text-destructive">Token er ikke gyldig</AlertTitle>
                  <AlertDescription className="text-xs">
                    {validation.error_summary ?? 'Ukjent feil'}
                    {validation.scopes_missing.length > 0 && (
                      <div className="mt-1">Mangler: {validation.scopes_missing.join(', ')}</div>
                    )}
                  </AlertDescription>
                </Alert>
              )
            )}
          </div>

          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Avbryt
            </Button>
            <Button
              variant="secondary"
              onClick={handleValidate}
              disabled={testToken.isPending || !token.trim()}
            >
              {testToken.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Valider
            </Button>
            <Button
              onClick={handleSave}
              disabled={!validation?.valid || updateIntegration.isPending}
            >
              {updateIntegration.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Lagre
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Help instructions sheet */}
      <Sheet open={helpOpen} onOpenChange={setHelpOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Slik genererer du en Page Access Token</SheetTitle>
            <SheetDescription>
              Du må være administrator av Meta-siden og ha tilgang til vår Meta-app i Business Manager.
            </SheetDescription>
          </SheetHeader>
          <ol className="list-decimal pl-5 py-4 space-y-3 text-sm">
            <li>
              Gå til{' '}
              <a
                href="https://developers.facebook.com/tools/explorer/"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline"
              >
                Meta Graph API Explorer
              </a>
              .
            </li>
            <li>Velg vår Meta-app fra dropdown øverst til høyre.</li>
            <li>
              Under <span className="font-medium">User or Page</span>, velg{' '}
              <span className="font-medium">Get Page Access Token</span> og velg den aktuelle siden
              (f.eks. Noddi).
            </li>
            <li>
              Sørg for at følgende Permissions er huket av før du genererer:
              <ul className="list-disc pl-5 mt-1 space-y-0.5 text-xs text-muted-foreground">
                <li>leads_retrieval</li>
                <li>pages_show_list</li>
                <li>pages_read_engagement</li>
                <li>pages_manage_metadata</li>
                <li>pages_manage_ads</li>
              </ul>
            </li>
            <li>
              Klikk <span className="font-medium">Generate Access Token</span> og godkjenn i popup-vinduet.
            </li>
            <li>
              Kopier hele tokenet (starter med <code className="bg-muted px-1 rounded">EAA…</code>) og lim
              inn her.
            </li>
            <li>
              <span className="text-muted-foreground">Tips:</span> For tokens som ikke utløper, bytt
              til et long-lived token via System User i Business Manager (full veiledning kommer i
              Connection Wizard).
            </li>
          </ol>
        </SheetContent>
      </Sheet>
    </>
  );
}

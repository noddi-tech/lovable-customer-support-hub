import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle, ExternalLink, Loader2, KeyRound, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import type { MetaIntegration } from '../types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integration: MetaIntegration | null;
  onUseOAuth?: () => void;
}

type Method = 'oauth' | 'manual' | 'system_user';
type ManualStep = 'method' | 'app_secret' | 'user_token' | 'confirm' | 'done';
type SystemStep = 'method' | 'system_intro' | 'system_paste' | 'done';

interface ExchangeResult {
  expires_at: string | null;
  never_expires: boolean;
  scopes: string[];
  missing_scopes: string[];
}

export function MetaTokenRefreshWizard({ open, onOpenChange, integration, onUseOAuth }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [method, setMethod] = useState<Method>('oauth');
  const [step, setStep] = useState<ManualStep | SystemStep>('method');
  const [appSecret, setAppSecret] = useState('');
  const [userToken, setUserToken] = useState('');
  const [systemUserToken, setSystemUserToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ExchangeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setMethod('oauth');
    setStep('method');
    setAppSecret('');
    setUserToken('');
    setSystemUserToken('');
    setResult(null);
    setError(null);
    setSubmitting(false);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleMethodNext = () => {
    if (!integration) return;
    if (method === 'oauth') {
      onOpenChange(false);
      reset();
      onUseOAuth?.();
      return;
    }
    if (method === 'manual') setStep('app_secret');
    else setStep('system_intro');
  };

  const handleExchange = async () => {
    if (!integration) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke(
        'meta-token-exchange-long-lived',
        {
          body: {
            integration_id: integration.id,
            app_secret: appSecret,
            user_token: userToken,
          },
        },
      );
      if (invokeErr || (data as any)?.error) {
        setError((data as any)?.error ?? invokeErr?.message ?? 'Ukjent feil.');
        return;
      }
      setResult(data as ExchangeResult);
      setStep('done');
      qc.invalidateQueries({ queryKey: ['recruitment-meta-integration'] });
      qc.invalidateQueries({ queryKey: ['recruitment-admin-alerts'] });
      // Clear sensitive inputs immediately on success
      setAppSecret('');
      setUserToken('');
      toast({ title: 'Token fornyet' });
    } catch (e: any) {
      setError(e?.message ?? 'Uventet feil.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSystemUserSave = async () => {
    if (!integration) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke(
        'meta-token-paste-system-user',
        { body: { integration_id: integration.id, system_user_token: systemUserToken } },
      );
      if (invokeErr || (data as any)?.error) {
        setError((data as any)?.error ?? invokeErr?.message ?? 'Ukjent feil.');
        return;
      }
      setResult(data as ExchangeResult);
      setStep('done');
      qc.invalidateQueries({ queryKey: ['recruitment-meta-integration'] });
      qc.invalidateQueries({ queryKey: ['recruitment-admin-alerts'] });
      setSystemUserToken('');
      toast({ title: 'System User-token lagret' });
    } catch (e: any) {
      setError(e?.message ?? 'Uventet feil.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Forny Meta-token</SheetTitle>
          <SheetDescription>
            {integration?.page_name
              ? `Sett opp et nytt access token for ${integration.page_name}.`
              : 'Sett opp et nytt access token for Meta-tilkoblingen.'}
          </SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-4">
          {step === 'method' && (
            <div className="space-y-4">
              <RadioGroup value={method} onValueChange={(v) => setMethod(v as Method)}>
                <div className="flex items-start gap-3 rounded-md border p-3">
                  <RadioGroupItem value="oauth" id="m-oauth" className="mt-0.5" />
                  <Label htmlFor="m-oauth" className="cursor-pointer space-y-1">
                    <div className="font-medium">Bruk OAuth-flyt</div>
                    <div className="text-xs text-muted-foreground">
                      Anbefalt for de fleste sider. Krever at appen ikke er blokkert av NPE.
                    </div>
                  </Label>
                </div>
                <div className="flex items-start gap-3 rounded-md border p-3">
                  <RadioGroupItem value="manual" id="m-manual" className="mt-0.5" />
                  <Label htmlFor="m-manual" className="cursor-pointer space-y-1">
                    <div className="font-medium">Manuell oppsett (avansert)</div>
                    <div className="text-xs text-muted-foreground">
                      For NPE-blokkerte sider. Vi utveksler kortvarig token til langvarig.
                    </div>
                  </Label>
                </div>
                <div className="flex items-start gap-3 rounded-md border p-3">
                  <RadioGroupItem value="system_user" id="m-sys" className="mt-0.5" />
                  <Label htmlFor="m-sys" className="cursor-pointer space-y-1">
                    <div className="font-medium">System User-token (anbefalt for produksjon)</div>
                    <div className="text-xs text-muted-foreground">
                      Permanent token administrert i Meta Business Manager.
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {step === 'app_secret' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                App Secret hentes fra Meta Developer Portal → Settings → Basic → App Secret.
                Klikk «Show» og bekreft med Facebook-passord.
              </p>
              <a
                href="https://developers.facebook.com/apps/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" /> Åpne Meta Developer Portal
              </a>
              <div className="space-y-1">
                <Label htmlFor="app-secret">Meta App Secret</Label>
                <Input
                  id="app-secret"
                  type="password"
                  autoComplete="off"
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                  placeholder="••••••••••••••••"
                />
              </div>
            </div>
          )}

          {step === 'user_token' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Brukertokenet hentes fra Graph API Explorer → Access Token-feltet øverst til høyre.
                Hvis tomt: klikk «Generate Access Token».
              </p>
              <a
                href="https://developers.facebook.com/tools/explorer"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" /> Åpne Graph API Explorer
              </a>
              <div className="space-y-1">
                <Label htmlFor="user-token">Brukertoken</Label>
                <Input
                  id="user-token"
                  type="password"
                  autoComplete="off"
                  value={userToken}
                  onChange={(e) => setUserToken(e.target.value)}
                  placeholder="EAA…"
                />
              </div>
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-3">
              <Alert>
                <KeyRound className="h-4 w-4" />
                <AlertTitle>Klar til å fornye</AlertTitle>
                <AlertDescription>
                  Vi vil utveksle dette mot et langvarig brukertoken (~60 dager) og deretter
                  avlede et permanent side-token. Verken App Secret eller brukertoken lagres.
                </AlertDescription>
              </Alert>
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {step === 'system_intro' && (
            <div className="space-y-3 text-sm">
              <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertTitle>System User-tokens</AlertTitle>
                <AlertDescription>
                  System User-tokens er den anbefalte løsningen for produksjon — de utløper aldri
                  og kan administreres sentralt i Business Manager.
                </AlertDescription>
              </Alert>
              <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
                <li>Åpne Meta Business Manager → Business Settings → Users → System Users.</li>
                <li>Opprett en system user med rollen «Admin» eller «Employee».</li>
                <li>Tilordne tilgang til Facebook-siden under «Assigned Assets».</li>
                <li>Klikk «Generate New Token», velg appen, og hak av nødvendige scopes (leads_retrieval, pages_show_list, pages_read_engagement, pages_manage_metadata).</li>
                <li>Kopier tokenet og lim det inn i neste steg.</li>
              </ol>
              <a
                href="https://business.facebook.com/settings/system-users"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" /> Åpne Business Manager
              </a>
            </div>
          )}

          {step === 'system_paste' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="sys-token">System User-token</Label>
                <Input
                  id="sys-token"
                  type="password"
                  autoComplete="off"
                  value={systemUserToken}
                  onChange={(e) => setSystemUserToken(e.target.value)}
                  placeholder="EAA…"
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {step === 'done' && result && (
            <Alert className="border-emerald-500/30 bg-emerald-500/10">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertTitle>Token aktivt</AlertTitle>
              <AlertDescription>
                {result.never_expires
                  ? 'Side-token aktivt og utløper aldri.'
                  : `Side-token aktivt og utløper ${
                      result.expires_at
                        ? format(new Date(result.expires_at), 'd. MMMM yyyy', { locale: nb })
                        : 'snart'
                    }.`}
                {result.missing_scopes.length > 0 && (
                  <div className="mt-2 text-destructive">
                    Mangler tilganger: {result.missing_scopes.join(', ')}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <SheetFooter className="gap-2">
          {step === 'method' && (
            <>
              <Button variant="outline" onClick={() => handleClose(false)}>Avbryt</Button>
              <Button onClick={handleMethodNext} disabled={!integration}>Neste</Button>
            </>
          )}
          {step === 'app_secret' && (
            <>
              <Button variant="outline" onClick={() => setStep('method')}>Tilbake</Button>
              <Button
                onClick={() => setStep('user_token')}
                disabled={appSecret.trim().length < 30}
              >
                Neste
              </Button>
            </>
          )}
          {step === 'user_token' && (
            <>
              <Button variant="outline" onClick={() => setStep('app_secret')}>Tilbake</Button>
              <Button
                onClick={() => setStep('confirm')}
                disabled={!userToken.trim().startsWith('EAA') || userToken.trim().length < 50}
              >
                Neste
              </Button>
            </>
          )}
          {step === 'confirm' && (
            <>
              <Button variant="outline" onClick={() => setStep('user_token')} disabled={submitting}>
                Tilbake
              </Button>
              <Button onClick={handleExchange} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Forny token
              </Button>
            </>
          )}
          {step === 'system_intro' && (
            <>
              <Button variant="outline" onClick={() => setStep('method')}>Tilbake</Button>
              <Button onClick={() => setStep('system_paste')}>Jeg har tokenet</Button>
            </>
          )}
          {step === 'system_paste' && (
            <>
              <Button variant="outline" onClick={() => setStep('system_intro')} disabled={submitting}>
                Tilbake
              </Button>
              <Button
                onClick={handleSystemUserSave}
                disabled={
                  submitting ||
                  !systemUserToken.trim().startsWith('EAA') ||
                  systemUserToken.trim().length < 50
                }
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Lagre token
              </Button>
            </>
          )}
          {step === 'done' && (
            <Button onClick={() => handleClose(false)}>Ferdig</Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

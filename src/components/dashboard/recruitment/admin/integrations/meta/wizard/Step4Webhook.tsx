import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, Webhook } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  useFinalizeMetaOAuth,
  useSubscribeWebhookManual,
} from '../../hooks/useMetaOAuth';
import type { MetaIntegration } from '../../types';

interface Props {
  flow: 'oauth' | 'manual';
  // OAuth flow
  stateId?: string | null;
  pageId?: string | null;
  // Manual flow
  manualIntegrationId?: string | null;
  onDone: (integration: MetaIntegration) => void;
  onBack: () => void;
}

export function Step4Webhook({
  flow,
  stateId,
  pageId,
  manualIntegrationId,
  onDone,
  onBack,
}: Props) {
  const { toast } = useToast();
  const finalize = useFinalizeMetaOAuth();
  const subscribe = useSubscribeWebhookManual();

  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [doneIntegration, setDoneIntegration] = useState<MetaIntegration | null>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run() {
    try {
      if (flow === 'oauth') {
        if (!stateId || !pageId) throw new Error('Mangler state eller side');
        const r = await finalize.mutateAsync({ state_id: stateId, page_id: pageId });
        setDoneIntegration(r.integration);
        setStatus('success');
      } else {
        if (!manualIntegrationId) throw new Error('Mangler integrasjon');
        await subscribe.mutateAsync({ integration_id: manualIntegrationId });
        // Refetch happens via onSuccess invalidation; we don't have the row directly,
        // but we'll forward null and let parent re-read from useMetaIntegration.
        setStatus('success');
      }
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Webhook-aktivering feilet');
      setStatus('error');
      toast({
        title: 'Aktivering feilet',
        description: e?.message,
        variant: 'destructive',
      });
    }
  }

  const handleRetry = () => {
    setStatus('pending');
    setErrorMsg(null);
    ranRef.current = false;
    void run();
  };

  const handleContinue = () => {
    if (doneIntegration) onDone(doneIntegration);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Webhook className="h-4 w-4 text-muted-foreground" />
        Aktiver webhook for leadgen-events
      </div>

      {status === 'pending' && (
        <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <div className="text-sm">
            {flow === 'oauth'
              ? 'Henter side-token, abonnerer på leadgen-events…'
              : 'Abonnerer siden på leadgen-events…'}
          </div>
        </div>
      )}

      {status === 'success' && (
        <Alert className="border-emerald-500/30 bg-emerald-500/10">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertTitle className="text-emerald-700">Webhook aktivert</AlertTitle>
          <AlertDescription className="text-xs">
            Siden mottar nå leadgen-events. Nye søkere fra Facebook og Instagram havner automatisk
            i søkerlisten.
          </AlertDescription>
        </Alert>
      )}

      {status === 'error' && (
        <Alert className="border-destructive/30 bg-destructive/10">
          <XCircle className="h-4 w-4 text-destructive" />
          <AlertTitle className="text-destructive">Aktivering feilet</AlertTitle>
          <AlertDescription className="text-xs">
            {errorMsg ?? 'Ukjent feil'}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between gap-2 pt-2">
        <Button variant="outline" onClick={onBack} disabled={status === 'pending'}>
          Tilbake
        </Button>
        <div className="flex gap-2">
          {status === 'error' && (
            <Button variant="secondary" onClick={handleRetry}>
              Prøv igjen
            </Button>
          )}
          {status === 'success' && (
            <Button onClick={handleContinue} disabled={flow === 'oauth' && !doneIntegration}>
              Fortsett
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { Heading } from '@/components/ui/heading';
import { LeadSourcesSection } from './sections/LeadSourcesSection';
import { OutboundSection } from './sections/OutboundSection';
import { AuthenticationSection } from './sections/AuthenticationSection';
import { LeadIngestionLogPanel } from './log/LeadIngestionLogPanel';
import { MetaTokenRefreshWizard } from './meta/MetaTokenRefreshWizard';
import { MetaTokenHelpCard } from './meta/MetaTokenHelpCard';
import { AdminAlertsBanner } from './AdminAlertsBanner';
import { MetaConnectionWizard, type WizardMode, type WizardStep } from './meta/wizard/MetaConnectionWizard';
import { useMetaIntegration } from './hooks/useMetaIntegration';
import { useToast } from '@/hooks/use-toast';

export function IntegrationsTab() {
  const { integration } = useMetaIntegration();
  const { toast } = useToast();

  const [tokenRefreshOpen, setTokenRefreshOpen] = useState(false);

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState<WizardMode>('create');
  const [wizardInitialStep, setWizardInitialStep] = useState<WizardStep>(1);
  const [wizardInitialStateId, setWizardInitialStateId] = useState<string | null>(null);
  const [wizardExistingId, setWizardExistingId] = useState<string | null>(null);

  // Handle ?meta_oauth_state=... and ?meta_oauth_error=... when arriving back from FB.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const stateParam = url.searchParams.get('meta_oauth_state');
    const errorParam = url.searchParams.get('meta_oauth_error');
    if (!stateParam && !errorParam) return;

    if (errorParam) {
      const messages: Record<string, string> = {
        user_denied: 'Du avbrøt tilkoblingen på Facebook. Du kan prøve igjen når du er klar.',
        state_expired: 'Tilkoblingsforsøket utløp. Start på nytt.',
        invalid_state: 'Tilkoblingen kunne ikke verifiseres. Start på nytt.',
        token_exchange_failed: 'Vi fikk ikke tak i Facebook-token. Prøv igjen.',
      };
      toast({
        title: 'Tilkobling avbrutt',
        description: messages[errorParam] ?? 'Tilkoblingen ble ikke fullført. Prøv igjen.',
        variant: 'destructive',
      });
      setWizardMode('create');
      setWizardInitialStep(1);
      setWizardInitialStateId(null);
      setWizardExistingId(null);
      setWizardOpen(true);
    } else if (stateParam) {
      setWizardMode('create');
      setWizardInitialStep(2);
      setWizardInitialStateId(stateParam);
      setWizardExistingId(null);
      setWizardOpen(true);
    }

    url.searchParams.delete('meta_oauth_state');
    url.searchParams.delete('meta_oauth_error');
    window.history.replaceState({}, '', url.toString());
  }, [toast]);

  const openWizardCreate = () => {
    setWizardMode('create');
    setWizardInitialStep(1);
    setWizardInitialStateId(null);
    setWizardExistingId(null);
    setWizardOpen(true);
  };

  const openWizardReconnect = () => {
    if (!integration) return;
    setWizardMode('reconnect');
    setWizardInitialStep(1);
    setWizardInitialStateId(null);
    setWizardExistingId(integration.id);
    setWizardOpen(true);
  };

  // Banner-driven refresh: scopes to a specific integration_id when provided.
  // Currently we have a single-integration model per org, so the integration prop
  // resolves to the alert's integration. If/when multi-integration lands, swap
  // this to look up by integration_id.
  const openTokenRefresh = (_integrationId: string | null) => {
    setTokenRefreshOpen(true);
  };

  return (
    <>
      <div className="space-y-8">
        <header>
          <Heading level={2} className="text-lg font-semibold">
            Integrasjoner
          </Heading>
          <p className="text-sm text-muted-foreground">
            Koble til eksterne tjenester for å motta søkere, sende varsler og administrere autentisering.
          </p>
        </header>

        <AdminAlertsBanner onRefreshToken={openTokenRefresh} />

        <LeadSourcesSection
          metaIntegration={integration}
          onMetaConnect={openWizardCreate}
          onMetaEdit={openWizardReconnect}
          onMetaReconnect={openWizardReconnect}
          onMetaRefreshToken={() => setTokenRefreshOpen(true)}
        />

        <MetaTokenHelpCard />

        <Separator />

        <OutboundSection />

        <Separator />

        <AuthenticationSection />

        <Separator />

        <div id="lead-ingestion-log">
          <LeadIngestionLogPanel />
        </div>
      </div>

      <MetaConnectionWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        mode={wizardMode}
        initialStep={wizardInitialStep}
        initialStateId={wizardInitialStateId}
        existingIntegrationId={wizardExistingId}
      />
      <MetaTokenRefreshWizard
        open={tokenRefreshOpen}
        onOpenChange={setTokenRefreshOpen}
        integration={integration}
        onUseOAuth={openWizardReconnect}
      />
    </>
  );
}

import { useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { Heading } from '@/components/ui/heading';
import { LeadSourcesSection } from './sections/LeadSourcesSection';
import { OutboundSection } from './sections/OutboundSection';
import { AuthenticationSection } from './sections/AuthenticationSection';
import { LeadIngestionLogPanel } from './log/LeadIngestionLogPanel';
import { MetaConnectionDialog } from './meta/MetaConnectionDialog';
import { MetaTokenRefreshDialog } from './MetaTokenRefreshDialog';
import { useMetaIntegration } from './hooks/useMetaIntegration';

export function IntegrationsTab() {
  const { integration } = useMetaIntegration();

  const [connectionOpen, setConnectionOpen] = useState(false);
  const [connectionMode, setConnectionMode] = useState<'edit' | 'view'>('edit');
  const [tokenRefreshOpen, setTokenRefreshOpen] = useState(false);

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

        <LeadSourcesSection
          metaIntegration={integration}
          onMetaConnect={() => {
            setConnectionMode('edit');
            setConnectionOpen(true);
          }}
          onMetaEdit={() => {
            setConnectionMode('edit');
            setConnectionOpen(true);
          }}
          onMetaRefreshToken={() => setTokenRefreshOpen(true)}
        />

        <Separator />

        <OutboundSection />

        <Separator />

        <AuthenticationSection />

        <Separator />

        <div id="lead-ingestion-log">
          <LeadIngestionLogPanel />
        </div>
      </div>

      {/* Dialogs mounted at parent */}
      <MetaConnectionDialog
        open={connectionOpen}
        onOpenChange={setConnectionOpen}
        integration={integration}
        initialMode={connectionMode}
        onRequestTokenRefresh={() => {
          setConnectionOpen(false);
          setTokenRefreshOpen(true);
        }}
      />
      <MetaTokenRefreshDialog
        open={tokenRefreshOpen}
        onOpenChange={setTokenRefreshOpen}
        integration={integration}
      />
    </>
  );
}

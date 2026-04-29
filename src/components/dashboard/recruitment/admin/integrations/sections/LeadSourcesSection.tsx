import { CSVImportCard } from '../cards/CSVImportCard';
import { MetaLeadAdsCard } from '../cards/MetaLeadAdsCard';
import { ComingSoonCard } from '../cards/ComingSoonCard';
import { Globe } from 'lucide-react';
import type { MetaIntegration } from '../types';

interface Props {
  metaIntegration: MetaIntegration | null;
  onMetaConnect: () => void;
  onMetaEdit: () => void;
  onMetaReconnect: () => void;
  onMetaRefreshToken: () => void;
}

export function LeadSourcesSection({
  metaIntegration,
  onMetaConnect,
  onMetaEdit,
  onMetaReconnect,
  onMetaRefreshToken,
}: Props) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Lead-kilder
        </h3>
        <p className="text-xs text-muted-foreground">
          Hvor søkere kommer inn i systemet.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <CSVImportCard />
        <MetaLeadAdsCard
          integration={metaIntegration}
          onConnect={onMetaConnect}
          onEdit={onMetaEdit}
          onReconnect={onMetaReconnect}
          onRefreshToken={onMetaRefreshToken}
        />
        <ComingSoonCard
          title="Finn.no"
          description="Importer søknader fra Finn.no-stillingsannonser."
          icon={Globe}
        />
      </div>
    </section>
  );
}

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Facebook, Plus, Settings, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import type { MetaIntegration } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { nb } from 'date-fns/locale';

interface Props {
  integration: MetaIntegration | null;
  onConnect: () => void;
  onManageForms: () => void;
  onViewDetails: () => void;
}

function statusBadge(status: MetaIntegration['status']) {
  switch (status) {
    case 'configured':
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
          Klar for kobling
        </Badge>
      );
    case 'connected':
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
          Tilkoblet
        </Badge>
      );
    case 'disconnected':
      return <Badge variant="secondary">Frakoblet</Badge>;
    case 'error':
      return (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
          Feil
        </Badge>
      );
  }
}

export function MetaLeadAdsCard({ integration, onConnect, onManageForms, onViewDetails }: Props) {
  const { currentOrganizationId } = useOrganizationStore();

  const { data: leadCount } = useQuery({
    queryKey: ['meta-lead-count', currentOrganizationId],
    enabled: !!currentOrganizationId && !!integration,
    staleTime: 30_000,
    refetchOnMount: 'always',
    queryFn: async () => {
      const { count, error } = await supabase
        .from('recruitment_lead_ingestion_log' as any)
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', currentOrganizationId)
        .eq('source', 'meta_lead_ad');
      if (error) throw error;
      return count ?? 0;
    },
  });

  if (!integration) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-md border bg-blue-500/5 p-2">
                <Facebook className="h-4 w-4 text-blue-600" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-base">Meta Lead Ads</CardTitle>
                <CardDescription>
                  Motta søkere automatisk fra Facebook og Instagram Lead Ad-kampanjer.
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary">Ikke koblet</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Button size="sm" onClick={onConnect}>
            <Plus />
            Koble til Meta-side
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-md border bg-blue-500/5 p-2">
              <Facebook className="h-4 w-4 text-blue-600" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-base">Meta Lead Ads</CardTitle>
              <CardDescription>
                {integration.page_name}
                <span className="ml-2 text-xs text-muted-foreground">
                  ID: {integration.page_id}
                </span>
              </CardDescription>
            </div>
          </div>
          {statusBadge(integration.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md border bg-muted/30 px-3 py-2">
            <div className="text-xs text-muted-foreground">Søknader mottatt</div>
            <div className="font-semibold">{leadCount ?? 0}</div>
          </div>
          <div className="rounded-md border bg-muted/30 px-3 py-2">
            <div className="text-xs text-muted-foreground">Sist mottatt</div>
            <div className="font-semibold">
              {integration.last_event_at
                ? formatDistanceToNow(new Date(integration.last_event_at), { addSuffix: true, locale: nb })
                : 'Aldri'}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={onManageForms}>
            <Settings />
            Administrer skjemaer
          </Button>
          <Button size="sm" variant="outline" onClick={onViewDetails}>
            <Eye />
            Vis tilkoblingsdetaljer
          </Button>
        </div>
        {integration.status_message ? (
          <p className="text-xs text-muted-foreground">{integration.status_message}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

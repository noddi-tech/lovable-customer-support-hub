import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import { formatDistanceToNow } from 'date-fns';
import { nb } from 'date-fns/locale';

export function CSVImportCard() {
  const { currentOrganizationId } = useOrganizationStore();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['recruitment-import-stats', currentOrganizationId],
    enabled: !!currentOrganizationId,
    staleTime: 30_000,
    refetchOnMount: 'always',
    queryFn: async () => {
      if (!currentOrganizationId) return { count: 0, lastImportedAt: null as string | null };

      const { count, error: cErr } = await supabase
        .from('applicants')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', currentOrganizationId)
        .in('source', ['csv_import', 'meta_lead_ad']);
      if (cErr) throw cErr;

      const { data: latest } = await supabase
        .from('applicants')
        .select('created_at')
        .eq('organization_id', currentOrganizationId)
        .in('source', ['csv_import', 'meta_lead_ad'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return { count: count ?? 0, lastImportedAt: latest?.created_at ?? null };
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-md border bg-primary/5 p-2">
              <Upload className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-base">CSV-import</CardTitle>
              <CardDescription>
                Last opp søkere fra Meta Lead Ads-eksport, Finn.no eller andre kilder med kolonnemapping.
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md border bg-muted/30 px-3 py-2">
            <div className="text-xs text-muted-foreground">Totalt importert</div>
            <div className="font-semibold">{data?.count ?? 0}</div>
          </div>
          <div className="rounded-md border bg-muted/30 px-3 py-2">
            <div className="text-xs text-muted-foreground">Sist importert</div>
            <div className="font-semibold">
              {data?.lastImportedAt
                ? formatDistanceToNow(new Date(data.lastImportedAt), { addSuffix: true, locale: nb })
                : 'Aldri'}
            </div>
          </div>
        </div>
        <Button size="sm" onClick={() => navigate('/admin/recruitment/import')}>
          Åpne import-veiviser
          <ArrowRight />
        </Button>
      </CardContent>
    </Card>
  );
}

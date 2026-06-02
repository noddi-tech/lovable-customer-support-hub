import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, ShieldCheck, ShieldOff, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import {
  useOrgGdprRequests,
  type GdprRequestRow,
} from '@/hooks/recruitment/useGdprRequests';

function fmt(ts: string | null | undefined) {
  if (!ts) return '—';
  try {
    return format(new Date(ts), 'dd.MM.yyyy HH:mm');
  } catch {
    return ts;
  }
}

function StatusBadge({ status }: { status: GdprRequestRow['status'] }) {
  if (status === 'fulfilled') {
    return (
      <Badge variant="outline" className="text-green-700 border-green-700/40 bg-green-500/10">
        Fullført
      </Badge>
    );
  }
  if (status === 'failed') return <Badge variant="destructive">Feilet</Badge>;
  return (
    <Badge variant="outline">
      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
      Behandler
    </Badge>
  );
}

const GdprDashboardPage: React.FC = () => {
  const { organizationId } = useAuth();
  const { data, isLoading } = useOrgGdprRequests(organizationId ?? undefined);
  const rows = data ?? [];
  const exports = rows.filter((r) => r.request_type === 'export');
  const erasures = rows.filter((r) => r.request_type === 'erasure');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">GDPR-forespørsler</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Oversikt over alle eksport- og sletteforespørsler i organisasjonen.
          Forespørsler bevares som revisjonshistorikk og kan ikke slettes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Totalt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{rows.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Eksporter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{exports.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <ShieldOff className="h-3.5 w-3.5" /> Slettinger
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{erasures.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historikk</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Laster…</div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              Ingen forespørsler registrert ennå.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Type</th>
                    <th className="text-left px-4 py-2 font-medium">Kandidat</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                    <th className="text-left px-4 py-2 font-medium">Forespurt</th>
                    <th className="text-left px-4 py-2 font-medium">Fullført</th>
                    <th className="text-right px-4 py-2 font-medium">Handling</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((row) => {
                    const summary = (row.fulfillment_summary ?? {}) as any;
                    const downloadUrl: string | null =
                      row.request_type === 'export' &&
                      row.status === 'fulfilled' &&
                      !summary.expired
                        ? summary.download_url ?? null
                        : null;
                    return (
                      <tr key={row.id} className="hover:bg-muted/30">
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center gap-1.5">
                            {row.request_type === 'export' ? (
                              <ShieldCheck className="h-4 w-4 text-primary" />
                            ) : (
                              <ShieldOff className="h-4 w-4 text-destructive" />
                            )}
                            {row.request_type === 'export' ? 'Eksport' : 'Sletting'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-foreground">
                            {row.applicant_name_snapshot}
                          </div>
                          {row.applicant_email_snapshot && (
                            <div className="text-xs text-muted-foreground">
                              {row.applicant_email_snapshot}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-col gap-1">
                            <StatusBadge status={row.status} />
                            {row.status === 'failed' && row.error_message && (
                              <span className="text-xs text-destructive inline-flex items-start gap-1">
                                <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                                {row.error_message}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                          {fmt(row.requested_at)}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                          {fmt(row.fulfilled_at)}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="inline-flex items-center gap-2">
                            {downloadUrl && (
                              <Button asChild size="sm" variant="outline">
                                <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-3.5 w-3.5" />
                                  ZIP
                                </a>
                              </Button>
                            )}
                            {row.applicant_id && (
                              <Button asChild size="sm" variant="ghost">
                                <Link to={`/operations/recruitment/applicants/${row.applicant_id}`}>
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  Profil
                                </Link>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GdprDashboardPage;

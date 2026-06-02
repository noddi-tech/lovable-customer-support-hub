import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, ShieldCheck, ShieldOff, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import {
  useGdprRequests,
  type GdprRequestRow,
} from '@/hooks/recruitment/useGdprRequests';

interface Props {
  applicantId: string;
}

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
  if (status === 'failed') {
    return <Badge variant="destructive">Feilet</Badge>;
  }
  return (
    <Badge variant="outline" className="text-foreground/80">
      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
      Behandler
    </Badge>
  );
}

function TypeIcon({ type }: { type: GdprRequestRow['request_type'] }) {
  return type === 'export' ? (
    <ShieldCheck className="h-4 w-4 text-primary" />
  ) : (
    <ShieldOff className="h-4 w-4 text-destructive" />
  );
}

const GdprRequestsHistorySection: React.FC<Props> = ({ applicantId }) => {
  const { data, isLoading } = useGdprRequests(applicantId);
  const rows = data ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">GDPR-historikk</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">Laster…</div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">
            Ingen GDPR-forespørsler registrert.
          </div>
        ) : (
          <ul className="divide-y">
            {rows.map((row) => {
              const summary = (row.fulfillment_summary ?? {}) as any;
              const downloadUrl: string | null =
                row.request_type === 'export' && row.status === 'fulfilled' && !summary.expired
                  ? summary.download_url ?? null
                  : null;
              const expiresAt: string | null = summary.expires_at ?? null;
              const isExpired = !!summary.expired;
              return (
                <li key={row.id} className="px-4 py-3 text-sm space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <TypeIcon type={row.request_type} />
                    <span className="font-medium">
                      {row.request_type === 'export' ? 'Eksport' : 'Sletting'}
                    </span>
                    <StatusBadge status={row.status} />
                    <span className="text-xs text-muted-foreground ml-auto">
                      {fmt(row.requested_at)}
                    </span>
                  </div>
                  {row.reason_provided && (
                    <div className="text-xs text-muted-foreground italic">
                      «{row.reason_provided}»
                    </div>
                  )}
                  {row.status === 'failed' && row.error_message && (
                    <div className="flex items-start gap-1.5 text-xs text-destructive">
                      <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>{row.error_message}</span>
                    </div>
                  )}
                  {row.request_type === 'export' && row.status === 'fulfilled' && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {downloadUrl ? (
                        <Button asChild size="sm" variant="outline">
                          <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                            <Download className="h-3.5 w-3.5" />
                            Last ned ZIP
                          </a>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {isExpired
                            ? 'Lenken er utløpt og filen er slettet'
                            : 'Lenke ikke tilgjengelig'}
                        </span>
                      )}
                      {expiresAt && !isExpired && (
                        <span className="text-xs text-muted-foreground">
                          Utløper {fmt(expiresAt)}
                        </span>
                      )}
                    </div>
                  )}
                  {row.request_type === 'erasure' && row.status === 'fulfilled' && (
                    <div className="text-xs text-muted-foreground">
                      Anonymisert {fmt(row.fulfilled_at)}
                      {summary.files_deleted != null && (
                        <> · {summary.files_deleted} fil(er) slettet</>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default GdprRequestsHistorySection;

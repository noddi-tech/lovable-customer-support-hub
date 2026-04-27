import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useLeadIngestionLog } from '../hooks/useLeadIngestionLog';
import { formatDistanceToNow, format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { LeadIngestionStatus } from '../types';

const PAGE = 50;

const SOURCE_LABEL: Record<string, string> = {
  meta_lead_ad: 'Meta Lead Ads',
  csv_import: 'CSV-import',
  finn: 'Finn.no',
  manual: 'Manuell',
  website: 'Nettsted',
  referral: 'Henvist',
  other: 'Annet',
};

const STATUS_CONFIG: Record<LeadIngestionStatus, { label: string; className: string }> = {
  success: { label: 'Vellykket', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
  duplicate: { label: 'Duplikat', className: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  failed: { label: 'Feilet', className: 'bg-destructive/10 text-destructive border-destructive/30' },
  invalid: { label: 'Ugyldig', className: 'bg-muted text-muted-foreground' },
};

export function LeadIngestionLogPanel() {
  const [offset, setOffset] = useState(0);
  const { data, isLoading } = useLeadIngestionLog({ limit: PAGE, offset });
  const rows = data?.rows ?? [];
  const total = data?.totalCount ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Lead-mottakslogg</CardTitle>
        <CardDescription>
          Observabilitet for innkommende søknader fra alle kilder. Brukes til feilsøking når Meta Lead Ads er aktivt.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Laster…</p>
        ) : rows.length === 0 ? (
          <div className="rounded-md border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
            Ingen leads mottatt ennå. Når Meta Lead Ads er tilkoblet, vil leads vises her.
          </div>
        ) : (
          <TooltipProvider delayDuration={200}>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kilde</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Søker</TableHead>
                    <TableHead>Tidspunkt</TableHead>
                    <TableHead>Feilmelding</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const status = STATUS_CONFIG[r.status];
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <Badge variant="outline">{SOURCE_LABEL[r.source] ?? r.source}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={status.className}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {r.applicant_id ? (
                            <a
                              href={`/recruitment/applicants/${r.applicant_id}`}
                              className="text-primary hover:underline"
                            >
                              {r.applicant_name ?? '—'}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-sm">
                                {formatDistanceToNow(new Date(r.created_at), {
                                  addSuffix: true,
                                  locale: nb,
                                })}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {format(new Date(r.created_at), 'PPpp', { locale: nb })}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {r.error_message ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="block truncate text-xs text-destructive">
                                  {r.error_message}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-md whitespace-pre-wrap">
                                {r.error_message}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TooltipProvider>
        )}

        {total > PAGE && (
          <div className="flex items-center justify-between pt-3 text-xs text-muted-foreground">
            <span>
              Viser {offset + 1}–{Math.min(offset + PAGE, total)} av {total}
            </span>
            <div className="flex gap-2">
              <Button
                size="xs"
                variant="outline"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE))}
              >
                Forrige
              </Button>
              <Button
                size="xs"
                variant="outline"
                disabled={offset + PAGE >= total}
                onClick={() => setOffset(offset + PAGE)}
              >
                Neste
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

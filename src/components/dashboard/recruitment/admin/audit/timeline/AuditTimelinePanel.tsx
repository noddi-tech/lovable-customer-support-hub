import { useState } from 'react';
import { useAuditEvents } from '../hooks/useAuditEvents';
import { Card } from '@/components/ui/card';
import { AuditTimelineFilters, type TimelineFilters } from './AuditTimelineFilters';
import { AuditEventRow } from './AuditEventRow';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { UnifiedAuditEvent } from '../types';

interface Props {
  organizationId: string | null;
  onRowClick: (event: UnifiedAuditEvent) => void;
}

const PAGE_SIZE = 50;

export function AuditTimelinePanel({ organizationId, onRowClick }: Props) {
  const [filters, setFilters] = useState<TimelineFilters>({});
  const [page, setPage] = useState(0);

  const { data, isLoading } = useAuditEvents({
    organizationId,
    from: filters.from,
    to: filters.to,
    eventTypes: filters.eventTypes,
    sources: filters.sources,
    limit: 1000,
  });

  const events = data ?? [];
  const pageEvents = events.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(events.length / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <AuditTimelineFilters value={filters} onChange={(f) => { setFilters(f); setPage(0); }} />

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Laster…</div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Ingen revisjonshendelser i valgt tidsrom.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tidspunkt</TableHead>
                <TableHead>Kilde</TableHead>
                <TableHead>Hendelse</TableHead>
                <TableHead>Beskrivelse</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageEvents.map((ev) => (
                <AuditEventRow key={`${ev.source}-${ev.id}`} event={ev} onClick={() => onRowClick(ev)} />
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Side {page + 1} av {totalPages} · {events.length} hendelser
          </span>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 rounded border disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Forrige
            </button>
            <button
              className="px-3 py-1 rounded border disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Neste
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

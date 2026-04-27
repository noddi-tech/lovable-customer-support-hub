import { useAuditEvents } from '../hooks/useAuditEvents';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AuditEventRow } from '../timeline/AuditEventRow';
import type { UnifiedAuditEvent } from '../types';

interface Props {
  organizationId: string | null;
  applicantId: string;
  onRowClick: (event: UnifiedAuditEvent) => void;
}

export function ApplicantAuditTimeline({ organizationId, applicantId, onRowClick }: Props) {
  const { data, isLoading } = useAuditEvents({ organizationId, applicantId, limit: 1000 });
  const events = data ?? [];

  return (
    <Card className="p-0 overflow-hidden">
      {isLoading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Laster…</div>
      ) : events.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          Ingen revisjonshendelser for denne søkeren.
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
            {events.map((ev) => (
              <AuditEventRow key={`${ev.source}-${ev.id}`} event={ev} onClick={() => onRowClick(ev)} />
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

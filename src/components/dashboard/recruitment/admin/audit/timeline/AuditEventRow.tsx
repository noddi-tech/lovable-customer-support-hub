import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { UnifiedAuditEvent } from '../types';
import { eventLabel, summarizeChange, SOURCE_LABELS, SOURCE_BADGE_VARIANT } from '../utils';

interface Props {
  event: UnifiedAuditEvent;
  onClick: () => void;
}

export function AuditEventRow({ event, onClick }: Props) {
  return (
    <TableRow className="cursor-pointer" onClick={onClick}>
      <TableCell className="text-xs whitespace-nowrap">
        {new Date(event.occurred_at).toLocaleString('nb-NO', { timeZone: 'Europe/Oslo' })}
      </TableCell>
      <TableCell>
        <Badge variant={SOURCE_BADGE_VARIANT[event.source]}>{SOURCE_LABELS[event.source]}</Badge>
      </TableCell>
      <TableCell className="text-sm font-medium">{eventLabel(event.event_type)}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{summarizeChange(event)}</TableCell>
      <TableCell>
        <Button variant="ghost" size="xs" onClick={(e) => { e.stopPropagation(); onClick(); }}>
          Detaljer
        </Button>
      </TableCell>
    </TableRow>
  );
}

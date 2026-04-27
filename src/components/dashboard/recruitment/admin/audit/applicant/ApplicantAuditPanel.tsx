import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ApplicantAuditPicker } from './ApplicantAuditPicker';
import { ApplicantAuditTimeline } from './ApplicantAuditTimeline';
import { Download } from 'lucide-react';
import type { UnifiedAuditEvent } from '../types';

interface Props {
  organizationId: string | null;
  onRowClick: (event: UnifiedAuditEvent) => void;
  onExport: (applicantId: string) => void;
}

export function ApplicantAuditPanel({ organizationId, onRowClick, onExport }: Props) {
  const [selected, setSelected] = useState<{ id: string; label: string } | null>(null);

  return (
    <div className="space-y-4">
      <Card className="p-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[280px]">
          <ApplicantAuditPicker
            organizationId={organizationId}
            value={selected}
            onChange={setSelected}
          />
        </div>
        {selected && (
          <Button onClick={() => onExport(selected.id)}>
            <Download className="h-4 w-4" />
            Eksporter alt (DSAR)
          </Button>
        )}
      </Card>

      {selected ? (
        <ApplicantAuditTimeline
          organizationId={organizationId}
          applicantId={selected.id}
          onRowClick={onRowClick}
        />
      ) : (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Velg en søker for å se full revisjon.
        </Card>
      )}
    </div>
  );
}

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import type { UnifiedAuditEvent } from '../types';
import { eventLabel, SOURCE_LABELS, SOURCE_BADGE_VARIANT } from '../utils';

interface Props {
  event: UnifiedAuditEvent | null;
  onOpenChange: (open: boolean) => void;
}

export function AuditEventDetailDrawer({ event, onOpenChange }: Props) {
  return (
    <Sheet open={!!event} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        {event && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {eventLabel(event.event_type)}
                <Badge variant={SOURCE_BADGE_VARIANT[event.source]}>{SOURCE_LABELS[event.source]}</Badge>
              </SheetTitle>
              <SheetDescription>
                {new Date(event.occurred_at).toLocaleString('nb-NO', { timeZone: 'Europe/Oslo' })}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 py-4 text-sm">
              <DetailRow label="Hendelse-ID" value={event.id} mono />
              {event.subject_table && <DetailRow label="Tabell" value={event.subject_table} />}
              {event.subject_id && <DetailRow label="Subjekt-ID" value={event.subject_id} mono />}
              {event.applicant_id && <DetailRow label="Søker-ID" value={event.applicant_id} mono />}
              {event.actor_profile_id && <DetailRow label="Aktør-profil" value={event.actor_profile_id} mono />}

              {event.old_values && (
                <div>
                  <div className="text-xs uppercase text-muted-foreground mb-1">Før</div>
                  <pre className="text-xs bg-muted/50 p-3 rounded overflow-auto max-h-64">
                    {JSON.stringify(event.old_values, null, 2)}
                  </pre>
                </div>
              )}
              {event.new_values && (
                <div>
                  <div className="text-xs uppercase text-muted-foreground mb-1">Etter</div>
                  <pre className="text-xs bg-muted/50 p-3 rounded overflow-auto max-h-64">
                    {JSON.stringify(event.new_values, null, 2)}
                  </pre>
                </div>
              )}
              {event.context && (
                <div>
                  <div className="text-xs uppercase text-muted-foreground mb-1">Kontekst</div>
                  <pre className="text-xs bg-muted/50 p-3 rounded overflow-auto max-h-64">
                    {JSON.stringify(event.context, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-3">
      <span className="text-xs uppercase text-muted-foreground w-32 shrink-0 pt-0.5">{label}</span>
      <span className={mono ? 'font-mono text-xs break-all' : 'text-sm'}>{value}</span>
    </div>
  );
}

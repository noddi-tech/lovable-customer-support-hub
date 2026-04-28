import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import type { UnifiedAuditEvent } from '../types';
import { eventLabel, SOURCE_LABELS, SOURCE_BADGE_VARIANT } from '../utils';
import { DiffRenderer } from '../utils/diffRenderer';
import { fieldLabel } from '../utils/fieldLabels';
import { formatValue } from '../utils/valueFormatters';

interface Props {
  event: UnifiedAuditEvent | null;
  onOpenChange: (open: boolean) => void;
}

const UUID_FIELDS = ['assigned_to', 'uploaded_by', 'performed_by', 'author_id'] as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function collectUuids(event: UnifiedAuditEvent | null): string[] {
  if (!event) return [];
  const ids = new Set<string>();
  if (event.actor_profile_id && UUID_RE.test(event.actor_profile_id)) {
    ids.add(event.actor_profile_id);
  }
  for (const bucket of [event.old_values, event.new_values]) {
    if (!bucket || typeof bucket !== 'object') continue;
    for (const f of UUID_FIELDS) {
      const v = (bucket as Record<string, unknown>)[f];
      if (typeof v === 'string' && UUID_RE.test(v)) ids.add(v);
    }
  }
  return Array.from(ids);
}

export function AuditEventDetailDrawer({ event, onOpenChange }: Props) {
  const uuids = useMemo(() => collectUuids(event), [event]);

  const { data: userMap } = useQuery({
    queryKey: ['audit-actor-names', uuids.slice().sort().join(',')],
    enabled: uuids.length > 0,
    queryFn: async () => {
      const map = new Map<string, string>();
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', uuids);
      if (error) return map;
      for (const row of (data ?? []) as Array<{ id: string; full_name: string | null }>) {
        if (row.full_name) map.set(row.id, row.full_name);
      }
      return map;
    },
    staleTime: 60_000,
  });

  const ctx = useMemo(() => ({ userMap: userMap ?? new Map<string, string>() }), [userMap]);
  const isExport = event?.event_category === 'export';

  return (
    <Sheet open={!!event} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        {event && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {eventLabel(event.event_type)}
                <Badge variant={SOURCE_BADGE_VARIANT[event.source]}>
                  {SOURCE_LABELS[event.source]}
                </Badge>
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
              {event.actor_profile_id && (
                <ActorRow
                  uuid={event.actor_profile_id}
                  name={ctx.userMap.get(event.actor_profile_id)}
                />
              )}

              {isExport ? (
                <ExportContextView context={event.context} />
              ) : (
                <>
                  {(event.old_values || event.new_values) && (
                    <div>
                      <div className="text-xs uppercase text-muted-foreground mb-2">Endringer</div>
                      <DiffRenderer
                        oldValues={event.old_values}
                        newValues={event.new_values}
                        ctx={ctx}
                      />
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
                </>
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

function ActorRow({ uuid, name }: { uuid: string; name?: string }) {
  if (!name) {
    return <DetailRow label="Aktør" value={uuid} mono />;
  }
  return (
    <div className="flex gap-3">
      <span className="text-xs uppercase text-muted-foreground w-32 shrink-0 pt-0.5">Aktør</span>
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-sm cursor-help">{name}</span>
          </TooltipTrigger>
          <TooltipContent>
            <span className="font-mono text-xs">{uuid}</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

function ExportContextView({ context }: { context: Record<string, unknown> | null | undefined }) {
  if (!context || typeof context !== 'object') {
    return <p className="text-sm text-muted-foreground">Ingen kontekst.</p>;
  }
  const c = context as Record<string, unknown>;
  const format = typeof c.format === 'string' ? c.format.toUpperCase() : null;
  const count = typeof c.count === 'number' ? c.count : null;
  const fromDate = typeof c.from === 'string' ? c.from : typeof c.from_date === 'string' ? c.from_date : null;
  const toDate = typeof c.to === 'string' ? c.to : typeof c.to_date === 'string' ? c.to_date : null;
  const applicantId = typeof c.applicant_id === 'string' ? c.applicant_id : null;

  const knownKeys = new Set(['format', 'count', 'from', 'to', 'from_date', 'to_date', 'applicant_id']);
  const extra = Object.entries(c).filter(([k]) => !knownKeys.has(k));

  return (
    <div className="space-y-2">
      <div className="text-xs uppercase text-muted-foreground mb-1">Eksportdetaljer</div>
      {format && <DetailRow label="Format" value={format} />}
      {count !== null && <DetailRow label="Antall hendelser" value={String(count)} />}
      {(fromDate || toDate) && (
        <DetailRow
          label="Datointervall"
          value={`${fromDate ? formatValue('created_at', fromDate) : '—'} → ${toDate ? formatValue('created_at', toDate) : '—'}`}
        />
      )}
      {applicantId && <DetailRow label={fieldLabel('applicant_id')} value={applicantId} mono />}
      {extra.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">Vis rådata</summary>
          <pre className="text-xs bg-muted/50 p-3 rounded overflow-auto max-h-64 mt-2">
            {JSON.stringify(Object.fromEntries(extra), null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

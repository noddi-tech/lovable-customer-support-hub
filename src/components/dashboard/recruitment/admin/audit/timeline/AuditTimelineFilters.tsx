import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { EventSource } from '../types';
import { X } from 'lucide-react';

export interface TimelineFilters {
  from?: string;
  to?: string;
  eventTypes?: string[];
  sources?: EventSource[];
}

interface Props {
  value: TimelineFilters;
  onChange: (next: TimelineFilters) => void;
}

const SOURCE_OPTIONS: { value: EventSource; label: string }[] = [
  { value: 'audit', label: 'Revisjon' },
  { value: 'automation', label: 'Automatisering' },
  { value: 'ingestion', label: 'Innhenting' },
];

export function AuditTimelineFilters({ value, onChange }: Props) {
  const hasFilters = !!(value.from || value.to || value.sources?.length);

  return (
    <div className="flex flex-wrap items-end gap-3 p-3 rounded-md border bg-muted/30">
      <div className="space-y-1">
        <Label className="text-xs">Fra dato</Label>
        <Input
          type="date"
          className="h-8 w-40"
          value={value.from?.slice(0, 10) ?? ''}
          onChange={(e) => onChange({ ...value, from: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Til dato</Label>
        <Input
          type="date"
          className="h-8 w-40"
          value={value.to?.slice(0, 10) ?? ''}
          onChange={(e) => {
            if (!e.target.value) return onChange({ ...value, to: undefined });
            const d = new Date(e.target.value);
            d.setHours(23, 59, 59, 999);
            onChange({ ...value, to: d.toISOString() });
          }}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Kilde</Label>
        <Select
          value={value.sources?.[0] ?? 'all'}
          onValueChange={(v) =>
            onChange({ ...value, sources: v === 'all' ? undefined : [v as EventSource] })
          }
        >
          <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle kilder</SelectItem>
            {SOURCE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => onChange({})}>
          <X className="h-3 w-3" />
          Nullstill
        </Button>
      )}
    </div>
  );
}

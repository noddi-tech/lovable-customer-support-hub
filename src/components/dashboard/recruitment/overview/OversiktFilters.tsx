import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw } from 'lucide-react';
import type { TimeWindow, AssignmentScope } from '@/hooks/recruitment/useOversiktMetrics';

interface Props {
  positionId: string | null;
  positions: Array<{ id: string; title: string }>;
  timeWindow: TimeWindow;
  scope: AssignmentScope;
  realtimeConnected: boolean;
  isFetching: boolean;
  onPositionChange: (id: string | null) => void;
  onTimeWindowChange: (w: TimeWindow) => void;
  onScopeChange: (s: AssignmentScope) => void;
  onRefresh: () => void;
}

export default function OversiktFilters({
  positionId,
  positions,
  timeWindow,
  scope,
  realtimeConnected,
  isFetching,
  onPositionChange,
  onTimeWindowChange,
  onScopeChange,
  onRefresh,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={positionId ?? 'all'} onValueChange={(v) => onPositionChange(v === 'all' ? null : v)}>
        <SelectTrigger className="w-[200px] h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle stillinger</SelectItem>
          {positions.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={timeWindow} onValueChange={(v) => onTimeWindowChange(v as TimeWindow)}>
        <SelectTrigger className="w-[160px] h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7d">Siste 7 dager</SelectItem>
          <SelectItem value="30d">Siste 30 dager</SelectItem>
          <SelectItem value="90d">Siste 90 dager</SelectItem>
          <SelectItem value="all">All tid</SelectItem>
        </SelectContent>
      </Select>

      <Tabs value={scope} onValueChange={(v) => onScopeChange(v as AssignmentScope)}>
        <TabsList className="h-8">
          <TabsTrigger value="mine" className="text-xs h-6">Mine</TabsTrigger>
          <TabsTrigger value="unassigned" className="text-xs h-6">Ikke tildelt</TabsTrigger>
          <TabsTrigger value="all" className="text-xs h-6">Alle</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex items-center gap-2 ml-auto">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            realtimeConnected ? 'bg-emerald-500' : 'bg-muted-foreground/40'
          }`}
          title={realtimeConnected ? 'Sanntid tilkoblet' : 'Sanntid frakoblet'}
          aria-label={realtimeConnected ? 'Sanntid tilkoblet' : 'Sanntid frakoblet'}
        />
        <Button variant="ghost" size="icon" onClick={onRefresh} aria-label="Oppdater" disabled={isFetching}>
          <RefreshCw className={isFetching ? 'animate-spin' : ''} />
        </Button>
      </div>
    </div>
  );
}

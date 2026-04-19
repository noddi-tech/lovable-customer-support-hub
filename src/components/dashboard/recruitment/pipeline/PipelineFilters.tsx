import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useJobPositions } from '../positions/usePositions';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import type { PipelineFilters as Filters } from './usePipeline';

interface Props {
  value: Filters;
  onChange: (next: Filters) => void;
  totalCount: number;
}

const PipelineFilters: React.FC<Props> = ({ value, onChange, totalCount }) => {
  const { data: positions } = useJobPositions();
  const { data: team } = useTeamMembers();
  const openPositions = (positions ?? []).filter((p) => p.status === 'open');

  return (
    <div className="flex items-center gap-3">
      <Select
        value={value.positionId}
        onValueChange={(v) => onChange({ ...value, positionId: v })}
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Stilling" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle stillinger</SelectItem>
          {openPositions.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.assignedTo}
        onValueChange={(v) => onChange({ ...value, assignedTo: v })}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Tilordnet" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle</SelectItem>
          {(team ?? []).map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.full_name || m.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="ml-auto text-sm text-muted-foreground">
        {totalCount} søkere totalt
      </div>
    </div>
  );
};

export default PipelineFilters;

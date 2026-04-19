import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebounce } from '@/hooks/useDebounce';
import { useJobPositions } from '../positions/usePositions';
import type { ApplicantsFilters } from './useApplicants';

interface Props {
  value: ApplicantsFilters;
  onChange: (filters: ApplicantsFilters) => void;
}

const SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'meta_lead_ad', label: 'Meta Lead Ad' },
  { value: 'finn', label: 'Finn.no' },
  { value: 'website', label: 'Nettside' },
  { value: 'referral', label: 'Referanse' },
  { value: 'manual', label: 'Manuell' },
  { value: 'csv_import', label: 'CSV Import' },
];

const STAGE_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'not_reviewed', label: 'Ikke vurdert' },
  { value: 'qualified', label: 'Kvalifisert & i dialog' },
  { value: 'disqualified', label: 'Diskvalifisert' },
  { value: 'hired', label: 'Ansatt' },
];

const ApplicantsFilterBar: React.FC<Props> = ({ value, onChange }) => {
  const [searchInput, setSearchInput] = useState(value.search);
  const debounced = useDebounce(searchInput, 300);
  const { data: positions } = useJobPositions();

  useEffect(() => {
    if (debounced !== value.search) {
      onChange({ ...value, search: debounced });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className="flex gap-3 items-center flex-wrap">
      <div className="relative flex-1 min-w-[260px] max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Søk på navn, e-post eller telefon..."
          className="pl-9"
        />
      </div>

      <Select value={value.source} onValueChange={(v) => onChange({ ...value, source: v })}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Kilde" />
        </SelectTrigger>
        <SelectContent>
          {SOURCE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.positionId}
        onValueChange={(v) => onChange({ ...value, positionId: v })}
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Stilling" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle</SelectItem>
          {(positions ?? []).map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={value.stageId} onValueChange={(v) => onChange({ ...value, stageId: v })}>
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {STAGE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ApplicantsFilterBar;

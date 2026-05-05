import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { nb } from 'date-fns/locale';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import ApplicantSourceBadge from './ApplicantSourceBadge';
import ApplicantStageBadge from './ApplicantStageBadge';
import { TagChip } from './TagPicker';
import { useApplicants, useApplicantPipeline, type ApplicantsFilters, type ApplicantRow } from './useApplicants';
import { useApplicantTagsByIds } from '@/hooks/recruitment/useApplicantTags';

interface Props {
  filters: ApplicantsFilters;
  selectionEnabled?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (id: string, checked: boolean) => void;
  onToggleSelectAll?: (ids: string[], checked: boolean) => void;
}

type SortCol = 'name' | 'email' | 'position' | 'stage' | 'score' | 'applied' | null;
type SortDir = 'asc' | 'desc';

const HEADERS: { key: Exclude<SortCol, null> | 'tags' | 'source' | 'phone'; label: string; sortable: boolean }[] = [
  { key: 'name', label: 'Navn', sortable: true },
  { key: 'email', label: 'E-post', sortable: true },
  { key: 'phone', label: 'Telefon', sortable: false },
  { key: 'source', label: 'Kilde', sortable: false },
  { key: 'position', label: 'Stilling', sortable: true },
  { key: 'stage', label: 'Status', sortable: true },
  { key: 'tags', label: 'Etiketter', sortable: false },
  { key: 'score', label: 'Poeng', sortable: true },
  { key: 'applied', label: 'Søkt', sortable: true },
];

function scoreClass(score: number) {
  if (score < 30) return 'text-red-600';
  if (score <= 60) return 'text-amber-600';
  return 'text-green-600';
}

function getValue(a: ApplicantRow, col: Exclude<SortCol, null>): string | number {
  const first = a.applications?.[0];
  switch (col) {
    case 'name': return `${a.first_name} ${a.last_name}`.toLowerCase();
    case 'email': return (a.email ?? '').toLowerCase();
    case 'position': return (first?.job_positions?.title ?? '').toLowerCase();
    case 'stage': return first?.current_stage_id ?? '';
    case 'score': return first?.score ?? -1;
    case 'applied': return first?.applied_at ?? '';
  }
}

const ApplicantsTable: React.FC<Props> = ({
  filters, selectionEnabled = true, selectedIds = [], onToggleSelect, onToggleSelectAll,
}) => {
  const { data, isLoading } = useApplicants(filters);
  const { data: pipeline } = useApplicantPipeline();
  const [sortCol, setSortCol] = useState<SortCol>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const ids = useMemo(() => (data ?? []).map((a) => a.id), [data]);
  const { data: tagsByApplicant } = useApplicantTagsByIds(ids);

  const sorted = useMemo(() => {
    if (!data) return data;
    if (!sortCol) return data;
    const arr = [...data];
    arr.sort((a, b) => {
      const va = getValue(a, sortCol);
      const vb = getValue(b, sortCol);
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [data, sortCol, sortDir]);

  const toggleSort = (col: Exclude<SortCol, null>) => {
    if (sortCol !== col) { setSortCol(col); setSortDir('asc'); return; }
    if (sortDir === 'asc') { setSortDir('desc'); return; }
    setSortCol(null);
  };

  if (isLoading) {
    return (
      <div className="border rounded-md">
        <Table>
          <TableHeader><TableRow>
            {selectionEnabled && <TableHead className="w-10" />}
            {HEADERS.map((h) => (<TableHead key={h.key}>{h.label}</TableHead>))}
          </TableRow></TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {selectionEnabled && <TableCell />}
                {HEADERS.map((__, j) => (<TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (!sorted || sorted.length === 0) {
    return (
      <div className="border rounded-md p-12 flex flex-col items-center justify-center text-center">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Briefcase className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground max-w-md">
          {filters.pendingReviewOnly
            ? 'Ingen søkere venter på godkjenning.'
            : 'Ingen søkere ennå. Legg til søkere manuelt eller importer fra CSV.'}
        </p>
      </div>
    );
  }

  const allIds = sorted.map((a) => a.id);
  const allChecked = allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));
  const someChecked = !allChecked && allIds.some((id) => selectedIds.includes(id));

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            {selectionEnabled && (
              <TableHead className="w-10">
                <Checkbox
                  checked={allChecked ? true : someChecked ? 'indeterminate' : false}
                  onCheckedChange={(v) => onToggleSelectAll?.(allIds, !!v)}
                  aria-label="Velg alle"
                />
              </TableHead>
            )}
            {HEADERS.map((h) => (
              <TableHead key={h.key}>
                {h.sortable ? (
                  <button
                    type="button"
                    onClick={() => toggleSort(h.key as Exclude<SortCol, null>)}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    {h.label}
                    {sortCol === h.key ? (
                      sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40" />
                    )}
                  </button>
                ) : h.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((a) => {
            const apps = a.applications ?? [];
            const first = apps[0];
            const score = first?.score;
            const checked = selectedIds.includes(a.id);
            const tagLinks = tagsByApplicant?.[a.id] ?? [];
            const visibleTags = tagLinks.slice(0, 3);
            const overflow = tagLinks.length - visibleTags.length;
            return (
              <TableRow key={a.id} data-state={checked ? 'selected' : undefined}>
                {selectionEnabled && (
                  <TableCell>
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => onToggleSelect?.(a.id, !!v)}
                      aria-label="Velg søker"
                    />
                  </TableCell>
                )}
                <TableCell>
                  <Link to={`/operations/recruitment/applicants/${a.id}`}
                    className="font-semibold text-foreground hover:underline">
                    {a.first_name} {a.last_name}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{a.email}</TableCell>
                <TableCell className="text-foreground">
                  {a.phone || <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell><ApplicantSourceBadge source={a.source} /></TableCell>
                <TableCell>
                  {first?.job_positions?.title ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="text-foreground">{first.job_positions.title}</span>
                      {apps.length > 1 && (<Badge variant="secondary">+{apps.length - 1}</Badge>)}
                    </span>
                  ) : (<span className="text-muted-foreground">—</span>)}
                </TableCell>
                <TableCell>
                  <ApplicantStageBadge stageId={first?.current_stage_id} pipeline={pipeline} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 flex-wrap">
                    {visibleTags.map((l) =>
                      l.recruitment_tags ? (
                        <TagChip key={l.id} tag={l.recruitment_tags} size="sm" />
                      ) : null
                    )}
                    {overflow > 0 && (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full border bg-muted text-muted-foreground">
                              +{overflow}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {tagLinks.slice(3).map((l) =>
                                l.recruitment_tags ? (
                                  <TagChip key={l.id} tag={l.recruitment_tags} size="sm" />
                                ) : null
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {tagLinks.length === 0 && (<span className="text-muted-foreground text-xs">—</span>)}
                  </div>
                </TableCell>
                <TableCell>
                  {score != null ? (
                    <span className={cn('font-medium', scoreClass(score))}>{score}</span>
                  ) : (<span className="text-muted-foreground">—</span>)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {first?.applied_at
                    ? formatDistanceToNow(new Date(first.applied_at), { addSuffix: true, locale: nb })
                    : '—'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default ApplicantsTable;

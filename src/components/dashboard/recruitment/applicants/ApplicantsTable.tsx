import React from 'react';
import { Link } from 'react-router-dom';
import { Briefcase } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { nb } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import ApplicantSourceBadge from './ApplicantSourceBadge';
import ApplicantStageBadge from './ApplicantStageBadge';
import { useApplicants, useApplicantPipeline, type ApplicantsFilters } from './useApplicants';

interface Props {
  filters: ApplicantsFilters;
  selectionEnabled?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (id: string, checked: boolean) => void;
  onToggleSelectAll?: (ids: string[], checked: boolean) => void;
}

const HEADERS = ['Navn', 'E-post', 'Telefon', 'Kilde', 'Stilling', 'Status', 'Poeng', 'Søkt'];

function scoreClass(score: number) {
  if (score < 30) return 'text-red-600';
  if (score <= 60) return 'text-amber-600';
  return 'text-green-600';
}

const ApplicantsTable: React.FC<Props> = ({
  filters,
  selectionEnabled = false,
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
}) => {
  const { data, isLoading } = useApplicants(filters);
  const { data: pipeline } = useApplicantPipeline();

  if (isLoading) {
    return (
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              {selectionEnabled && <TableHead className="w-10" />}
              {HEADERS.map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {selectionEnabled && <TableCell />}
                {HEADERS.map((__, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (!data || data.length === 0) {
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

  const allIds = data.map((a) => a.id);
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
                  checked={allChecked || (someChecked && 'indeterminate')}
                  onCheckedChange={(v) => onToggleSelectAll?.(allIds, !!v)}
                  aria-label="Velg alle"
                />
              </TableHead>
            )}
            {HEADERS.map((h) => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((a) => {
            const apps = a.applications ?? [];
            const first = apps[0];
            const score = first?.score;
            const checked = selectedIds.includes(a.id);
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
                  <Link
                    to={`/operations/recruitment/applicants/${a.id}`}
                    className="font-semibold text-foreground hover:underline"
                  >
                    {a.first_name} {a.last_name}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{a.email}</TableCell>
                <TableCell className="text-foreground">
                  {a.phone || <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  <ApplicantSourceBadge source={a.source} />
                </TableCell>
                <TableCell>
                  {first?.job_positions?.title ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="text-foreground">{first.job_positions.title}</span>
                      {apps.length > 1 && (
                        <Badge variant="secondary">+{apps.length - 1}</Badge>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <ApplicantStageBadge stageId={first?.current_stage_id} pipeline={pipeline} />
                </TableCell>
                <TableCell>
                  {score != null ? (
                    <span className={cn('font-medium', scoreClass(score))}>{score}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {first?.applied_at
                    ? formatDistanceToNow(new Date(first.applied_at), {
                        addSuffix: true,
                        locale: nb,
                      })
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

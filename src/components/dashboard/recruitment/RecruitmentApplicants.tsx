import React, { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ApplicantsFilterBar from './applicants/ApplicantsFilterBar';
import ApplicantsTable from './applicants/ApplicantsTable';
import CreateApplicantDialog from './applicants/CreateApplicantDialog';
import { QuarantineToolbar } from './applicants/QuarantineToolbar';
import type { ApplicantsFilters } from './applicants/useApplicants';

const RecruitmentApplicants: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<ApplicantsFilters>({
    search: '',
    source: 'all',
    positionId: 'all',
    stageId: 'all',
    pendingReviewOnly: false,
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const setFiltersAndReset = (next: ApplicantsFilters) => {
    if (!next.pendingReviewOnly) setSelectedIds([]);
    setFilters(next);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Søkere</h2>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Legg til søker
        </Button>
      </div>

      <ApplicantsFilterBar value={filters} onChange={setFiltersAndReset} />
      <ApplicantsTable
        filters={filters}
        selectionEnabled={!!filters.pendingReviewOnly}
        selectedIds={selectedIds}
        onToggleSelect={(id, checked) =>
          setSelectedIds((prev) =>
            checked ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id)
          )
        }
        onToggleSelectAll={(ids, checked) =>
          setSelectedIds(checked ? ids : [])
        }
      />
      {filters.pendingReviewOnly && selectedIds.length > 0 && (
        <QuarantineToolbar
          selectedIds={selectedIds}
          onClear={() => setSelectedIds([])}
        />
      )}
      <CreateApplicantDialog open={open} onOpenChange={setOpen} />
    </div>
  );
};

export default RecruitmentApplicants;

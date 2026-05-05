import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ApplicantsFilterBar from './applicants/ApplicantsFilterBar';
import ApplicantsTable from './applicants/ApplicantsTable';
import CreateApplicantDialog from './applicants/CreateApplicantDialog';
import { QuarantineToolbar } from './applicants/QuarantineToolbar';
import BulkActionToolbar from './applicants/BulkActionToolbar';
import type { ApplicantsFilters } from './applicants/useApplicants';

const RecruitmentApplicants: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<ApplicantsFilters>({
    search: '',
    source: 'all',
    positionId: 'all',
    stageId: 'all',
    pendingReviewOnly: false,
    tagIds: [],
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const setFiltersAndReset = (next: ApplicantsFilters) => {
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

      {selectedIds.length > 0 && (
        <BulkActionToolbar selectedIds={selectedIds} onClear={() => setSelectedIds([])} />
      )}

      <ApplicantsTable
        filters={filters}
        selectionEnabled
        selectedIds={selectedIds}
        onToggleSelect={(id, checked) =>
          setSelectedIds((prev) =>
            checked ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id)
          )
        }
        onToggleSelectAll={(ids, checked) =>
          setSelectedIds((prev) => {
            if (checked) return Array.from(new Set([...prev, ...ids]));
            const set = new Set(ids);
            return prev.filter((id) => !set.has(id));
          })
        }
      />
      {filters.pendingReviewOnly && selectedIds.length > 0 && (
        <QuarantineToolbar selectedIds={selectedIds} onClear={() => setSelectedIds([])} />
      )}
      <CreateApplicantDialog open={open} onOpenChange={setOpen} />
    </div>
  );
};

export default RecruitmentApplicants;

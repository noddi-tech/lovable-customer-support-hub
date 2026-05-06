import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ApplicantsFilterBar from './applicants/ApplicantsFilterBar';
import ApplicantsTable from './applicants/ApplicantsTable';
import CreateApplicantDialog from './applicants/CreateApplicantDialog';
import { QuarantineToolbar } from './applicants/QuarantineToolbar';
import BulkActionToolbar from './applicants/BulkActionToolbar';
import {
  type ActiveBulkDialog,
  ConfirmBulkDialog,
  MoveStageDialog,
  AssignBulkDialog,
  RejectBulkDialog,
  SendEmailBulkDialog,
  TagsBulkDialog,
  DeleteBulkDialog,
} from './applicants/BulkActionDialogs';
import { useBulkApplicantAction, type BulkAction, type BulkActionPayload } from '@/hooks/recruitment/useBulkApplicantAction';
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
  const [activeDialog, setActiveDialog] = useState<ActiveBulkDialog>(null);
  const bulkMut = useBulkApplicantAction();

  const N = selectedIds.length;
  const closeDialog = () => setActiveDialog(null);

  /**
   * Confirm path — worst-case timing.
   * Order matters to avoid Radix `body { pointer-events: none }` getting stuck:
   *   1. Run mutation.
   *   2. Close the dialog (Radix begins focus/body-lock release).
   *   3. On the next tick, clear selection (this unmounts the toolbar).
   * If we cleared selection in the same render as closing the dialog, the toolbar
   * subtree could unmount mid-Radix-cleanup and leave the body lock attached.
   */
  const runBulk = async (action: BulkAction, payload?: BulkActionPayload) => {
    try {
      await bulkMut.mutateAsync({ applicant_ids: selectedIds, action, payload });
      setActiveDialog(null);
      setTimeout(() => setSelectedIds([]), 0);
    } catch {
      // Toast handled in mutation onError. Keep dialog open so user can retry/cancel.
    }
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

      <ApplicantsFilterBar value={filters} onChange={setFilters} />

      {selectedIds.length > 0 && (
        <BulkActionToolbar
          selectedIds={selectedIds}
          onClear={() => setSelectedIds([])}
          onOpenAction={(a) => setActiveDialog(a)}
        />
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

      {/* Bulk dialogs are always mounted at the page level, regardless of selection
          state, to avoid Radix freeze when toolbar unmounts during dialog close. */}
      <MoveStageDialog
        open={activeDialog === 'move_stage'}
        N={N}
        loading={bulkMut.isPending}
        onClose={closeDialog}
        onConfirm={(stage_id) => runBulk('move_stage', { stage_id })}
      />
      <AssignBulkDialog
        open={activeDialog === 'assign'}
        N={N}
        loading={bulkMut.isPending}
        onClose={closeDialog}
        onConfirm={(assignee_id) => runBulk('assign', { assignee_id })}
      />
      <RejectBulkDialog
        open={activeDialog === 'reject'}
        N={N}
        loading={bulkMut.isPending}
        onClose={closeDialog}
        onConfirm={(reason) => runBulk('reject', reason ? { reason } : {})}
      />
      <ConfirmBulkDialog
        open={activeDialog === 'hire'}
        title={`Ansette ${N} søkere?`}
        description="Søkerne flyttes til Ansatt-stadiet."
        actionLabel="Ansett"
        loading={bulkMut.isPending}
        onClose={closeDialog}
        onConfirm={() => runBulk('hire')}
      />
      <SendEmailBulkDialog
        open={activeDialog === 'send_email'}
        N={N}
        loading={bulkMut.isPending}
        onClose={closeDialog}
        onConfirm={(template_id, inbox_id) => runBulk('send_email', { template_id, inbox_id })}
      />
      <TagsBulkDialog
        open={activeDialog === 'add_tags' || activeDialog === 'remove_tags'}
        mode={activeDialog === 'remove_tags' ? 'remove' : 'add'}
        N={N}
        loading={bulkMut.isPending}
        onClose={closeDialog}
        onConfirm={(tag_ids) =>
          runBulk(activeDialog === 'remove_tags' ? 'remove_tags' : 'add_tags', { tag_ids })
        }
      />
      <ConfirmBulkDialog
        open={activeDialog === 'export_csv'}
        title={`Eksportere ${N} søkere?`}
        description="Du får en CSV-fil med søker-info som lastes ned automatisk."
        actionLabel="Eksporter"
        loading={bulkMut.isPending}
        onClose={closeDialog}
        onConfirm={() => runBulk('export_csv')}
      />
      <DeleteBulkDialog
        open={activeDialog === 'delete'}
        N={N}
        loading={bulkMut.isPending}
        onClose={closeDialog}
        onConfirm={() => runBulk('delete')}
      />
    </div>
  );
};

export default RecruitmentApplicants;

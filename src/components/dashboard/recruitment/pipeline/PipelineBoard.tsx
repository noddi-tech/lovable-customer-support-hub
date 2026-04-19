import React, { useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useQueryClient } from '@tanstack/react-query';
import PipelineColumn from './PipelineColumn';
import PipelineCard from './PipelineCard';
import MoveStageDialog from '../applicants/MoveStageDialog';
import type { PipelineApplication, PipelineFilters } from './usePipeline';
import type { PipelineStage } from '../applicants/useApplicants';
import { useOrganizationStore } from '@/stores/organizationStore';

interface Props {
  applications: PipelineApplication[];
  stages: PipelineStage[];
  filters: PipelineFilters;
}

interface PendingMove {
  app: PipelineApplication;
  fromStageId: string;
  toStageId: string;
  toStageName: string;
}

const PipelineBoard: React.FC<Props> = ({ applications, stages, filters }) => {
  const queryClient = useQueryClient();
  const { currentOrganizationId } = useOrganizationStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const snapshotRef = useRef<PipelineApplication[] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const queryKey = useMemo(
    () => ['pipeline-applications', currentOrganizationId, filters.positionId, filters.assignedTo],
    [currentOrganizationId, filters.positionId, filters.assignedTo]
  );

  const grouped = useMemo(() => {
    const map: Record<string, PipelineApplication[]> = {};
    for (const s of stages) map[s.id] = [];
    for (const app of applications) {
      if (!map[app.current_stage_id]) map[app.current_stage_id] = [];
      map[app.current_stage_id].push(app);
    }
    return map;
  }, [applications, stages]);

  const sortedStages = useMemo(
    () => [...stages].sort((a, b) => a.order - b.order),
    [stages]
  );

  const activeApp = activeId ? applications.find((a) => a.id === activeId) ?? null : null;

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const app = applications.find((a) => a.id === String(active.id));
    if (!app) return;

    const overId = String(over.id);
    // over.id is either a stage id (column) or an app id (card hover)
    let toStageId = overId;
    if (!stages.find((s) => s.id === overId)) {
      const overApp = applications.find((a) => a.id === overId);
      if (overApp) toStageId = overApp.current_stage_id;
      else return;
    }

    if (toStageId === app.current_stage_id) return;

    const toStage = stages.find((s) => s.id === toStageId);
    if (!toStage) return;

    // Optimistic update
    snapshotRef.current = applications;
    queryClient.setQueryData<PipelineApplication[]>(queryKey, (old) => {
      if (!old) return old;
      return old.map((a) =>
        a.id === app.id ? { ...a, current_stage_id: toStageId } : a
      );
    });

    setPendingMove({
      app,
      fromStageId: app.current_stage_id,
      toStageId,
      toStageName: toStage.name,
    });
  };

  const handleDialogChange = (open: boolean) => {
    if (open) return;
    // Dialog closed — invalidate to sync with server. If user dismissed
    // without confirming, the server state hasn't changed so invalidation
    // will revert the optimistic update.
    queryClient.invalidateQueries({ queryKey: ['pipeline-applications'] });
    setPendingMove(null);
    snapshotRef.current = null;
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto flex-1 min-h-0 pb-2">
          {sortedStages.map((stage) => (
            <PipelineColumn
              key={stage.id}
              stage={stage}
              applications={grouped[stage.id] ?? []}
            />
          ))}
        </div>
        <DragOverlay>
          {activeApp ? <PipelineCard app={activeApp} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      {pendingMove && (
        <MoveStageDialog
          open={!!pendingMove}
          onOpenChange={handleDialogChange}
          applicantName={`${pendingMove.app.applicants?.first_name ?? ''} ${pendingMove.app.applicants?.last_name ?? ''}`.trim()}
          applicantId={pendingMove.app.applicant_id}
          applicationId={pendingMove.app.id}
          fromStageId={pendingMove.fromStageId}
          toStageId={pendingMove.toStageId}
          toStageName={pendingMove.toStageName}
        />
      )}
    </>
  );
};

export default PipelineBoard;

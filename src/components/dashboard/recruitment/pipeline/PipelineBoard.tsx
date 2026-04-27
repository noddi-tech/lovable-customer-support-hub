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
import StageMoveConfirmDialog from './StageMoveConfirmDialog';
import { useStageMoveAutomation } from './useStageMoveAutomation';
import type { PipelineApplication, PipelineFilters } from './usePipeline';
import type { PipelineStage } from '../applicants/useApplicants';
import { useOrganizationStore } from '@/stores/organizationStore';

interface Props {
  applications: PipelineApplication[];
  stages: PipelineStage[];
  filters: PipelineFilters;
}

const PipelineBoard: React.FC<Props> = ({ applications, stages, filters }) => {
  const queryClient = useQueryClient();
  const { currentOrganizationId } = useOrganizationStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const snapshotRef = useRef<PipelineApplication[] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const queryKey = useMemo(
    () => ['pipeline-applications', currentOrganizationId, filters.positionId, filters.assignedTo],
    [currentOrganizationId, filters.positionId, filters.assignedTo]
  );

  const revertOptimistic = () => {
    queryClient.invalidateQueries({ queryKey: ['pipeline-applications'] });
    snapshotRef.current = null;
  };

  const automation = useStageMoveAutomation({
    onComplete: () => {
      snapshotRef.current = null;
    },
    onCancel: revertOptimistic,
  });

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
    let toStageId = overId;
    if (!stages.find((s) => s.id === overId)) {
      const overApp = applications.find((a) => a.id === overId);
      if (overApp) toStageId = overApp.current_stage_id;
      else return;
    }

    if (toStageId === app.current_stage_id) return;

    const toStage = stages.find((s) => s.id === toStageId);
    if (!toStage) return;

    // Optimistic update — card visually moves immediately.
    snapshotRef.current = applications;
    queryClient.setQueryData<PipelineApplication[]>(queryKey, (old) => {
      if (!old) return old;
      return old.map((a) =>
        a.id === app.id ? { ...a, current_stage_id: toStageId } : a
      );
    });

    const applicantName = `${app.applicants?.first_name ?? ''} ${app.applicants?.last_name ?? ''}`.trim();

    void automation.handleStageMove({
      applicationId: app.id,
      applicantId: app.applicant_id,
      applicantName,
      fromStageId: app.current_stage_id,
      toStageId,
      stageName: toStage.name,
    });
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

      <StageMoveConfirmDialog
        pendingMove={automation.pendingMove}
        isSending={automation.isSending}
        isSkipping={automation.isSkipping}
        onConfirmSend={() => automation.confirmMoveAndSend()}
        onConfirmSkip={(reason) => automation.confirmMoveSkipExternal(reason)}
        onCancel={automation.cancelMove}
      />
    </>
  );
};

export default PipelineBoard;

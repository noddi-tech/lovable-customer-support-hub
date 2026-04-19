import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useDefaultPipeline,
  useStageApplicationCounts,
  useUpdatePipelineStages,
  useReassignAndUpdateStages,
} from './usePipelineAdmin';
import { SYSTEM_STAGE_IDS, PRESET_COLORS, type Stage } from './types';
import { StageRow } from './StageRow';
import { StageEditDialog } from './StageEditDialog';
import { DeleteStageDialog } from './DeleteStageDialog';
import { PipelineKanbanPreview } from './PipelineKanbanPreview';

function migrateStages(raw: any[]): Stage[] {
  return (raw ?? []).map((s, idx) => ({
    id: s.id,
    name: s.name,
    order: typeof s.order === 'number' ? s.order : idx,
    color: s.color || PRESET_COLORS[0].value,
    auto_email: !!s.auto_email,
    auto_sms: !!s.auto_sms,
    is_system:
      typeof s.is_system === 'boolean'
        ? s.is_system
        : (SYSTEM_STAGE_IDS as readonly string[]).includes(s.id),
    description: s.description ?? '',
  }));
}

export function PipelineEditor() {
  const { data: pipeline, isLoading } = useDefaultPipeline();
  const { data: counts } = useStageApplicationCounts(pipeline?.id);
  const updateMutation = useUpdatePipelineStages();
  const reassignMutation = useReassignAndUpdateStages();

  const [draftStages, setDraftStages] = useState<Stage[]>([]);
  const [originalStages, setOriginalStages] = useState<Stage[]>([]);
  const [editTarget, setEditTarget] = useState<{ stage: Stage; mode: 'create' | 'edit' } | null>(
    null,
  );
  const [deleteDialog, setDeleteDialog] = useState<{
    removed: Array<{ stage: Stage; count: number }>;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  // Hydrate on load
  useEffect(() => {
    if (pipeline?.stages) {
      const migrated = migrateStages(pipeline.stages as any[]);
      setDraftStages(migrated);
      setOriginalStages(migrated);
    }
  }, [pipeline?.id]);

  const sortedDraft = useMemo(
    () => [...draftStages].sort((a, b) => a.order - b.order),
    [draftStages],
  );
  const isDirty = JSON.stringify(draftStages) !== JSON.stringify(originalStages);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = sortedDraft.findIndex((s) => s.id === active.id);
    const newIdx = sortedDraft.findIndex((s) => s.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const moved = arrayMove(sortedDraft, oldIdx, newIdx).map((s, i) => ({ ...s, order: i }));
    setDraftStages(moved);
  };

  const handleAddStage = () => {
    setEditTarget({
      stage: {
        id: '',
        name: '',
        order: draftStages.length,
        color: PRESET_COLORS[0].value,
        auto_email: false,
        auto_sms: false,
        is_system: false,
        description: '',
      },
      mode: 'create',
    });
  };

  const handleEditStage = (stage: Stage) => {
    setEditTarget({ stage, mode: 'edit' });
  };

  const handleSaveStage = (updated: Stage) => {
    setDraftStages((prev) => {
      const exists = prev.some((s) => s.id === updated.id);
      if (exists) {
        return prev.map((s) => (s.id === updated.id ? updated : s));
      }
      // Creating: replace placeholder (empty id) entry if present, else append
      const filtered = prev.filter((s) => s.id !== '');
      return [...filtered, updated];
    });
    setEditTarget(null);
  };

  const handleDeleteStage = (stage: Stage) => {
    if (stage.is_system) return;
    const count = counts?.[stage.id] ?? 0;
    if (count > 0) {
      // Open dialog inline — single removal flow uses same combined dialog
      setDeleteDialog({ removed: [{ stage, count }] });
      // Optimistically remove from draft so the dialog reflects post-removal state on confirm,
      // but we actually need to keep it in draft until the user confirms — so don't remove yet.
      return;
    }
    setDraftStages((prev) => prev.filter((s) => s.id !== stage.id).map((s, i) => ({ ...s, order: i })));
  };

  const handleReset = () => {
    setDraftStages(originalStages);
  };

  const handleSave = async () => {
    if (!pipeline?.id) return;
    setSaving(true);
    try {
      const draftIds = new Set(draftStages.map((s) => s.id));
      const removed = originalStages.filter((s) => !draftIds.has(s.id));
      const blocking = removed
        .map((s) => ({ stage: s, count: counts?.[s.id] ?? 0 }))
        .filter((r) => r.count > 0);

      if (blocking.length === 0) {
        await updateMutation.mutateAsync({ pipelineId: pipeline.id, stages: draftStages });
        toast.success('Pipeline oppdatert');
        setOriginalStages(draftStages);
        setSaving(false);
        return;
      }

      // Defer to dialog
      setDeleteDialog({ removed: blocking });
      setSaving(false);
    } catch (err: any) {
      handleSaveError(err);
      setSaving(false);
    }
  };

  const handleSaveError = (err: any) => {
    if (err?.code === 'P0001' && err?.details) {
      try {
        const parsed = JSON.parse(err.details) as Array<{ stage_id: string; count: number }>;
        const removed = parsed
          .map((p) => {
            const s = originalStages.find((o) => o.id === p.stage_id);
            return s ? { stage: s, count: p.count } : null;
          })
          .filter(Boolean) as Array<{ stage: Stage; count: number }>;
        if (removed.length > 0) {
          setDeleteDialog({ removed });
          return;
        }
      } catch {
        /* ignore */
      }
    }
    toast.error(err?.message || 'Kunne ikke lagre pipeline');
    setDraftStages(originalStages);
  };

  const handleConfirmReassign = async (assignments: Record<string, string>) => {
    if (!pipeline?.id || !deleteDialog) return;
    setSaving(true);
    const dialogRemoved = deleteDialog.removed;
    setDeleteDialog(null);

    try {
      // Remove the blocking stages from draft (in case they weren't already)
      const removedIds = new Set(dialogRemoved.map((r) => r.stage.id));
      const finalStages = draftStages
        .filter((s) => !removedIds.has(s.id))
        .map((s, i) => ({ ...s, order: i }));

      // Sequential reassigns
      for (const { stage } of dialogRemoved) {
        const target = assignments[stage.id];
        if (!target) throw new Error(`Mangler mål for ${stage.name}`);
        await reassignMutation.mutateAsync({
          pipelineId: pipeline.id,
          fromStageId: stage.id,
          toStageId: target,
          newStages: finalStages,
        });
      }

      // Final update for any pending reorder/rename/color changes
      await updateMutation.mutateAsync({ pipelineId: pipeline.id, stages: finalStages });

      toast.success('Pipeline oppdatert og søkere omfordelt');
      setDraftStages(finalStages);
      setOriginalStages(finalStages);
    } catch (err: any) {
      toast.error(err?.message || 'Kunne ikke fullføre omfordelingen');
      setDraftStages(originalStages);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!pipeline) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Fant ingen standard pipeline for denne organisasjonen.
        </CardContent>
      </Card>
    );
  }

  // existingIds for dialog uniqueness check
  const existingIds = draftStages.map((s) => s.id).filter((id) => id !== editTarget?.stage.id);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left: editor (60%) */}
      <div className="lg:col-span-3 space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>Pipeline-stadier</CardTitle>
              <Button size="sm" onClick={handleAddStage}>
                <Plus className="h-4 w-4 mr-1" />
                Legg til stadium
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Dra og slipp for å endre rekkefølgen. Systemstadier (Ikke vurdert, Ansatt, Diskvalifisert) kan gis nytt navn og farge, men ikke slettes.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sortedDraft.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {sortedDraft.map((stage) => (
                    <StageRow
                      key={stage.id}
                      stage={stage}
                      applicationCount={counts?.[stage.id]}
                      onEdit={() => handleEditStage(stage)}
                      onDelete={() => handleDeleteStage(stage)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            {sortedDraft.length === 0 && (
              <div className="text-sm text-muted-foreground py-6 text-center">
                Ingen stadier ennå. Legg til ditt første stadium for å komme i gang.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sticky action bar */}
        <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t pt-3 pb-2 flex items-center justify-end gap-2 z-10">
          <Button variant="ghost" onClick={handleReset} disabled={!isDirty || saving}>
            Avbryt
          </Button>
          <Button onClick={handleSave} disabled={!isDirty || saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Lagre endringer
          </Button>
        </div>
      </div>

      {/* Right: preview (40%) */}
      <div className="lg:col-span-2 space-y-2">
        <Card>
          <CardHeader>
            <CardTitle>Forhåndsvisning</CardTitle>
            <p className="text-sm text-muted-foreground">
              Slik vil kanban-tavlen se ut for rekrutterere.
            </p>
          </CardHeader>
          <CardContent>
            <PipelineKanbanPreview stages={draftStages} />
          </CardContent>
        </Card>
      </div>

      <StageEditDialog
        open={!!editTarget}
        stage={editTarget?.stage ?? null}
        mode={editTarget?.mode ?? 'edit'}
        existingIds={existingIds}
        onClose={() => setEditTarget(null)}
        onSave={handleSaveStage}
      />

      <DeleteStageDialog
        open={!!deleteDialog}
        removedStages={deleteDialog?.removed ?? []}
        availableTargets={draftStages.filter(
          (s) => !(deleteDialog?.removed ?? []).some((r) => r.stage.id === s.id),
        )}
        onClose={() => setDeleteDialog(null)}
        onConfirm={handleConfirmReassign}
      />
    </div>
  );
}

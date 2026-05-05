import { useMemo, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Pencil, Archive, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTags, useArchiveTag, useReorderTags, type RecruitmentTag } from '@/hooks/recruitment/useTags';
import { TagEditDialog } from './TagEditDialog';

function TagRow({
  tag,
  onEdit,
  onArchive,
}: {
  tag: RecruitmentTag;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tag.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 rounded-md border bg-card"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        aria-label="Dra for å endre rekkefølge"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div
        className="h-4 w-4 rounded-full flex-shrink-0"
        style={{ backgroundColor: tag.color }}
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{tag.name}</div>
        {tag.description && (
          <div className="text-xs text-muted-foreground truncate">{tag.description}</div>
        )}
      </div>
      <Button size="icon" variant="ghost" onClick={onEdit} aria-label="Rediger etikett">
        <Pencil className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" onClick={onArchive} aria-label="Arkiver etikett">
        <Archive className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function TagsTab() {
  const { data: tags, isLoading } = useTags();
  const reorderMut = useReorderTags();
  const archiveMut = useArchiveTag();
  const [editTarget, setEditTarget] = useState<RecruitmentTag | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<RecruitmentTag | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const sorted = useMemo(() => [...(tags ?? [])], [tags]);

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = sorted.findIndex((t) => t.id === active.id);
    const newIdx = sorted.findIndex((t) => t.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(sorted, oldIdx, newIdx);
    reorderMut.mutate(next.map((t) => t.id));
  };

  const openCreate = () => {
    setEditTarget(null);
    setEditOpen(true);
  };
  const openEdit = (t: RecruitmentTag) => {
    setEditTarget(t);
    setEditOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle>Etiketter</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Definer fargede etiketter du kan feste på søkere for å organisere og filtrere.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Ny etikett
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            Ingen etiketter ennå. Opprett en for å komme i gang.
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sorted.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {sorted.map((t) => (
                  <TagRow
                    key={t.id}
                    tag={t}
                    onEdit={() => openEdit(t)}
                    onArchive={() => setArchiveTarget(t)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>

      <TagEditDialog
        open={editOpen}
        tag={editTarget}
        onClose={() => setEditOpen(false)}
      />

      <AlertDialog open={!!archiveTarget} onOpenChange={(o) => !o && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arkiver etikett?</AlertDialogTitle>
            <AlertDialogDescription>
              «{archiveTarget?.name}» blir skjult fra etikett-velgeren, men forblir på eksisterende
              søkere som har den. Du kan ikke velge denne etiketten på nye søkere etter arkivering.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (archiveTarget) archiveMut.mutate(archiveTarget.id);
                setArchiveTarget(null);
              }}
            >
              Arkiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

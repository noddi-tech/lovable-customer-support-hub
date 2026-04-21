import { useMemo } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { toast } from 'sonner';
import { RuleCard } from './RuleCard';
import type { AutomationRule, RuleLookups } from './types';
import { useRuleMutations } from './hooks/useRuleMutations';

interface Props {
  rules: AutomationRule[];
  lookups: RuleLookups;
  onEdit: (rule: AutomationRule) => void;
}

export function RulesList({ rules, lookups, onEdit }: Props) {
  const { reorderRules } = useRuleMutations();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const ids = useMemo(() => rules.map((r) => r.id), [rules]);

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = rules.findIndex((r) => r.id === active.id);
    const newIdx = rules.findIndex((r) => r.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const moved = arrayMove(rules, oldIdx, newIdx);
    const updates = moved.map((r, i) => ({ id: r.id, execution_order: i }));
    reorderRules.mutate(updates, {
      onError: (err: any) =>
        toast.error(err?.message ?? 'Kunne ikke endre rekkefølge'),
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              lookups={lookups}
              onEdit={() => onEdit(rule)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

import React, { useMemo, useState } from 'react';
import { Check, Pencil, X, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  useStageFieldRequirements,
  type StageFieldRequirement,
} from '@/hooks/recruitment/useStageFieldRequirements';
import { useCustomFields, type CustomFieldWithType } from '@/hooks/recruitment/useCustomFields';
import { useApplicantFieldValues } from '@/hooks/recruitment/useApplicantFieldValues';
import { useUpsertApplicantFieldValue } from '@/hooks/recruitment/useUpsertApplicantFieldValue';
import { CustomFieldValueInput } from './CustomFieldValueInput';
import { formatFieldValue } from './formatFieldValue';
import { toast } from 'sonner';

interface Props {
  applicantId: string;
  pipelineId: string | null;
  stageId: string | null;
  positionId: string | null;
  stageName?: string | null;
}

const StageFieldsSection: React.FC<Props> = ({
  applicantId,
  pipelineId,
  stageId,
  positionId,
  stageName,
}) => {
  const { data: reqs, isLoading } = useStageFieldRequirements(pipelineId, positionId);
  const { data: fields } = useCustomFields();
  const { data: values } = useApplicantFieldValues(applicantId, 'all');
  const upsert = useUpsertApplicantFieldValue();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState<unknown>(null);
  const [draftRaw, setDraftRaw] = useState<string | null>(null);

  const fieldsByid = useMemo(() => {
    const m = new Map<string, CustomFieldWithType>();
    (fields ?? []).forEach((f) => m.set(f.id, f));
    return m;
  }, [fields]);

  const valuesByFieldId = useMemo(() => {
    const m = new Map<string, any>();
    (values ?? []).forEach((v) => m.set(v.field_id, v));
    return m;
  }, [values]);

  // Filter to current stage, dedupe (position-specific wins over org-wide)
  const stageReqs = useMemo(() => {
    if (!reqs || !stageId) return [] as StageFieldRequirement[];
    const filtered = reqs.filter((r) => r.stage_id === stageId);
    const merged = new Map<string, StageFieldRequirement>();
    for (const r of filtered) {
      const ex = merged.get(r.custom_field_id);
      if (!ex || (r.position_id !== null && ex.position_id === null)) {
        merged.set(r.custom_field_id, r);
      }
    }
    return Array.from(merged.values()).sort((a, b) => a.display_order - b.display_order);
  }, [reqs, stageId]);

  if (!pipelineId || !stageId) return null;
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Felt for nåværende fase</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }
  if (stageReqs.length === 0) return null;

  const startEdit = (req: StageFieldRequirement) => {
    const v = valuesByFieldId.get(req.custom_field_id);
    setEditingId(req.custom_field_id);
    setDraftValue(v?.value ?? null);
    setDraftRaw(v?.raw_value ?? null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftValue(null);
    setDraftRaw(null);
  };

  const saveEdit = async (fieldId: string) => {
    try {
      await upsert.mutateAsync({
        applicant_id: applicantId,
        field_id: fieldId,
        value: draftValue,
        raw_value: draftRaw,
      });
      toast.success('Lagret');
      cancelEdit();
    } catch (e: any) {
      toast.error(e?.message ?? 'Kunne ikke lagre');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">
          Felt for fase {stageName ? `«${stageName}»` : ''}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y">
          {stageReqs.map((req) => {
            const field = fieldsByid.get(req.custom_field_id);
            if (!field) return null;
            const v = valuesByFieldId.get(req.custom_field_id);
            const isEmpty =
              v == null ||
              v.value == null ||
              (typeof v.value === 'string' && v.value.trim() === '') ||
              (Array.isArray(v.value) && v.value.length === 0);
            const isRequired = req.requirement_type === 'required';
            const editing = editingId === req.custom_field_id;
            return (
              <li key={req.id} className="px-4 py-3 text-sm">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground">{field.display_name}</span>
                      {isRequired ? (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-red-300 text-red-700">
                          Påkrevd
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                          Valgfri
                        </Badge>
                      )}
                      {isEmpty && isRequired && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-700">
                          <AlertCircle className="h-3 w-3" /> mangler
                        </span>
                      )}
                    </div>
                    {editing ? (
                      <div className="mt-2 space-y-2">
                        <CustomFieldValueInput
                          typeKey={field.type_key}
                          value={draftValue}
                          options={(field.options as any) ?? null}
                          onChange={(val, raw) => {
                            setDraftValue(val);
                            setDraftRaw(raw);
                          }}
                          autoFocus
                        />
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => saveEdit(req.custom_field_id)}
                            disabled={upsert.isPending}
                          >
                            {upsert.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            Lagre
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>
                            <X className="h-3.5 w-3.5" />
                            Avbryt
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-0.5 text-muted-foreground">
                        {isEmpty ? (
                          <span className="italic text-xs">— ikke fylt ut —</span>
                        ) : (
                          formatFieldValue(v as any)
                        )}
                      </div>
                    )}
                  </div>
                  {!editing && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => startEdit(req)}
                      title="Rediger"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
};

export default StageFieldsSection;

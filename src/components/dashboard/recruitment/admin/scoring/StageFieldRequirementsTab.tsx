import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDefaultPipeline } from '../pipeline/usePipelineAdmin';
import { useCustomFields } from '@/hooks/recruitment/useCustomFields';
import {
  useStageFieldRequirements,
  useUpsertStageFieldRequirement,
  useDeleteStageFieldRequirement,
  type RequirementType,
  type StageFieldRequirement,
} from '@/hooks/recruitment/useStageFieldRequirements';
import type { Stage } from '../pipeline/types';

interface Props {
  /** When provided, configures position-specific requirements; otherwise org-wide. */
  positionId?: string | null;
}

export const StageFieldRequirementsTab: React.FC<Props> = ({ positionId = null }) => {
  const { data: pipeline, isLoading: pipelineLoading } = useDefaultPipeline();
  const { data: fields, isLoading: fieldsLoading } = useCustomFields();
  const { data: requirements, isLoading: reqsLoading } = useStageFieldRequirements(
    pipeline?.id,
    positionId,
  );
  const upsert = useUpsertStageFieldRequirement();
  const del = useDeleteStageFieldRequirement();
  const { toast } = useToast();

  const stages = useMemo<Stage[]>(
    () => ((pipeline?.stages as unknown as Stage[]) ?? []).slice().sort((a, b) => a.order - b.order),
    [pipeline?.stages],
  );

  if (pipelineLoading || fieldsLoading || reqsLoading) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (!pipeline) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Ingen pipeline funnet. Opprett en standard-pipeline først.
        </CardContent>
      </Card>
    );
  }
  if ((fields ?? []).length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Du må opprette egendefinerte felt før du kan kreve dem på trinn.
        </CardContent>
      </Card>
    );
  }

  const reqsByStage: Record<string, StageFieldRequirement[]> = {};
  for (const r of requirements ?? []) {
    (reqsByStage[r.stage_id] ??= []).push(r);
  }

  const handleAdd = async (stageId: string, fieldId: string, requirement_type: RequirementType) => {
    try {
      await upsert.mutateAsync({
        pipeline_id: pipeline.id,
        stage_id: stageId,
        custom_field_id: fieldId,
        position_id: positionId,
        requirement_type,
      });
      toast({ title: 'Krav lagt til' });
    } catch (e: any) {
      toast({ title: 'Kunne ikke legge til', description: e?.message, variant: 'destructive' });
    }
  };

  const handleToggleBlock = async (r: StageFieldRequirement, block: boolean) => {
    try {
      await upsert.mutateAsync({
        id: r.id,
        pipeline_id: r.pipeline_id,
        stage_id: r.stage_id,
        custom_field_id: r.custom_field_id,
        position_id: r.position_id,
        requirement_type: r.requirement_type,
        block_stage_progression: block,
      });
    } catch (e: any) {
      toast({ title: 'Kunne ikke oppdatere', description: e?.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await del.mutateAsync(id);
      toast({ title: 'Krav fjernet' });
    } catch (e: any) {
      toast({ title: 'Sletting feilet', description: e?.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-base">
            {positionId ? 'Stilling: påkrevde felt per trinn' : 'Pipeline: påkrevde felt per trinn'}
          </CardTitle>
          <CardDescription>
            Definer hvilke egendefinerte felt som må fylles ut før en søker kan flyttes til et
            gitt trinn. {positionId
              ? 'Disse overstyrer organisasjonens fellesregler for denne stillingen.'
              : 'Stillinger kan legge til egne overstyringer.'}
          </CardDescription>
        </CardHeader>
      </Card>

      {stages.map((s) => (
        <StageRequirementCard
          key={s.id}
          stage={s}
          requirements={reqsByStage[s.id] ?? []}
          fields={fields ?? []}
          positionId={positionId ?? null}
          onAdd={handleAdd}
          onToggleBlock={handleToggleBlock}
          onDelete={handleDelete}
          busy={upsert.isPending || del.isPending}
        />
      ))}
    </div>
  );
};

interface StageCardProps {
  stage: Stage;
  requirements: StageFieldRequirement[];
  fields: Array<{ id: string; display_name: string; field_key: string; type_display_name: string }>;
  positionId: string | null;
  onAdd: (stageId: string, fieldId: string, type: RequirementType) => void;
  onToggleBlock: (r: StageFieldRequirement, block: boolean) => void;
  onDelete: (id: string) => void;
  busy: boolean;
}

const StageRequirementCard: React.FC<StageCardProps> = ({
  stage, requirements, fields, positionId, onAdd, onToggleBlock, onDelete, busy,
}) => {
  const [fieldId, setFieldId] = useState<string>('');
  const [type, setType] = useState<RequirementType>('required');

  // For position-scoped view: req.position_id null => inherited (read-only here)
  const isInherited = (r: StageFieldRequirement) => positionId !== null && r.position_id === null;

  const usedFieldIds = new Set(
    requirements.filter((r) => positionId === null || r.position_id === positionId).map((r) => r.custom_field_id),
  );
  const availableFields = fields.filter((f) => !usedFieldIds.has(f.id));

  const handleAdd = () => {
    if (!fieldId) return;
    onAdd(stage.id, fieldId, type);
    setFieldId('');
    setType('required');
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: stage.color }}
          />
          <CardTitle className="text-sm">{stage.name}</CardTitle>
          <Badge variant="outline" className="text-xs">
            {requirements.length} krav
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {requirements.length === 0 ? (
          <p className="text-xs text-muted-foreground">Ingen krav på dette trinnet ennå.</p>
        ) : (
          <div className="space-y-1.5">
            {requirements.map((r) => {
              const f = fields.find((x) => x.id === r.custom_field_id);
              const inherited = isInherited(r);
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-medium truncate">
                      {f?.display_name ?? <span className="text-muted-foreground">(slettet felt)</span>}
                    </span>
                    {f && (
                      <span className="text-xs text-muted-foreground font-mono shrink-0">
                        {f.type_display_name}
                      </span>
                    )}
                    <Badge
                      variant={r.requirement_type === 'required' ? 'default' : 'secondary'}
                      className="text-[10px]"
                    >
                      {r.requirement_type === 'required' ? 'Påkrevd' : 'Valgfri'}
                    </Badge>
                    {inherited && (
                      <Badge variant="outline" className="text-[10px]">Arvet</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <label
                      className="flex items-center gap-1.5 text-xs text-muted-foreground"
                      title="Hvis på, blokkerer manglende svar at søkeren flyttes til dette trinnet."
                    >
                      <span>Blokker</span>
                      <Switch
                        checked={r.block_stage_progression}
                        onCheckedChange={(v) => onToggleBlock(r, v)}
                        disabled={busy || inherited}
                      />
                    </label>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDelete(r.id)}
                      disabled={busy || inherited}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {availableFields.length === 0 ? (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Alle tilgjengelige felt er allerede konfigurert på dette trinnet.
          </p>
        ) : (
          <div className="flex items-center gap-2 pt-1 border-t">
            <Select value={fieldId} onValueChange={setFieldId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Velg felt å kreve" />
              </SelectTrigger>
              <SelectContent>
                {availableFields.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={(v) => setType(v as RequirementType)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="required">Påkrevd</SelectItem>
                <SelectItem value="optional">Valgfri</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleAdd} disabled={!fieldId || busy}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Legg til
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

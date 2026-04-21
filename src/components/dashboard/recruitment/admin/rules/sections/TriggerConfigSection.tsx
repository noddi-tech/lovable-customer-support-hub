import { Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TRIGGER_LABELS, type TriggerType } from '../types';
import {
  useStagesForOrg,
  usePositionsForOrg,
} from '../hooks/useRules';

interface Props {
  triggerType: TriggerType;
  triggerConfig: Record<string, unknown>;
  onTriggerTypeChange: (value: TriggerType) => void;
  onTriggerConfigChange: (config: Record<string, unknown>) => void;
  errors?: {
    stage_id?: { message?: string };
    position_id?: { message?: string };
  };
}

export function TriggerConfigSection({
  triggerType,
  triggerConfig,
  onTriggerTypeChange,
  onTriggerConfigChange,
  errors,
}: Props) {
  const { data: stages, isLoading: stagesLoading } = useStagesForOrg();
  const { data: positions, isLoading: positionsLoading } = usePositionsForOrg();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Utløser</h3>
        <p className="text-xs text-muted-foreground">Når skal denne regelen kjøre?</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="rule-trigger-type" className="text-xs font-medium">
          Type <span className="text-destructive">*</span>
        </Label>
        <Select
          value={triggerType}
          onValueChange={(v) => onTriggerTypeChange(v as TriggerType)}
        >
          <SelectTrigger id="rule-trigger-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(TRIGGER_LABELS) as TriggerType[]).map((k) => (
              <SelectItem key={k} value={k}>
                {TRIGGER_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {triggerType === 'stage_entered' && (
        <div className="space-y-1.5">
          <Label htmlFor="rule-trigger-stage" className="text-xs font-medium">
            Hvilken fase? <span className="text-destructive">*</span>
          </Label>
          {stagesLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Laster faser...
            </div>
          ) : (
            <Select
              value={(triggerConfig.stage_id as string) ?? ''}
              onValueChange={(v) => onTriggerConfigChange({ stage_id: v })}
            >
              <SelectTrigger id="rule-trigger-stage">
                <SelectValue placeholder="Velg fase..." />
              </SelectTrigger>
              <SelectContent>
                {(stages ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-2">
                      {s.color && (
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
                      )}
                      {s.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {errors?.stage_id?.message && (
            <p className="text-xs text-destructive">{errors.stage_id.message}</p>
          )}
        </div>
      )}

      {triggerType === 'application_created' && (
        <div className="space-y-1.5">
          <Label htmlFor="rule-trigger-position" className="text-xs font-medium">
            Hvilken stilling? <span className="text-muted-foreground">(valgfritt)</span>
          </Label>
          {positionsLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Laster stillinger...
            </div>
          ) : (
            <Select
              value={(triggerConfig.position_id as string) ?? '__any__'}
              onValueChange={(v) =>
                onTriggerConfigChange(
                  v === '__any__' ? {} : { position_id: v },
                )
              }
            >
              <SelectTrigger id="rule-trigger-position">
                <SelectValue placeholder="Alle stillinger" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__any__">Alle stillinger</SelectItem>
                {(positions ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <p className="text-[11px] text-muted-foreground">
            La være tom for å kjøre for alle stillinger.
          </p>
        </div>
      )}
    </div>
  );
}

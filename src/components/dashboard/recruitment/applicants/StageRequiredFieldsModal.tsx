import React, { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CustomFieldValueInput } from './CustomFieldValueInput';
import { useStageProgressionValidation, type MissingField } from '@/hooks/recruitment/useStageProgressionValidation';
import { useUpsertApplicantFieldValue } from '@/hooks/recruitment/useUpsertApplicantFieldValue';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  /** Page-mounted; parent owns mount lifecycle so Radix cleanup doesn't race
   *  with toolbar unmount (memory #3 — Radix dropdown→dialog freeze pattern). */
  onOpenChange: (o: boolean) => void;
  applicantId: string;
  applicationId: string;
  targetStageId: string;
  targetStageName: string;
  /** Called when all required fields are satisfied OR override is used. */
  onProceed: (opts: { overridden: boolean; override_reason?: string }) => void;
}

type Draft = { value: unknown; raw: string | null };

const StageRequiredFieldsModal: React.FC<Props> = ({
  open,
  onOpenChange,
  applicantId,
  applicationId,
  targetStageId,
  targetStageName,
  onProceed,
}) => {
  const validate = useStageProgressionValidation();
  const upsert = useUpsertApplicantFieldValue();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [missing, setMissing] = useState<MissingField[]>([]);
  const [optional, setOptional] = useState<MissingField[]>([]);
  const [canOverride, setCanOverride] = useState(false);
  const [overrideMode, setOverrideMode] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Defer the validate call by one tick after open — gives Radix time to
  // finalize the dialog mount (memory #3) before we start a network request
  // that might trigger re-renders during the focus-trap initialization.
  useEffect(() => {
    if (!open) {
      setLoaded(false);
      setDrafts({});
      setOverrideMode(false);
      setOverrideReason('');
      return;
    }
    const t = setTimeout(() => {
      validate.mutate(
        { application_id: applicationId, target_stage_id: targetStageId },
        {
          onSuccess: (res) => {
            setMissing(res.missing_required);
            setOptional(res.missing_optional);
            setCanOverride(res.can_override);
            setLoaded(true);
            // If nothing is missing, immediately proceed.
            if (res.missing_required.length === 0) {
              onOpenChange(false);
              setTimeout(() => onProceed({ overridden: false }), 0);
            }
          },
          onError: (e: any) => {
            toast.error(e?.message ?? 'Kunne ikke validere fase-krav');
            onOpenChange(false);
          },
        },
      );
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, applicationId, targetStageId]);

  const setDraft = (fieldId: string, value: unknown, raw: string | null) => {
    setDrafts((d) => ({ ...d, [fieldId]: { value, raw } }));
  };

  const allFilled = missing.every((m) => {
    const d = drafts[m.field_id];
    if (!d) return false;
    const v = d.value;
    if (v == null) return false;
    if (typeof v === 'string') return v.trim().length > 0;
    if (Array.isArray(v)) return v.length > 0;
    return true;
  });

  const saveAndProceed = async () => {
    setSaving(true);
    try {
      for (const m of missing) {
        const d = drafts[m.field_id];
        if (!d) continue;
        await upsert.mutateAsync({
          applicant_id: applicantId,
          field_id: m.field_id,
          value: d.value,
          raw_value: d.raw,
        });
      }
      toast.success('Felt lagret');
      // Defer close + proceed so any nested Popovers can finish their close
      // cycle and release the body pointer-events lock cleanly.
      onOpenChange(false);
      setTimeout(() => onProceed({ overridden: false }), 0);
    } catch (e: any) {
      toast.error(e?.message ?? 'Kunne ikke lagre');
    } finally {
      setSaving(false);
    }
  };

  const doOverride = () => {
    onOpenChange(false);
    setTimeout(
      () =>
        onProceed({
          overridden: true,
          override_reason: overrideReason.trim() || undefined,
        }),
      0,
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Mangler informasjon for «{targetStageName}»
          </DialogTitle>
          <DialogDescription>
            Disse feltene må fylles ut før søkeren kan flyttes til denne fasen.
          </DialogDescription>
        </DialogHeader>

        {!loaded || validate.isPending ? (
          <div className="space-y-2 py-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {missing.map((m) => (
              <div key={m.field_id} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">{m.field_name}</Label>
                  <Badge
                    variant="outline"
                    className="text-[10px] h-4 px-1.5 border-red-300 text-red-700"
                  >
                    Påkrevd
                  </Badge>
                </div>
                <CustomFieldValueInput
                  typeKey={m.field_type}
                  value={drafts[m.field_id]?.value ?? null}
                  options={null}
                  insideDialog
                  onChange={(v, r) => setDraft(m.field_id, v, r)}
                />
              </div>
            ))}

            {optional.length > 0 && (
              <div className="pt-2 border-t">
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  Valgfrie felter (blokkerer ikke flytting)
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {optional.map((o) => (
                    <li key={o.field_id}>• {o.field_name}</li>
                  ))}
                </ul>
              </div>
            )}

            {canOverride && (
              <div className="pt-2 border-t">
                {!overrideMode ? (
                  <button
                    type="button"
                    onClick={() => setOverrideMode(true)}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" /> Overstyr som admin
                  </button>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                      Admin-overstyring — begrunnelse (valgfritt)
                    </Label>
                    <textarea
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      rows={2}
                      className="w-full text-sm border rounded-md p-2 bg-background"
                      placeholder="F.eks. info bekreftet muntlig"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Avbryt
          </Button>
          {canOverride && overrideMode && (
            <Button variant="destructive" onClick={doOverride} disabled={saving}>
              Overstyr og flytt
            </Button>
          )}
          <Button onClick={saveAndProceed} disabled={!allFilled || saving}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Lagre og flytt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StageRequiredFieldsModal;

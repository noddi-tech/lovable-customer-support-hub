import React, { useEffect, useMemo, useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { StepIndicator } from './wizard/StepIndicator';
import { useFormPositionMappings } from '../hooks/useFormPositionMappings';
import { useApplicantPipeline } from '@/components/dashboard/recruitment/applicants/useApplicants';
import {
  useBulkImportStart,
  useBulkImportExecute,
  useBulkImportStatus,
  useInvalidateApplicantsAfterImport,
  type BulkImportStartResult,
} from '@/hooks/recruitment/useBulkImport';
import type { ApprovalMode } from '../types';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  integrationId: string;
}

const STEPS = [
  { id: 1, label: 'Omfang' },
  { id: 2, label: 'Bekreft' },
  { id: 3, label: 'Kjør' },
];

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function BulkImportDialog({ open, onOpenChange, integrationId }: Props) {
  const { toast } = useToast();
  const { mappings } = useFormPositionMappings(integrationId);
  const { data: pipeline } = useApplicantPipeline();
  const start = useBulkImportStart();
  const execute = useBulkImportExecute();
  const invalidate = useInvalidateApplicantsAfterImport();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const today = useMemo(() => new Date(), []);
  const ninetyAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d;
  }, []);

  const [selectedFormIds, setSelectedFormIds] = useState<string[]>([]);
  const [sinceDate, setSinceDate] = useState<string>(isoDate(ninetyAgo));
  const [untilDate, setUntilDate] = useState<string>(isoDate(today));
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>('quarantine');
  const [stageId, setStageId] = useState<string>('');

  const [dryRun, setDryRun] = useState<BulkImportStartResult | null>(null);
  const [confirmedUnmapped, setConfirmedUnmapped] = useState(false);
  const [bulkImportId, setBulkImportId] = useState<string | null>(null);

  const status = useBulkImportStatus(bulkImportId, step === 3);

  // Default stage to first pipeline stage
  useEffect(() => {
    if (!stageId && pipeline?.stages?.length) {
      setStageId(pipeline.stages[0].id);
    }
  }, [pipeline, stageId]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep(1);
      setSelectedFormIds([]);
      setDryRun(null);
      setConfirmedUnmapped(false);
      setBulkImportId(null);
      setSinceDate(isoDate(ninetyAgo));
      setUntilDate(isoDate(today));
      setApprovalMode('quarantine');
    }
  }, [open, ninetyAgo, today]);

  const validateRange = () => {
    const since = new Date(sinceDate);
    const until = new Date(untilDate);
    if (since > until) return 'Fra-dato må være før til-dato';
    const diffDays = (until.getTime() - since.getTime()) / 86400000;
    if (diffDays > 90) return 'Maks 90 dager per import';
    return null;
  };

  const handleNext1 = async () => {
    if (selectedFormIds.length === 0) {
      toast({ title: 'Velg minst ett skjema', variant: 'destructive' });
      return;
    }
    const rangeErr = validateRange();
    if (rangeErr) {
      toast({ title: rangeErr, variant: 'destructive' });
      return;
    }
    try {
      const res = await start.mutateAsync({
        integration_id: integrationId,
        form_mapping_ids: selectedFormIds,
        since_date: sinceDate,
        until_date: untilDate,
        approval_mode: approvalMode,
        imported_pipeline_stage_id: approvalMode === 'direct' ? stageId || null : null,
      });
      setDryRun(res);
      setStep(2);
    } catch (e: any) {
      toast({ title: 'Forhåndsvisning feilet', description: e?.message, variant: 'destructive' });
    }
  };

  const handleExecute = async () => {
    if (!dryRun?.bulk_import_id) {
      toast({ title: 'Mangler import-ID', variant: 'destructive' });
      return;
    }
    // Optimistically advance to step 3 so the user immediately sees progress UI
    const id = dryRun.bulk_import_id;
    setBulkImportId(id);
    setStep(3);
    try {
      await execute.mutateAsync({ bulk_import_id: id });
    } catch (e: any) {
      toast({ title: 'Kjøring feilet', description: e?.message, variant: 'destructive' });
      setBulkImportId(null);
      setStep(2);
    }
  };

  const totalsByForm = dryRun?.totals_per_form ?? [];
  const hasUnmapped = totalsByForm.some((t) => t.mapping_status === 'missing' || t.mapping_complete === false);

  const importStatus = status.data?.import.status;
  const breakdown = status.data?.breakdown;
  const totalProcessed = breakdown
    ? breakdown.imported + breakdown.duplicate + breakdown.unmapped + breakdown.failed
    : 0;
  const totalFound = status.data?.import.total_leads_found ?? dryRun?.total_leads_found ?? 0;
  const progressPct = totalFound > 0 ? Math.min(100, Math.round((totalProcessed / totalFound) * 100)) : 0;
  const isFinished = importStatus === 'completed' || importStatus === 'failed' || importStatus === 'cancelled';

  useEffect(() => {
    if (isFinished) invalidate();
  }, [isFinished, invalidate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importer historikk fra Meta Lead Ads</DialogTitle>
          <DialogDescription>
            Hent leads fra valgte skjemaer for de siste 90 dagene og opprett som søkere.
          </DialogDescription>
        </DialogHeader>

        <StepIndicator steps={STEPS} current={step} />

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Skjemaer</Label>
              {mappings.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Ingen skjemaer tilgjengelig. Legg til skjemaer først.
                </p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto border rounded-md p-2">
                  {mappings.map((m) => (
                    <label
                      key={m.id}
                      className="flex items-center gap-2 text-sm py-1 px-1 rounded hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedFormIds.includes(m.id)}
                        onCheckedChange={(v) =>
                          setSelectedFormIds((prev) =>
                            v ? [...prev, m.id] : prev.filter((id) => id !== m.id)
                          )
                        }
                      />
                      <span className="flex-1">{m.form_name ?? '(uten navn)'}</span>
                      <span className="text-xs text-muted-foreground font-mono">{m.form_id}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Fra dato</Label>
                <Input
                  type="date"
                  value={sinceDate}
                  min={isoDate(ninetyAgo)}
                  max={isoDate(today)}
                  onChange={(e) => setSinceDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Til dato</Label>
                <Input
                  type="date"
                  value={untilDate}
                  max={isoDate(today)}
                  onChange={(e) => setUntilDate(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Maks 90 dager per import.</p>

            <div className="space-y-2">
              <Label>Godkjenningsmodus</Label>
              <RadioGroup
                value={approvalMode}
                onValueChange={(v) => setApprovalMode(v as ApprovalMode)}
              >
                <div className="flex items-start gap-2">
                  <RadioGroupItem id="bi-quar" value="quarantine" className="mt-0.5" />
                  <div>
                    <Label htmlFor="bi-quar" className="text-sm">
                      Karantene (anbefalt)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Importerte søkere må godkjennes manuelt før de blir aktive.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <RadioGroupItem id="bi-dir" value="direct" className="mt-0.5" />
                  <div>
                    <Label htmlFor="bi-dir" className="text-sm">
                      Direkte
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Søkere opprettes umiddelbart i pipeline-steget under.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {approvalMode === 'direct' && (
              <div className="space-y-1">
                <Label>Pipeline-steg for nye søkere</Label>
                <Select value={stageId} onValueChange={setStageId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Velg steg" />
                  </SelectTrigger>
                  <SelectContent>
                    {(pipeline?.stages ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Gjelder alle importerte søkere på tvers av valgte skjemaer.
                </p>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            {!dryRun ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <>
                <div className="rounded-md border p-3 space-y-2">
                  <div className="text-sm font-medium">
                    Totalt {dryRun.total_leads_found ?? 0} leads funnet
                  </div>
                  <div className="space-y-1">
                    {totalsByForm.map((t) => (
                      <div
                        key={t.form_mapping_id}
                        className="flex items-center justify-between text-sm rounded border px-2 py-1.5"
                      >
                        <div className="flex items-center gap-2">
                          <span>{t.form_name ?? t.form_id ?? '(uten navn)'}</span>
                          {t.mapping_status === 'missing' && (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              mangler tilordninger
                            </Badge>
                          )}
                          {t.error && (
                            <span className="text-xs text-destructive">{t.error}</span>
                          )}
                        </div>
                        <span className="font-mono text-xs">{t.leads_found ?? 0}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {hasUnmapped && (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm space-y-2">
                    <div className="flex items-center gap-2 font-medium">
                      <AlertTriangle className="h-4 w-4" />
                      Noen skjemaer mangler komplette tilordninger
                    </div>
                    <p className="text-xs">
                      Leads fra disse skjemaene blir importert med kun navn/e-post/telefon — øvrige svar
                      lagres som metadata og kan ikke filtreres på.
                    </p>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <Checkbox
                        checked={confirmedUnmapped}
                        onCheckedChange={(v) => setConfirmedUnmapped(!!v)}
                      />
                      Jeg er klar over dette og vil fortsette
                    </label>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            {!status.data ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>Starter import… henter leads fra Meta</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Forbereder…</span>
                    <span className="font-mono">0 / {totalFound}</span>
                  </div>
                  <Progress value={5} className="animate-pulse" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Dette kan ta noen sekunder. Du kan trygt lukke dialogen — importen fortsetter i bakgrunnen.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    {!isFinished && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    <span className="text-muted-foreground flex-1">
                      {isFinished
                        ? importStatus === 'completed'
                          ? 'Import fullført'
                          : importStatus === 'cancelled'
                          ? 'Import avbrutt'
                          : 'Import feilet'
                        : 'Importerer…'}
                    </span>
                    <span className="font-mono text-xs">
                      {totalProcessed} / {totalFound}
                    </span>
                  </div>
                  <Progress value={progressPct} />
                </div>

                {breakdown && (
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="rounded-md border p-2">
                      <div className="text-muted-foreground">Importert</div>
                      <div className="font-semibold text-emerald-600">{breakdown.imported}</div>
                    </div>
                    <div className="rounded-md border p-2">
                      <div className="text-muted-foreground">Duplikat</div>
                      <div className="font-semibold">{breakdown.duplicate}</div>
                    </div>
                    <div className="rounded-md border p-2">
                      <div className="text-muted-foreground">Umappet</div>
                      <div className="font-semibold text-amber-600">{breakdown.unmapped}</div>
                    </div>
                    <div className="rounded-md border p-2">
                      <div className="text-muted-foreground">Feilet</div>
                      <div className="font-semibold text-destructive">{breakdown.failed}</div>
                    </div>
                  </div>
                )}

                {isFinished && importStatus === 'completed' && bulkImportId && (
                  <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      Ferdig
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/operations/recruitment/applicants?bulk_import_id=${bulkImportId}`}>
                        Se importerte søkere
                      </Link>
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 1 && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Avbryt
              </Button>
              <Button onClick={handleNext1} disabled={start.isPending}>
                Forhåndsvis
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                Tilbake
              </Button>
              <Button
                onClick={handleExecute}
                disabled={
                  execute.isPending ||
                  !dryRun?.bulk_import_id ||
                  (hasUnmapped && !confirmedUnmapped)
                }
              >
                {execute.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Starter import…
                  </>
                ) : (
                  'Start import'
                )}
              </Button>
            </>
          )}
          {step === 3 && (
            <Button
              variant={isFinished ? 'default' : 'outline'}
              onClick={() => onOpenChange(false)}
            >
              {isFinished ? 'Lukk' : (
                <>
                  <X className="h-4 w-4 mr-1" />
                  Lukk (importen fortsetter i bakgrunnen)
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

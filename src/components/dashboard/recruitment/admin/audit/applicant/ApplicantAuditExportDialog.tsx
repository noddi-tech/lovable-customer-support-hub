import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuditExport } from '../hooks/useAuditExport';
import { useToast } from '@/hooks/use-toast';
import { Download, ShieldCheck } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicantId: string | null;
}

export function ApplicantAuditExportDialog({ open, onOpenChange, applicantId }: Props) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [include, setInclude] = useState({
    applicant_data: true,
    applications: true,
    notes: true,
    files: true,
    automation_events: true,
    ingestion_events: true,
  });

  const exportMutation = useAuditExport();
  const { toast } = useToast();

  const handleExport = async () => {
    if (!applicantId) return;
    try {
      const result = await exportMutation.mutateAsync({
        applicant_id: applicantId,
        date_range: from || to ? { from: from ? new Date(from).toISOString() : undefined, to: to ? new Date(to + 'T23:59:59').toISOString() : undefined } : undefined,
        format,
        include,
      });
      toast({
        title: 'Eksport fullført',
        description: `${result.filename} (${(result.size / 1024).toFixed(1)} KB) lastet ned.`,
      });
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Eksport feilet', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const toggle = (k: keyof typeof include) => setInclude((s) => ({ ...s, [k]: !s[k] }));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Eksporter søkerdata (DSAR)</SheetTitle>
          <SheetDescription>
            Last ned all data og hendelseshistorikk for valgt søker.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 py-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Fra dato (valgfritt)</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Til dato (valgfritt)</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Format</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as 'json' | 'csv')}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="json" id="fmt-json" />
                <Label htmlFor="fmt-json" className="font-normal">JSON (komplett, inkluderer datasnapshot)</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="csv" id="fmt-csv" />
                <Label htmlFor="fmt-csv" className="font-normal">CSV (kun hendelser, regneark-vennlig)</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Inkluder</Label>
            <div className="space-y-2">
              {([
                ['applicant_data', 'Søkerdata (profil)'],
                ['applications', 'Søknader'],
                ['notes', 'Notater'],
                ['files', 'Filer (metadata)'],
                ['automation_events', 'Automatiseringskjøringer'],
                ['ingestion_events', 'Innhentingslogg'],
              ] as const).map(([k, label]) => (
                <div key={k} className="flex items-center gap-2">
                  <Checkbox
                    id={`inc-${k}`}
                    checked={include[k]}
                    onCheckedChange={() => toggle(k)}
                  />
                  <Label htmlFor={`inc-${k}`} className="font-normal text-sm">{label}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border bg-muted/30 p-3 flex gap-2">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Eksport vil bli loggført som DSAR-svar i revisjonsloggen.
            </p>
          </div>
        </div>

        <SheetFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Avbryt</Button>
          <Button onClick={handleExport} disabled={!applicantId || exportMutation.isPending}>
            <Download className="h-4 w-4" />
            {exportMutation.isPending ? 'Eksporterer…' : 'Eksporter'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRetentionConfig } from './hooks/useRetentionConfig';
import { formatRetention } from './utils';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string | null;
}

export function RetentionConfigDialog({ open, onOpenChange, organizationId }: Props) {
  const { data, updateRetention, runCleanup } = useRetentionConfig(organizationId);
  const { toast } = useToast();
  const [days, setDays] = useState<number>(data?.recruitment_audit_retention_days ?? 1095);

  // Sync local state when data loads
  if (data && days === 1095 && data.recruitment_audit_retention_days !== 1095) {
    setDays(data.recruitment_audit_retention_days);
  }

  const handleSave = async () => {
    if (days < 30 || days > 7300) {
      toast({ title: 'Ugyldig verdi', description: 'Må være mellom 30 og 7300 dager.', variant: 'destructive' });
      return;
    }
    try {
      await updateRetention.mutateAsync(days);
      toast({ title: 'Lagret', description: `Oppbevaringstid satt til ${formatRetention(days)}.` });
    } catch (e) {
      toast({ title: 'Feil', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const handleCleanup = async () => {
    try {
      const count = await runCleanup.mutateAsync();
      toast({ title: 'Opprydding fullført', description: `${count} hendelser slettet.` });
    } catch (e) {
      toast({ title: 'Feil', description: (e as Error).message, variant: 'destructive' });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Innstillinger for revisjon</SheetTitle>
          <SheetDescription>
            Konfigurer hvor lenge revisjonshendelser oppbevares før de slettes automatisk.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          <div className="space-y-2">
            <Label htmlFor="retention-days">Oppbevaringstid (dager)</Label>
            <Input
              id="retention-days"
              type="number"
              min={30}
              max={7300}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Tilsvarer {formatRetention(days)}. Min 30 dager, maks 20 år.
            </p>
          </div>

          <div className="rounded-md border p-3 space-y-1">
            <div className="text-xs text-muted-foreground">Siste opprydding</div>
            <div className="text-sm font-medium">
              {data?.recruitment_audit_last_cleanup_at
                ? new Date(data.recruitment_audit_last_cleanup_at).toLocaleString('nb-NO', { timeZone: 'Europe/Oslo' })
                : 'Aldri kjørt'}
            </div>
          </div>

          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 flex gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Reduserer du oppbevaringstiden, slettes data som er eldre enn ny grense ved neste opprydding.
              Dette kan ikke reverseres.
            </p>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleCleanup}
            disabled={runCleanup.isPending}
          >
            <Trash2 className="h-4 w-4" />
            {runCleanup.isPending ? 'Kjører…' : 'Kjør opprydding nå'}
          </Button>
        </div>

        <SheetFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Avbryt</Button>
          <Button onClick={handleSave} disabled={updateRetention.isPending}>
            {updateRetention.isPending ? 'Lagrer…' : 'Lagre'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

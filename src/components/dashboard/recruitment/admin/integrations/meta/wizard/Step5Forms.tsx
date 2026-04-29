import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2, Inbox } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDiscoverMetaForms } from '../../hooks/useMetaOAuth';
import { useFormPositionMappings } from '../../hooks/useFormPositionMappings';

interface Props {
  integrationId: string;
  onFinish: () => void;
  onBack: () => void;
}

export function Step5Forms({ integrationId, onFinish, onBack }: Props) {
  const { toast } = useToast();
  const discovery = useDiscoverMetaForms(integrationId);
  const { mappings, createMapping } = useFormPositionMappings(integrationId);

  const existingFormIds = useMemo(
    () => new Set(mappings.map((m) => m.form_id)),
    [mappings],
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSaveSelected = async () => {
    if (!discovery.data?.forms || selected.size === 0) {
      onFinish();
      return;
    }
    setBusy(true);
    try {
      for (const id of selected) {
        const form = discovery.data.forms.find((f) => f.id === id);
        if (!form || existingFormIds.has(id)) continue;
        await createMapping.mutateAsync({
          form_id: form.id,
          form_name: form.name || null,
          position_id: null,
        });
      }
      toast({ title: `${selected.size} skjema lagt til` });
      onFinish();
    } catch (e: any) {
      toast({
        title: 'Kunne ikke lagre alle skjemaer',
        description: e?.message,
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Inbox className="h-4 w-4 text-muted-foreground" />
        Velg søknadsskjemaer
      </div>

      {discovery.isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {discovery.data?.scope_missing && (
        <Alert className="border-amber-500/30 bg-amber-500/10">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-700">Kunne ikke hente skjemaer automatisk</AlertTitle>
          <AlertDescription className="text-xs space-y-1">
            <p>
              Vi kunne ikke liste skjemaene fra Facebook fordi tilgangen{' '}
              <code className="font-mono">pages_manage_ads</code> mangler. Det er greit — du kan
              legge inn skjema-IDer manuelt i "Skjemaer"-fanen etterpå.
            </p>
            <p className="text-muted-foreground">
              Lead-mottak fungerer uten denne tilgangen.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {discovery.error && !discovery.data?.scope_missing && (
        <Alert className="border-destructive/30 bg-destructive/10">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-xs">
            {(discovery.error as any)?.message ?? 'Kunne ikke hente skjemaer'}
          </AlertDescription>
        </Alert>
      )}

      {discovery.data?.forms && discovery.data.forms.length === 0 && (
        <div className="rounded-md border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
          Ingen skjemaer funnet på denne siden ennå. Du kan legge til mappinger senere fra
          "Skjemaer"-fanen.
        </div>
      )}

      {discovery.data?.forms && discovery.data.forms.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">
            Vi har funnet {discovery.data.forms.length} skjema. Velg de du vil motta søknader fra
            (du kan koble dem til konkrete stillinger senere).
          </p>
          {discovery.data.forms.map((form) => {
            const already = existingFormIds.has(form.id);
            return (
              <label
                key={form.id}
                className={
                  'flex items-center gap-3 rounded-md border p-3 ' +
                  (already ? 'bg-muted/30 cursor-not-allowed' : 'cursor-pointer hover:bg-muted/40')
                }
              >
                <Checkbox
                  checked={already || selected.has(form.id)}
                  disabled={already}
                  onCheckedChange={() => toggle(form.id)}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{form.name || '(uten navn)'}</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    ID: {form.id}
                    {form.status && <span className="ml-2 uppercase">· {form.status}</span>}
                  </div>
                </div>
                {already && (
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    allerede mappet
                  </span>
                )}
              </label>
            );
          })}
        </div>
      )}

      <div className="flex justify-between gap-2 pt-2">
        <Button variant="outline" onClick={onBack} disabled={busy}>
          Tilbake
        </Button>
        <Button onClick={handleSaveSelected} disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {selected.size > 0 ? `Lagre ${selected.size} og fullfør` : 'Fullfør'}
        </Button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFormPositionMappings } from '../hooks/useFormPositionMappings';
import { useJobPositions } from '@/components/dashboard/recruitment/positions/usePositions';
import type { MetaIntegration } from '../types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integration: MetaIntegration | null;
}

export function MetaFormMappingDialog({ open, onOpenChange, integration }: Props) {
  const { toast } = useToast();
  const { mappings, createMapping, updateMapping, deleteMapping } = useFormPositionMappings(
    integration?.id ?? null,
  );
  const { data: positions } = useJobPositions();
  const openPositions = (positions ?? []).filter((p) => p.status === 'open');

  const [newFormId, setNewFormId] = useState('');
  const [newFormName, setNewFormName] = useState('');
  const [newPositionId, setNewPositionId] = useState<string>('');

  const handleAdd = async () => {
    if (!newFormId.trim()) {
      toast({ title: 'Form ID er påkrevd', variant: 'destructive' });
      return;
    }
    try {
      await createMapping.mutateAsync({
        form_id: newFormId.trim(),
        form_name: newFormName.trim() || null,
        position_id: newPositionId || null,
      });
      setNewFormId('');
      setNewFormName('');
      setNewPositionId('');
      toast({ title: 'Skjema lagt til' });
    } catch (e: any) {
      toast({ title: 'Kunne ikke legge til', description: e?.message, variant: 'destructive' });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Administrer Meta-skjemaer</SheetTitle>
          <SheetDescription>
            Map Meta Lead Ad-skjema-IDer til stillinger. Innkommende leads opprettes som søkere på riktig stilling.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Eksisterende mappinger ({mappings.length})</h4>
            {mappings.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-md border bg-muted/30 px-3 py-4 text-center">
                Ingen skjemaer mappet ennå.
              </p>
            ) : (
              <div className="space-y-2">
                {mappings.map((m) => (
                  <div key={m.id} className="rounded-md border p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Form name</Label>
                        <Input
                          value={m.form_name ?? ''}
                          placeholder="(uten navn)"
                          onChange={(e) =>
                            updateMapping.mutate({ id: m.id, form_name: e.target.value || null })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Form ID</Label>
                        <Input value={m.form_id} readOnly className="font-mono text-xs" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Stilling</Label>
                      <Select
                        value={m.position_id ?? ''}
                        onValueChange={(v) =>
                          updateMapping.mutate({ id: m.id, position_id: v || null })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Velg stilling" />
                        </SelectTrigger>
                        <SelectContent>
                          {openPositions.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={m.is_active}
                          onCheckedChange={(v) => updateMapping.mutate({ id: m.id, is_active: v })}
                        />
                        <Label className="text-xs">Aktiv</Label>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMapping.mutate(m.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Slett
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-md border bg-muted/30 p-3">
            <h4 className="text-sm font-medium">Legg til skjema</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Form name (valgfritt)</Label>
                <Input
                  value={newFormName}
                  onChange={(e) => setNewFormName(e.target.value)}
                  placeholder="Sommer-kampanje 2026"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Form ID</Label>
                <Input
                  value={newFormId}
                  onChange={(e) => setNewFormId(e.target.value)}
                  placeholder="123456789012345"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Stilling</Label>
              <Select value={newPositionId} onValueChange={setNewPositionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg stilling" />
                </SelectTrigger>
                <SelectContent>
                  {openPositions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={handleAdd} disabled={createMapping.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              Legg til skjema
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
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
import { useCustomFieldTypes } from '@/hooks/recruitment/useCustomFieldTypes';
import {
  useCreateCustomField,
  useUpdateCustomField,
  type CustomFieldWithType,
} from '@/hooks/recruitment/useCustomFields';
import type { MetaFormQuestion } from '../integrations/types';
import { extractMetaOptions, inferFieldTypeKeyFromMeta } from '@/lib/recruitment/optionSync';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  field?: CustomFieldWithType | null;
  defaultDisplayName?: string;
  metaQuestion?: MetaFormQuestion | null;
  onCreated?: (created: { id: string; field_key: string; display_name: string }) => void;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'oe')
    .replace(/å/g, 'aa')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 60);
}

export function CustomFieldDialog({
  open,
  onOpenChange,
  field,
  defaultDisplayName,
  onCreated,
}: Props) {
  const { toast } = useToast();
  const { data: types = [] } = useCustomFieldTypes();
  const create = useCreateCustomField();
  const update = useUpdateCustomField();

  const [displayName, setDisplayName] = useState('');
  const [fieldKey, setFieldKey] = useState('');
  const [keyTouched, setKeyTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [typeId, setTypeId] = useState<string>('');
  const [isRequired, setIsRequired] = useState(false);
  const [showOnCard, setShowOnCard] = useState(false);
  const [showOnProfile, setShowOnProfile] = useState(true);
  const [options, setOptions] = useState<Array<{ value: string; label_no: string }>>([]);
  const [validationOverrides, setValidationOverrides] = useState<string>('');

  const selectedType = useMemo(() => types.find((t) => t.id === typeId), [types, typeId]);
  const supportsOptions = !!selectedType?.supports_options;

  useEffect(() => {
    if (!open) return;
    if (field) {
      setDisplayName(field.display_name);
      setFieldKey(field.field_key);
      setKeyTouched(true);
      setDescription(field.description ?? '');
      setTypeId(field.type_id);
      setIsRequired(field.is_required);
      setShowOnCard(field.show_on_card);
      setShowOnProfile(field.show_on_profile);
      setOptions(
        Array.isArray(field.options)
          ? field.options.map((o) => ({ value: o.value, label_no: o.label_no ?? o.value }))
          : [],
      );
      setValidationOverrides(
        field.validation_overrides ? JSON.stringify(field.validation_overrides, null, 2) : '',
      );
    } else {
      const initial = defaultDisplayName ?? '';
      setDisplayName(initial);
      setFieldKey(initial ? slugify(initial) : '');
      setKeyTouched(false);
      setDescription('');
      setTypeId('');
      setIsRequired(false);
      setShowOnCard(false);
      setShowOnProfile(true);
      setOptions([]);
      setValidationOverrides('');
    }
  }, [open, field, defaultDisplayName]);

  useEffect(() => {
    if (!field && !keyTouched) {
      setFieldKey(displayName ? slugify(displayName) : '');
    }
  }, [displayName, keyTouched, field]);

  const handleSubmit = async () => {
    if (!displayName.trim()) {
      toast({ title: 'Visningsnavn er påkrevd', variant: 'destructive' });
      return;
    }
    if (!fieldKey.trim()) {
      toast({ title: 'Feltnøkkel er påkrevd', variant: 'destructive' });
      return;
    }
    if (!typeId) {
      toast({ title: 'Velg felttype', variant: 'destructive' });
      return;
    }
    let parsedOverrides: Record<string, unknown> | null = null;
    if (validationOverrides.trim()) {
      try {
        parsedOverrides = JSON.parse(validationOverrides);
      } catch {
        toast({ title: 'Validering: ugyldig JSON', variant: 'destructive' });
        return;
      }
    }

    const payload = {
      field_key: fieldKey.trim(),
      display_name: displayName.trim(),
      description: description.trim() || null,
      type_id: typeId,
      options: supportsOptions ? options.filter((o) => o.value.trim()) : null,
      validation_overrides: parsedOverrides,
      is_required: isRequired,
      show_on_card: showOnCard,
      show_on_profile: showOnProfile,
    };

    try {
      if (field) {
        await update.mutateAsync({ id: field.id, ...payload });
        toast({ title: 'Felt oppdatert' });
      } else {
        const created = await create.mutateAsync(payload);
        toast({ title: 'Felt opprettet' });
        if (onCreated && created) {
          onCreated({
            id: (created as any).id,
            field_key: (created as any).field_key,
            display_name: (created as any).display_name,
          });
        }
      }
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: 'Lagring feilet',
        description: e?.message ?? 'Ukjent feil',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{field ? 'Rediger egendefinert felt' : 'Nytt egendefinert felt'}</DialogTitle>
          <DialogDescription>
            Egendefinerte felt lagres på søkere og kan brukes i skjema-mappinger og rapporter.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Visningsnavn</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="f.eks. Antall års erfaring"
              />
            </div>
            <div className="space-y-1">
              <Label>Feltnøkkel</Label>
              <Input
                value={fieldKey}
                onChange={(e) => {
                  setKeyTouched(true);
                  setFieldKey(e.target.value);
                }}
                placeholder="years_experience"
                className="font-mono text-sm"
                disabled={!!field}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Beskrivelse (valgfritt)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-1">
            <Label>Felttype</Label>
            <Select value={typeId} onValueChange={setTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Velg felttype" />
              </SelectTrigger>
              <SelectContent>
                {types.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.display_name_no}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {supportsOptions && (
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Valg</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setOptions([...options, { value: '', label_no: '' }])}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Legg til
                </Button>
              </div>
              {options.length === 0 ? (
                <p className="text-xs text-muted-foreground">Ingen valg lagt til ennå.</p>
              ) : (
                <div className="space-y-2">
                  {options.map((opt, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        placeholder="Verdi (f.eks. yes)"
                        value={opt.value}
                        onChange={(e) => {
                          const next = [...options];
                          next[idx] = { ...next[idx], value: e.target.value };
                          setOptions(next);
                        }}
                        className="font-mono text-xs"
                      />
                      <Input
                        placeholder="Etikett (norsk)"
                        value={opt.label_no}
                        onChange={(e) => {
                          const next = [...options];
                          next[idx] = { ...next[idx], label_no: e.target.value };
                          setOptions(next);
                        }}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => setOptions(options.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Validering — overstyringer (JSON, valgfritt)</Label>
            <Textarea
              value={validationOverrides}
              onChange={(e) => setValidationOverrides(e.target.value)}
              placeholder={selectedType ? JSON.stringify(selectedType.validation_schema) : '{}'}
              rows={3}
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Overstyrer felttypens standardvalidering. Tom = bruk standard.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2 border-t">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm">Påkrevd</Label>
              <Switch checked={isRequired} onCheckedChange={setIsRequired} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm">Vis på kort</Label>
              <Switch checked={showOnCard} onCheckedChange={setShowOnCard} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm">Vis på profil</Label>
              <Switch checked={showOnProfile} onCheckedChange={setShowOnProfile} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button onClick={handleSubmit} disabled={create.isPending || update.isPending}>
            {field ? 'Lagre endringer' : 'Opprett felt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

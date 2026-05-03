import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, Trash2, ArrowUp, ArrowDown, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useFieldMappingTemplate,
  useFieldMappingTemplateItems,
  useCreateTemplateItem,
  useUpdateTemplate,
  useUpdateTemplateItem,
  useDeleteTemplateItem,
} from '@/hooks/recruitment/useFieldMappingTemplates';
import type {
  FieldMappingTemplateItem,
  TargetKind,
} from '@/components/dashboard/recruitment/admin/integrations/types';

const STANDARD_FIELDS: Array<{ value: 'full_name' | 'email' | 'phone_number'; label: string }> = [
  { value: 'full_name', label: 'Fullt navn' },
  { value: 'email', label: 'E-post' },
  { value: 'phone_number', label: 'Telefon' },
];

interface Props {
  templateId: string;
}

export function TemplateEditor({ templateId }: Props) {
  const tplQ = useFieldMappingTemplate(templateId);
  const itemsQ = useFieldMappingTemplateItems(templateId);
  const updateTpl = useUpdateTemplate();
  const createItem = useCreateTemplateItem();
  const updateItem = useUpdateTemplateItem();
  const deleteItem = useDeleteTemplateItem();
  const { toast } = useToast();

  const { data: typesData } = useQuery({
    queryKey: ['recruitment-custom-field-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recruitment_custom_field_types')
        .select('type_key, display_name_no');
      if (error) throw error;
      return data ?? [];
    },
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [roleHint, setRoleHint] = useState('');
  const [initialised, setInitialised] = useState(false);

  React.useEffect(() => {
    if (tplQ.data && !initialised) {
      setName(tplQ.data.name);
      setDescription(tplQ.data.description ?? '');
      setRoleHint(tplQ.data.target_role_hint ?? '');
      setInitialised(true);
    }
  }, [tplQ.data, initialised]);

  const handleSaveMeta = async () => {
    try {
      await updateTpl.mutateAsync({
        id: templateId,
        name,
        description: description || null,
        target_role_hint: roleHint || null,
      });
      toast({ title: 'Mal lagret' });
    } catch (e: any) {
      toast({ title: 'Lagring feilet', description: e?.message, variant: 'destructive' });
    }
  };

  const items = itemsQ.data ?? [];
  const handleAddItem = async () => {
    try {
      await createItem.mutateAsync({
        template_id: templateId,
        meta_question_pattern: '',
        target_kind: 'standard',
        target_standard_field: 'full_name',
        target_custom_field_key: null,
        target_custom_field_type_key: null,
        display_order: items.length,
      });
    } catch (e: any) {
      toast({ title: 'Kunne ikke legge til', description: e?.message, variant: 'destructive' });
    }
  };

  const move = async (item: FieldMappingTemplateItem, dir: -1 | 1) => {
    const idx = items.findIndex((i) => i.id === item.id);
    const swap = items[idx + dir];
    if (!swap) return;
    await Promise.all([
      updateItem.mutateAsync({ id: item.id, template_id: templateId, display_order: swap.display_order }),
      updateItem.mutateAsync({ id: swap.id, template_id: templateId, display_order: item.display_order }),
    ]);
  };

  if (tplQ.isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }
  if (!tplQ.data) {
    return <p className="text-sm text-muted-foreground">Mal ikke funnet.</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detaljer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Navn</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Anbefalt for rolle (valgfritt)</Label>
              <Input value={roleHint} onChange={(e) => setRoleHint(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Beskrivelse</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSaveMeta} disabled={updateTpl.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Lagre detaljer
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Elementer ({items.length})</CardTitle>
            <Button size="sm" onClick={handleAddItem}>
              <Plus className="h-4 w-4 mr-2" />
              Nytt element
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {itemsQ.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ingen elementer ennå. Hver oppføring matcher et spørsmål i Meta-skjemaet og bestemmer
              hvor svaret havner.
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((it, idx) => (
                <ItemRow
                  key={it.id}
                  item={it}
                  templateId={templateId}
                  typeOptions={typesData ?? []}
                  isFirst={idx === 0}
                  isLast={idx === items.length - 1}
                  onMove={(dir) => move(it, dir)}
                  onUpdate={(patch) =>
                    updateItem.mutate({ id: it.id, template_id: templateId, ...patch })
                  }
                  onDelete={() => deleteItem.mutate({ id: it.id, template_id: templateId })}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface ItemRowProps {
  item: FieldMappingTemplateItem;
  templateId: string;
  typeOptions: Array<{ type_key: string; display_name_no: string }>;
  isFirst: boolean;
  isLast: boolean;
  onMove: (dir: -1 | 1) => void;
  onUpdate: (patch: Partial<FieldMappingTemplateItem>) => void;
  onDelete: () => void;
}

function ItemRow({
  item,
  typeOptions,
  isFirst,
  isLast,
  onMove,
  onUpdate,
  onDelete,
}: ItemRowProps) {
  const [pattern, setPattern] = useState(item.meta_question_pattern);
  const [customKey, setCustomKey] = useState(item.target_custom_field_key ?? '');

  React.useEffect(() => {
    setPattern(item.meta_question_pattern);
    setCustomKey(item.target_custom_field_key ?? '');
  }, [item.id]);

  return (
    <div className="rounded-md border p-3 space-y-3">
      <div className="flex items-start gap-2">
        <div className="flex flex-col gap-0.5 pt-1">
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" disabled={isFirst} onClick={() => onMove(-1)}>
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" disabled={isLast} onClick={() => onMove(1)}>
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex-1 space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">Mønster for spørsmålet i Meta-skjemaet</Label>
            <Input
              value={pattern}
              placeholder="f.eks. Hva heter du?"
              onChange={(e) => setPattern(e.target.value)}
              onBlur={() => {
                if (pattern !== item.meta_question_pattern) {
                  onUpdate({ meta_question_pattern: pattern });
                }
              }}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Mål</Label>
            <RadioGroup
              value={item.target_kind}
              onValueChange={(v) => onUpdate({ target_kind: v as TargetKind })}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem id={`${item.id}-std`} value="standard" />
                <Label htmlFor={`${item.id}-std`} className="text-xs">Standardfelt</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem id={`${item.id}-cust`} value="custom" />
                <Label htmlFor={`${item.id}-cust`} className="text-xs">Egendefinert felt</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem id={`${item.id}-meta`} value="metadata_only" />
                <Label htmlFor={`${item.id}-meta`} className="text-xs">Kun metadata (ikke lagre svar)</Label>
              </div>
            </RadioGroup>
          </div>

          {item.target_kind === 'standard' && (
            <div className="space-y-1">
              <Label className="text-xs">Standardfelt</Label>
              <Select
                value={item.target_standard_field ?? ''}
                onValueChange={(v) =>
                  onUpdate({
                    target_standard_field: v as 'full_name' | 'email' | 'phone_number',
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Velg felt" />
                </SelectTrigger>
                <SelectContent>
                  {STANDARD_FIELDS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {item.target_kind === 'custom' && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Feltnøkkel (field_key)</Label>
                <Input
                  value={customKey}
                  placeholder="f.eks. years_experience"
                  onChange={(e) => setCustomKey(e.target.value)}
                  onBlur={() => {
                    if (customKey !== (item.target_custom_field_key ?? '')) {
                      onUpdate({ target_custom_field_key: customKey || null });
                    }
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Felttype (type_key)</Label>
                <Select
                  value={item.target_custom_field_type_key ?? ''}
                  onValueChange={(v) => onUpdate({ target_custom_field_type_key: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Velg type" />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((t) => (
                      <SelectItem key={t.type_key} value={t.type_key}>
                        {t.display_name_no}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

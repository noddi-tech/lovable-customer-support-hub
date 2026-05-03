import React, { useMemo, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, Plus, Save, Sparkles, FileText, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFormQuestions } from '@/hooks/recruitment/useFormQuestions';
import {
  useFormFieldMappings,
  useUpsertFormFieldMappings,
} from '@/hooks/recruitment/useFormFieldMappings';
import { useCustomFields } from '@/hooks/recruitment/useCustomFields';
import {
  useFieldMappingTemplates,
  useFieldMappingTemplateItems,
  useCreateTemplate,
  useCreateTemplateItem,
} from '@/hooks/recruitment/useFieldMappingTemplates';
import { findBestMatch } from '@/lib/recruitment/fuzzyMatch';
import { CustomFieldDialog } from '../../fields/CustomFieldDialog';
import type {
  FormFieldMapping,
  MetaFormQuestion,
  StandardField,
  TargetKind,
  FieldMappingTemplateItem,
} from '../types';

interface Props {
  formMappingId: string;
  formName: string | null;
  onReconnectClick?: () => void;
}

interface RowState {
  meta_question_id: string;
  meta_question_text: string;
  target_kind: TargetKind;
  target_standard_field: StandardField | null;
  target_custom_field_id: string | null;
}

const STANDARD_FIELDS: Array<{ value: StandardField; label: string }> = [
  { value: 'full_name', label: 'Fullt navn' },
  { value: 'email', label: 'E-post' },
  { value: 'phone_number', label: 'Telefon' },
];

const STANDARD_HINTS: Array<{ field: StandardField; needles: string[] }> = [
  { field: 'full_name', needles: ['navn', 'name', 'fornavn', 'etternavn', 'full name'] },
  { field: 'email', needles: ['epost', 'e-post', 'email', 'mail'] },
  { field: 'phone_number', needles: ['telefon', 'phone', 'mobil', 'tlf'] },
];

function autoSuggest(
  questionText: string,
  customFields: Array<{ id: string; field_key: string; display_name: string }>,
): Partial<RowState> {
  const lower = questionText.toLowerCase();
  for (const hint of STANDARD_HINTS) {
    if (hint.needles.some((n) => lower.includes(n))) {
      return { target_kind: 'standard', target_standard_field: hint.field };
    }
  }
  const match = findBestMatch(
    questionText,
    customFields,
    (f) => `${f.display_name} ${f.field_key}`,
    0.7,
  );
  if (match) {
    return { target_kind: 'custom', target_custom_field_id: match.item.id };
  }
  return { target_kind: 'metadata_only' };
}

export function FormMappingEditor({ formMappingId, formName, onReconnectClick }: Props) {
  const questionsQ = useFormQuestions(formMappingId);
  const existingQ = useFormFieldMappings(formMappingId);
  const customFieldsQ = useCustomFields();
  const upsert = useUpsertFormFieldMappings();
  const { toast } = useToast();

  const [createFieldOpen, setCreateFieldOpen] = useState(false);
  const [createFieldDefault, setCreateFieldDefault] = useState<string>('');
  const [pendingFieldRowKey, setPendingFieldRowKey] = useState<string | null>(null);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);

  const customFields = customFieldsQ.data ?? [];
  const questions: MetaFormQuestion[] = questionsQ.data?.questions ?? [];
  const scopeMissing = !!questionsQ.data?.scope_missing;

  // Build per-row state. Key by meta_question_id (or label fallback).
  const initialRows: Record<string, RowState> = useMemo(() => {
    if (!questions.length) return {};
    const existingByQ = new Map<string, FormFieldMapping>();
    for (const m of existingQ.data ?? []) existingByQ.set(m.meta_question_id, m);
    const out: Record<string, RowState> = {};
    for (const q of questions) {
      const qid = q.id ?? q.key ?? q.label;
      const e = existingByQ.get(qid);
      if (e) {
        out[qid] = {
          meta_question_id: qid,
          meta_question_text: q.label,
          target_kind: e.target_kind,
          target_standard_field: e.target_standard_field,
          target_custom_field_id: e.target_custom_field_id,
        };
      } else {
        const sug = autoSuggest(q.label, customFields);
        out[qid] = {
          meta_question_id: qid,
          meta_question_text: q.label,
          target_kind: (sug.target_kind ?? 'metadata_only') as TargetKind,
          target_standard_field: sug.target_standard_field ?? null,
          target_custom_field_id: sug.target_custom_field_id ?? null,
        };
      }
    }
    return out;
  }, [questions, existingQ.data, customFields]);

  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [initialised, setInitialised] = useState(false);
  React.useEffect(() => {
    if (!initialised && questions.length > 0) {
      setRows(initialRows);
      setInitialised(true);
    }
  }, [initialised, initialRows, questions.length]);

  const updateRow = (qid: string, patch: Partial<RowState>) => {
    setRows((prev) => ({ ...prev, [qid]: { ...prev[qid], ...patch } }));
  };

  const handleSave = async () => {
    try {
      await upsert.mutateAsync(
        Object.values(rows).map((r, idx) => ({
          form_mapping_id: formMappingId,
          meta_question_id: r.meta_question_id,
          meta_question_text: r.meta_question_text,
          target_kind: r.target_kind,
          target_standard_field:
            r.target_kind === 'standard' ? r.target_standard_field ?? null : null,
          target_custom_field_id:
            r.target_kind === 'custom' ? r.target_custom_field_id ?? null : null,
          display_order: idx,
        })),
      );
      toast({ title: 'Tilordninger lagret' });
    } catch (e: any) {
      toast({ title: 'Lagring feilet', description: e?.message, variant: 'destructive' });
    }
  };

  if (scopeMissing) {
    return (
      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm space-y-2">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium">
          <AlertTriangle className="h-4 w-4" />
          Mangler pages_manage_ads-tilgang
        </div>
        <p className="text-muted-foreground">
          Vi kan ikke hente skjemafeltene fra Meta uten denne tilgangen. Koble til på nytt for å hente
          skjemafelt automatisk.
        </p>
        {onReconnectClick && (
          <Button size="sm" variant="outline" onClick={onReconnectClick}>
            Koble til på nytt
          </Button>
        )}
      </div>
    );
  }

  if (questionsQ.isLoading || existingQ.isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  if (questionsQ.error || (questionsQ.data?.error && !questions.length)) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        Kunne ikke hente spørsmål fra Meta-skjemaet.{' '}
        {(questionsQ.error as any)?.message ?? questionsQ.data?.error}
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground rounded-md border bg-muted/30 px-3 py-4">
        Ingen spørsmål funnet i dette skjemaet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          {questions.length} spørsmål · automatisk forslag basert på spørsmålstekst
        </div>
        <div className="flex gap-2">
          <ApplyTemplateButton onSelectTemplate={setPreviewTemplateId} />
          <SaveAsTemplateButton rows={Object.values(rows)} formName={formName} customFields={customFields} />
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setCreateFieldDefault('');
              setPendingFieldRowKey(null);
              setCreateFieldOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Nytt egendefinert felt
          </Button>
          <Button size="sm" onClick={handleSave} disabled={upsert.isPending}>
            <Save className="h-3.5 w-3.5 mr-1" />
            Lagre tilordninger
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {questions.map((q) => {
          const qid = q.id ?? q.key ?? q.label;
          const r = rows[qid];
          if (!r) return null;
          const suggestion = autoSuggest(q.label, customFields);
          return (
            <div key={qid} className="rounded-md border p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-medium flex-1">{q.label}</div>
                {suggestion.target_kind === 'standard' && (
                  <Badge variant="outline" className="text-[10px]">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Foreslått: standard
                  </Badge>
                )}
                {suggestion.target_kind === 'custom' && (
                  <Badge variant="outline" className="text-[10px]">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Foreslått: egendefinert
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Mål
                  </Label>
                  <Select
                    value={r.target_kind}
                    onValueChange={(v) =>
                      updateRow(qid, {
                        target_kind: v as TargetKind,
                        target_standard_field: null,
                        target_custom_field_id: null,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standardfelt</SelectItem>
                      <SelectItem value="custom">Egendefinert felt</SelectItem>
                      <SelectItem value="metadata_only">Kun metadata</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Felt
                  </Label>
                  {r.target_kind === 'standard' ? (
                    <Select
                      value={r.target_standard_field ?? ''}
                      onValueChange={(v) =>
                        updateRow(qid, { target_standard_field: v as StandardField })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Velg standardfelt" />
                      </SelectTrigger>
                      <SelectContent>
                        {STANDARD_FIELDS.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : r.target_kind === 'custom' ? (
                    <div className="flex gap-1">
                      <Select
                        value={r.target_custom_field_id ?? ''}
                        onValueChange={(v) => updateRow(qid, { target_custom_field_id: v })}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Velg egendefinert felt" />
                        </SelectTrigger>
                        <SelectContent>
                          {customFields.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.display_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Opprett nytt felt"
                        onClick={() => {
                          setCreateFieldDefault(q.label);
                          setPendingFieldRowKey(qid);
                          setCreateFieldOpen(true);
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic h-9 flex items-center">
                      Lagres ikke som strukturert svar
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <CustomFieldDialog
        open={createFieldOpen}
        onOpenChange={setCreateFieldOpen}
        defaultDisplayName={createFieldDefault}
        onCreated={(created) => {
          if (pendingFieldRowKey) {
            updateRow(pendingFieldRowKey, {
              target_kind: 'custom',
              target_custom_field_id: created.id,
            });
          }
        }}
      />

      <ApplyTemplatePreviewDialog
        open={!!previewTemplateId}
        templateId={previewTemplateId}
        rows={rows}
        customFields={customFields}
        onClose={() => setPreviewTemplateId(null)}
        onApply={(updates) => {
          setRows((prev) => {
            const next = { ...prev };
            for (const u of updates) {
              if (next[u.qid]) next[u.qid] = { ...next[u.qid], ...u.patch };
            }
            return next;
          });
          setPreviewTemplateId(null);
        }}
      />
    </div>
  );
}

// ─── Apply template (with preview) ─────────────────────────────────────

function ApplyTemplateButton({
  onSelectTemplate,
}: {
  onSelectTemplate: (id: string) => void;
}) {
  const tplsQ = useFieldMappingTemplates('all');

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline">
          <FileText className="h-3.5 w-3.5 mr-1" />
          Bruk mal
          <ChevronDown className="h-3.5 w-3.5 ml-1 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Velg mal</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {(tplsQ.data ?? []).length === 0 ? (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            Ingen maler tilgjengelig
          </div>
        ) : (
          (tplsQ.data ?? []).map((t) => (
            <DropdownMenuItem
              key={t.id}
              onSelect={(e) => {
                e.preventDefault();
                const id = t.id;
                // Defer until after dropdown close cycle to avoid body-lock collision
                setTimeout(() => onSelectTemplate(id), 0);
              }}
            >
              <span className="flex-1">{t.name}</span>
              {t.is_system && (
                <Badge variant="secondary" className="text-[10px]">
                  System
                </Badge>
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface ProposedAssignment {
  qid: string;
  question_text: string;
  template_pattern: string;
  patch: Partial<RowState>;
  description: string;
}

function ApplyTemplatePreviewDialog({
  open,
  templateId,
  rows,
  customFields,
  onClose,
  onApply,
}: {
  open: boolean;
  templateId: string | null;
  rows: Record<string, RowState>;
  customFields: Array<{ id: string; field_key: string }>;
  onClose: () => void;
  onApply: (updates: Array<{ qid: string; patch: Partial<RowState> }>) => void;
}) {
  const itemsQ = useFieldMappingTemplateItems(open ? templateId : null);
  const items = itemsQ.data ?? [];
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const proposed: ProposedAssignment[] = useMemo(() => {
    const allRows = Object.values(rows);
    const out: ProposedAssignment[] = [];
    for (const item of items) {
      const match = findBestMatch(
        item.meta_question_pattern,
        allRows,
        (r) => r.meta_question_text,
        0.7,
      );
      if (!match) continue;
      const cf = item.target_custom_field_key
        ? customFields.find((f) => f.field_key === item.target_custom_field_key)
        : null;
      const patch: Partial<RowState> = {
        target_kind: item.target_kind,
        target_standard_field:
          item.target_kind === 'standard' ? item.target_standard_field : null,
        target_custom_field_id: item.target_kind === 'custom' ? cf?.id ?? null : null,
      };
      let description = '';
      if (item.target_kind === 'standard') {
        const lbl = STANDARD_FIELDS.find((s) => s.value === item.target_standard_field)?.label;
        description = `→ ${lbl ?? item.target_standard_field}`;
      } else if (item.target_kind === 'custom') {
        description = cf
          ? `→ egendefinert «${item.target_custom_field_key}»`
          : `→ egendefinert «${item.target_custom_field_key}» (felt mangler — opprett først)`;
      } else {
        description = '→ kun metadata';
      }
      out.push({
        qid: match.item.meta_question_id,
        question_text: match.item.meta_question_text,
        template_pattern: item.meta_question_pattern,
        patch,
        description,
      });
    }
    return out;
  }, [items, rows, customFields]);

  React.useEffect(() => {
    const init: Record<string, boolean> = {};
    proposed.forEach((p) => {
      init[p.qid] = true;
    });
    setChecked(init);
  }, [proposed]);

  const handleApply = () => {
    const updates = proposed.filter((p) => checked[p.qid]).map((p) => ({ qid: p.qid, patch: p.patch }));
    onApply(updates);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bruk mal</DialogTitle>
          <DialogDescription>
            Følgende tilordninger vil bli satt. Du kan velge bort enkelte før du bekrefter.
          </DialogDescription>
        </DialogHeader>
        {itemsQ.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : proposed.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ingen av elementene i malen matchet spørsmålene i dette skjemaet (terskel 0.7).
          </p>
        ) : (
          <ul className="space-y-2 max-h-80 overflow-y-auto">
            {proposed.map((p) => (
              <li key={p.qid} className="flex items-start gap-3 rounded-md border p-3">
                <Checkbox
                  checked={!!checked[p.qid]}
                  onCheckedChange={(v) => setChecked((c) => ({ ...c, [p.qid]: !!v }))}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1">
                  <div className="text-sm font-medium">{p.question_text}</div>
                  <div className="text-xs text-muted-foreground">
                    matchet mønster «{p.template_pattern}» {p.description}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Avbryt
          </Button>
          <Button
            onClick={handleApply}
            disabled={proposed.length === 0 || !Object.values(checked).some(Boolean)}
          >
            Bruk valgte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Save as template ─────────────────────────────────────────────────

function SaveAsTemplateButton({
  rows,
  formName,
  customFields,
}: {
  rows: RowState[];
  formName: string | null;
  customFields: Array<{ id: string; field_key: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const createTpl = useCreateTemplate();
  const createItem = useCreateTemplateItem();
  const { toast } = useToast();

  React.useEffect(() => {
    if (open) {
      setName(formName ? `Mal fra «${formName}»` : 'Ny mal');
      setDescription('');
    }
  }, [open, formName]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: 'Navn er påkrevd', variant: 'destructive' });
      return;
    }
    try {
      const tpl = await createTpl.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        scope: 'org',
      });
      const tplId = (tpl as any).id;
      let order = 0;
      for (const r of rows) {
        if (r.target_kind === 'metadata_only') {
          order++;
          continue;
        }
        const cf =
          r.target_kind === 'custom' && r.target_custom_field_id
            ? customFields.find((f) => f.id === r.target_custom_field_id)
            : null;
        await createItem.mutateAsync({
          template_id: tplId,
          meta_question_pattern: r.meta_question_text,
          target_kind: r.target_kind,
          target_standard_field: r.target_kind === 'standard' ? r.target_standard_field : null,
          target_custom_field_key: cf?.field_key ?? null,
          target_custom_field_type_key: null,
          display_order: order++,
        });
      }
      toast({ title: 'Mal lagret' });
      setOpen(false);
    } catch (e: any) {
      toast({ title: 'Kunne ikke lagre', description: e?.message, variant: 'destructive' });
    }
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Save className="h-3.5 w-3.5 mr-1" />
        Lagre som mal
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lagre som mal</DialogTitle>
            <DialogDescription>
              Gjenbruk denne tilordningen for andre Meta-skjemaer i organisasjonen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Navn</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Beskrivelse (valgfritt)</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={handleSave} disabled={createTpl.isPending || createItem.isPending}>
              Lagre mal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

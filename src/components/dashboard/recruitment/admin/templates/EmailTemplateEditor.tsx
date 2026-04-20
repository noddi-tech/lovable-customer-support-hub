import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2, Mail, Send, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  templateFormSchema,
  type TemplateFormValues,
  type EmailTemplate,
  NEW_TEMPLATE_DEFAULTS,
} from './types';
import { EmailTemplateTipTap } from './EmailTemplateTipTap';
import { EmailTemplatePreview } from './EmailTemplatePreview';
import { EmailTemplateUsageStats } from './EmailTemplateUsageStats';
import { EmailTemplateDeletedView } from './EmailTemplateDeletedView';
import { MergeFieldDropdown } from './MergeFieldDropdown';
import { PermanentDeleteDialog } from './PermanentDeleteDialog';
import {
  useCreateTemplate,
  useUpdateTemplate,
  useSoftDeleteTemplate,
  useRestoreTemplate,
  useHardDeleteTemplate,
} from './useEmailTemplate';
import { useTestSendTemplate } from './useTestSendTemplate';
import { useDefaultPipeline } from '../pipeline/usePipelineAdmin';
import { useAuth } from '@/hooks/useAuth';
import type { Stage } from '../pipeline/types';

interface Props {
  mode: 'create' | 'edit';
  template: EmailTemplate | null;
  onCreated: (id: string) => void;
  onCancelCreate: () => void;
  onDeleted: () => void;
}

export function EmailTemplateEditor({
  mode,
  template,
  onCreated,
  onCancelCreate,
  onDeleted,
}: Props) {
  const { profile, user } = useAuth();
  const { data: pipeline } = useDefaultPipeline();
  const stages = useMemo(
    () => (pipeline?.stages as unknown as Stage[]) ?? [],
    [pipeline?.stages],
  );
  const orgName = useMemo(() => {
    // Fallback chain: user-known names. Uses pipeline.name as a proxy isn't reliable,
    // so we use a generic placeholder if not derivable from auth.
    return 'Din organisasjon';
  }, []);

  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();
  const softDeleteMutation = useSoftDeleteTemplate();
  const restoreMutation = useRestoreTemplate();
  const hardDeleteMutation = useHardDeleteTemplate();
  const testSendMutation = useTestSendTemplate();

  const isDeleted = !!template?.soft_deleted_at;

  const defaultValues = useMemo<TemplateFormValues>(() => {
    if (mode === 'create' || !template) return NEW_TEMPLATE_DEFAULTS;
    return {
      name: template.name ?? '',
      description: template.description ?? '',
      subject: template.subject ?? '',
      body: template.body ?? '<p></p>',
      stage_trigger: template.stage_trigger,
      is_active: template.is_active,
    };
  }, [mode, template]);

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  // Reset when switching template / mode
  useEffect(() => {
    form.reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValues, template?.id, mode]);

  const subjectRef = useRef<HTMLInputElement>(null);

  const watched = form.watch();
  const isDirty = form.formState.isDirty;
  const isValid = form.formState.isValid;

  const previewValues = useMemo<Record<string, string>>(
    () => ({
      first_name: 'Ola',
      last_name: 'Nordmann',
      position_title: 'Dekkskifter – Oslo',
      company_name: orgName,
      recruiter_name: profile?.full_name || 'Rekrutterer',
      recruiter_email: user?.email || 'rekrutterer@example.no',
      application_link: 'https://example.no/applicants/example-id',
    }),
    [orgName, profile?.full_name, user?.email],
  );

  const [softDeleteOpen, setSoftDeleteOpen] = useState(false);
  const [hardDeleteOpen, setHardDeleteOpen] = useState(false);

  if (isDeleted && template) {
    return (
      <>
        <EmailTemplateDeletedView
          template={template}
          stages={stages}
          previewValues={previewValues}
          onRestore={() => {
            restoreMutation.mutate(template.id, {
              onSuccess: () => toast.success('Mal gjenopprettet.'),
              onError: (e: any) => toast.error(e?.message ?? 'Kunne ikke gjenopprette'),
            });
          }}
          onHardDelete={() => setHardDeleteOpen(true)}
          isRestorePending={restoreMutation.isPending}
        />
        <PermanentDeleteDialog
          open={hardDeleteOpen}
          templateName={template.name}
          onClose={() => setHardDeleteOpen(false)}
          isPending={hardDeleteMutation.isPending}
          onConfirm={() => {
            hardDeleteMutation.mutate(template.id, {
              onSuccess: () => {
                toast.success('Mal slettet permanent.');
                setHardDeleteOpen(false);
                onDeleted();
              },
              onError: (e: any) => toast.error(e?.message ?? 'Kunne ikke slette'),
            });
          }}
        />
      </>
    );
  }

  const onSubmit = (values: TemplateFormValues) => {
    if (mode === 'create') {
      createMutation.mutate(values, {
        onSuccess: (created) => {
          toast.success('Mal opprettet.');
          form.reset(values);
          onCreated(created.id);
        },
        onError: (e: any) => toast.error(e?.message ?? 'Kunne ikke opprette mal'),
      });
    } else if (template) {
      updateMutation.mutate(
        { id: template.id, values },
        {
          onSuccess: () => {
            toast.success('Mal oppdatert.');
            form.reset(values);
          },
          onError: (e: any) => toast.error(e?.message ?? 'Kunne ikke oppdatere'),
        },
      );
    }
  };

  const handleReset = () => {
    if (mode === 'create') {
      onCancelCreate();
    } else {
      form.reset(defaultValues);
    }
  };

  const insertSubjectMergeField = (key: string) => {
    const el = subjectRef.current;
    if (!el) {
      form.setValue('subject', form.getValues('subject') + key, { shouldDirty: true });
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const next = el.value.slice(0, start) + key + el.value.slice(end);
    form.setValue('subject', next, { shouldDirty: true, shouldValidate: true });
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + key.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleTestSend = () => {
    if (!user?.email) {
      toast.error('Mangler din e-postadresse');
      return;
    }
    const subject = substitute(watched.subject, previewValues);
    const html = substitute(watched.body, previewValues);
    toast.message(`Sender testmail til ${user.email}...`);
    testSendMutation.mutate(
      { to: user.email, subject, html, fromName: `${orgName} – Rekruttering (test)` },
      {
        onSuccess: () => toast.success('Testmail sendt. Sjekk innboksen.'),
        onError: (e: any) =>
          toast.error(e?.message ?? 'Kunne ikke sende testmail'),
      },
    );
  };

  const nameLen = (watched.name || '').length;
  const descLen = (watched.description || '').length;

  const canTestSend =
    !isDirty &&
    !!watched.name?.trim() &&
    !!watched.subject?.trim() &&
    !!stripHtml(watched.body || '').trim() &&
    mode === 'edit';

  const testSendDisabledReason = isDirty
    ? 'Lagre endringene dine først.'
    : !watched.name?.trim() || !watched.subject?.trim() || !stripHtml(watched.body || '').trim()
      ? 'Navn, emne og innhold må være fylt ut.'
      : mode === 'create'
        ? 'Lagre malen først.'
        : '';

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            {mode === 'create' ? 'Ny mal' : template?.name || '(uten navn)'}
          </h2>
          <p className="text-xs text-muted-foreground">
            {mode === 'create'
              ? 'Fyll inn feltene under og lagre for å opprette en ny e-postmal.'
              : 'Rediger innhold, emne og utløsere. Endringer lagres når du klikker Lagre.'}
          </p>
        </div>
        {mode === 'edit' && template && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Slett mal"
            title="Slett mal"
            onClick={() => setSoftDeleteOpen(true)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 />
          </Button>
        )}
      </div>

      <EmailTemplateUsageStats templateId={template?.id ?? null} />

      {/* Navn */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="tpl-name" className="text-xs font-medium">
            Navn <span className="text-destructive">*</span>
          </Label>
          {nameLen > 80 && (
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {nameLen}/100
            </span>
          )}
        </div>
        <Input
          id="tpl-name"
          {...form.register('name')}
          placeholder="f.eks. Innkalling til intervju"
          maxLength={100}
        />
        {form.formState.errors.name && (
          <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
        )}
      </div>

      {/* Beskrivelse */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="tpl-desc" className="text-xs font-medium">
            Beskrivelse
          </Label>
          {descLen > 0 && (
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {descLen}/200
            </span>
          )}
        </div>
        <Textarea
          id="tpl-desc"
          rows={2}
          maxLength={200}
          emojiAutocomplete={false}
          value={watched.description ?? ''}
          onChange={(e) =>
            form.setValue('description', e.target.value, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          placeholder="Kort notat om hva malen brukes til..."
        />
        <p className="text-[11px] text-muted-foreground">
          Vises i listen for å hjelpe deg huske hva malen er til.
        </p>
      </div>

      {/* Subject */}
      <div className="space-y-1.5">
        <Label htmlFor="tpl-subject" className="text-xs font-medium">
          Emne <span className="text-destructive">*</span>
        </Label>
        <div className="flex items-stretch gap-2">
          <Input
            id="tpl-subject"
            ref={subjectRef}
            value={watched.subject}
            onChange={(e) =>
              form.setValue('subject', e.target.value, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            placeholder="f.eks. Hei {{first_name}}, vi vil gjerne møte deg"
            className="flex-1"
          />
          <MergeFieldDropdown onInsert={insertSubjectMergeField} size="sm" label="Flettefelt" />
        </div>
        {form.formState.errors.subject && (
          <p className="text-xs text-destructive">{form.formState.errors.subject.message}</p>
        )}
      </div>

      {/* Body */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">
          Innhold <span className="text-destructive">*</span>
        </Label>
        <EmailTemplateTipTap
          value={watched.body}
          onChange={(html) =>
            form.setValue('body', html, { shouldDirty: true, shouldValidate: true })
          }
        />
        {form.formState.errors.body && (
          <p className="text-xs text-destructive">{form.formState.errors.body.message}</p>
        )}
      </div>

      {/* Stage trigger */}
      <div className="space-y-1.5">
        <Label htmlFor="tpl-stage" className="text-xs font-medium">
          Stadium-utløser
        </Label>
        <Select
          value={watched.stage_trigger ?? '__manual__'}
          onValueChange={(v) =>
            form.setValue('stage_trigger', v === '__manual__' ? null : v, {
              shouldDirty: true,
            })
          }
        >
          <SelectTrigger id="tpl-stage">
            <SelectValue placeholder="Velg stadium..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__manual__">
              Manuell (ingen automatisk utløser)
            </SelectItem>
            {stages.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground">
          Når satt, kan denne malen utløses automatisk fra Automatisering-fanen
          (bygges senere).
        </p>
      </div>

      {/* Active */}
      <div className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2">
        <div className="space-y-0.5">
          <Label htmlFor="tpl-active" className="text-xs font-medium">
            Aktiv
          </Label>
          {!watched.is_active && (
            <p className="text-[11px] text-muted-foreground">
              Inaktive maler kan ikke velges ved sending eller automatisering.
            </p>
          )}
        </div>
        <Switch
          id="tpl-active"
          checked={watched.is_active}
          onCheckedChange={(v) =>
            form.setValue('is_active', v, { shouldDirty: true })
          }
        />
      </div>

      {/* Preview */}
      <EmailTemplatePreview
        subject={watched.subject || ''}
        body={watched.body || ''}
        values={previewValues}
      />

      {/* Sticky action bar */}
      <div className="fixed bottom-0 right-0 left-0 lg:left-auto lg:right-6 lg:bottom-6 lg:rounded-md lg:border lg:border-input lg:shadow-lg lg:max-w-2xl lg:w-auto bg-background/95 backdrop-blur border-t border-input px-4 py-3 flex items-center justify-end gap-2 z-20">
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestSend}
                  disabled={!canTestSend || testSendMutation.isPending}
                >
                  <Send />
                  {testSendMutation.isPending ? 'Sender...' : 'Send testmail til meg'}
                </Button>
              </span>
            </TooltipTrigger>
            {testSendDisabledReason && (
              <TooltipContent>{testSendDisabledReason}</TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleReset}
          disabled={!isDirty && mode !== 'create'}
        >
          <RotateCcw />
          Avbryt
        </Button>
        <Button type="submit" size="sm" disabled={!isDirty || !isValid || isSaving}>
          <Save />
          {isSaving ? 'Lagrer...' : 'Lagre endringer'}
        </Button>
      </div>

      {/* Soft delete confirm */}
      <AlertDialog open={softDeleteOpen} onOpenChange={setSoftDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slett mal?</AlertDialogTitle>
            <AlertDialogDescription>
              '{template?.name}' vil bli markert som slettet. Den skjules fra
              standardlisten, men kan gjenopprettes senere. Data beholdes for
              revisjonsformål.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!template) return;
                softDeleteMutation.mutate(template.id, {
                  onSuccess: () => {
                    toast.success(
                      "Mal slettet. Kan gjenopprettes fra filteret 'Slettede'.",
                    );
                    setSoftDeleteOpen(false);
                    onDeleted();
                  },
                  onError: (e: any) =>
                    toast.error(e?.message ?? 'Kunne ikke slette'),
                });
              }}
            >
              <Trash2 />
              Slett
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

// Local re-export to avoid circular imports
import { substituteMergeFields } from './mergeFields';
function substitute(input: string, values: Record<string, string>): string {
  return substituteMergeFields(input, values);
}

// Silence unused-import warning
void Mail;

import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import GDPRRevocationDialog from './GDPRRevocationDialog';
import SourceChangeWarningDialog from './SourceChangeWarningDialog';
import { useUpdateApplicant, EMAIL_CONFLICT, type ApplicantPatch } from '../hooks/useUpdateApplicant';
import {
  editApplicantSchema,
  type EditApplicantFormValues,
  SOURCE_OPTIONS,
  LANGUAGE_OPTIONS,
  PERMIT_OPTIONS,
  LICENSE_CLASSES,
} from './schema';
import type { ApplicantProfileData } from '../useApplicantProfile';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicant: ApplicantProfileData;
}

function diffPatch(before: ApplicantProfileData, values: EditApplicantFormValues): ApplicantPatch {
  const patch: ApplicantPatch = {};
  const norm = (v: any) => (v === '' ? null : v);

  if (values.first_name !== before.first_name) patch.first_name = values.first_name;
  if (values.last_name !== before.last_name) patch.last_name = values.last_name;
  if (values.email !== before.email) patch.email = values.email;
  if (norm(values.phone) !== before.phone) patch.phone = norm(values.phone);
  if (norm(values.location) !== before.location) patch.location = norm(values.location);
  if (values.source !== before.source) patch.source = values.source;

  const beforeLicenses = (before.drivers_license_classes ?? []).slice().sort().join(',');
  const afterLicenses = values.drivers_license_classes.slice().sort().join(',');
  if (beforeLicenses !== afterLicenses) {
    patch.drivers_license_classes = values.drivers_license_classes;
  }

  const yexp = values.years_experience == null || values.years_experience === '' ? null : Number(values.years_experience);
  if (yexp !== before.years_experience) patch.years_experience = yexp;

  const beforeCerts = (before.certifications ?? []).slice().sort().join(',');
  const afterCerts = values.certifications.slice().sort().join(',');
  if (beforeCerts !== afterCerts) patch.certifications = values.certifications;

  if (values.own_vehicle !== before.own_vehicle) patch.own_vehicle = values.own_vehicle;
  if (norm(values.availability_date) !== before.availability_date) {
    patch.availability_date = norm(values.availability_date);
  }
  if (values.language_norwegian !== before.language_norwegian) {
    patch.language_norwegian = values.language_norwegian;
  }
  if (values.work_permit_status !== before.work_permit_status) {
    patch.work_permit_status = values.work_permit_status;
  }
  if (values.gdpr_consent !== before.gdpr_consent) {
    patch.gdpr_consent = values.gdpr_consent;
    if (!values.gdpr_consent) {
      patch.gdpr_consent_at = null;
    }
  }
  return patch;
}

const EditApplicantDialog: React.FC<Props> = ({ open, onOpenChange, applicant }) => {
  const updateMut = useUpdateApplicant();
  const [sourceWarnOpen, setSourceWarnOpen] = useState(false);
  const [gdprDialogOpen, setGdprDialogOpen] = useState(false);
  const [pendingPatch, setPendingPatch] = useState<ApplicantPatch | null>(null);

  const form = useForm<EditApplicantFormValues>({
    resolver: zodResolver(editApplicantSchema) as any,
    defaultValues: {
      first_name: applicant.first_name ?? '',
      last_name: applicant.last_name ?? '',
      email: applicant.email ?? '',
      phone: applicant.phone ?? '',
      location: applicant.location ?? '',
      source: applicant.source ?? 'manual',
      drivers_license_classes: applicant.drivers_license_classes ?? [],
      years_experience: applicant.years_experience ?? ('' as any),
      certifications: applicant.certifications ?? [],
      own_vehicle: applicant.own_vehicle,
      availability_date: applicant.availability_date ?? '',
      language_norwegian: applicant.language_norwegian ?? 'fluent',
      work_permit_status: applicant.work_permit_status ?? 'citizen',
      gdpr_consent: !!applicant.gdpr_consent,
    },
  });

  // Reset whenever a new applicant is opened.
  useEffect(() => {
    if (open) {
      form.reset({
        first_name: applicant.first_name ?? '',
        last_name: applicant.last_name ?? '',
        email: applicant.email ?? '',
        phone: applicant.phone ?? '',
        location: applicant.location ?? '',
        source: applicant.source ?? 'manual',
        drivers_license_classes: applicant.drivers_license_classes ?? [],
        years_experience: applicant.years_experience ?? ('' as any),
        certifications: applicant.certifications ?? [],
        own_vehicle: applicant.own_vehicle,
        availability_date: applicant.availability_date ?? '',
        language_norwegian: applicant.language_norwegian ?? 'fluent',
        work_permit_status: applicant.work_permit_status ?? 'citizen',
        gdpr_consent: !!applicant.gdpr_consent,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, applicant.id]);

  const persist = async (patch: ApplicantPatch) => {
    if (Object.keys(patch).length === 0) {
      onOpenChange(false);
      return;
    }
    try {
      await updateMut.mutateAsync({ id: applicant.id, patch });
      onOpenChange(false);
      setSourceWarnOpen(false);
      setGdprDialogOpen(false);
      setPendingPatch(null);
    } catch (err: any) {
      if (err?.message === EMAIL_CONFLICT) {
        form.setError('email', { type: 'manual', message: 'E-post er allerede i bruk' });
      }
    }
  };

  const onSubmit = async (values: EditApplicantFormValues) => {
    const patch = diffPatch(applicant, values);
    const sourceChanged = patch.source != null && applicant.source !== patch.source;
    const gdprRevoked = patch.gdpr_consent === false && applicant.gdpr_consent === true;

    if (gdprRevoked) {
      setPendingPatch(patch);
      setGdprDialogOpen(true);
      return;
    }
    if (sourceChanged) {
      setPendingPatch(patch);
      setSourceWarnOpen(true);
      return;
    }
    await persist(patch);
  };

  const licenses = form.watch('drivers_license_classes') ?? [];
  const toggleLicense = (cls: string) => {
    const set = new Set(licenses);
    if (set.has(cls)) set.delete(cls);
    else set.add(cls);
    form.setValue('drivers_license_classes', Array.from(set), { shouldDirty: true });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Rediger søker</DialogTitle>
            <DialogDescription>
              Endringer logges automatisk i revisjonsloggen.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Kontaktinfo */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Kontaktinfo</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-first-name">
                    Fornavn <span className="text-destructive">*</span>
                  </Label>
                  <Input id="edit-first-name" {...form.register('first_name')} />
                  {form.formState.errors.first_name && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.first_name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-last-name">
                    Etternavn <span className="text-destructive">*</span>
                  </Label>
                  <Input id="edit-last-name" {...form.register('last_name')} />
                  {form.formState.errors.last_name && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.last_name.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-email">
                    E-post <span className="text-destructive">*</span>
                  </Label>
                  <Input id="edit-email" type="email" {...form.register('email')} />
                  {form.formState.errors.email && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Telefon</Label>
                  <Input id="edit-phone" {...form.register('phone')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-location">Sted</Label>
                  <Input id="edit-location" {...form.register('location')} />
                </div>
                <div className="space-y-2">
                  <Label>Kilde</Label>
                  <Controller
                    control={form.control}
                    name="source"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SOURCE_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Kvalifikasjoner */}
            <div className="border-t pt-4 space-y-3">
              <h4 className="text-sm font-semibold">Kvalifikasjoner</h4>
              <div className="space-y-2">
                <Label>Førerkortklasser</Label>
                <div className="grid grid-cols-4 gap-2">
                  {LICENSE_CLASSES.map((cls) => (
                    <label key={cls} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox
                        checked={licenses.includes(cls)}
                        onCheckedChange={() => toggleLicense(cls)}
                      />
                      <span>{cls}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-years">Års erfaring</Label>
                  <Input
                    id="edit-years"
                    type="number"
                    min={0}
                    {...form.register('years_experience')}
                  />
                </div>
                <div className="space-y-2 flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <Controller
                      control={form.control}
                      name="own_vehicle"
                      render={({ field }) => (
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={(c) => field.onChange(c === true)}
                        />
                      )}
                    />
                    <span>Egen bil</span>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Norsk nivå</Label>
                  <Controller
                    control={form.control}
                    name="language_norwegian"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGE_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Arbeidstillatelse</Label>
                  <Controller
                    control={form.control}
                    name="work_permit_status"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PERMIT_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Tilgjengelighet */}
            <div className="border-t pt-4 space-y-3">
              <h4 className="text-sm font-semibold">Tilgjengelighet</h4>
              <div className="space-y-2 max-w-xs">
                <Label htmlFor="edit-availability">Tilgjengelig fra</Label>
                <Input
                  id="edit-availability"
                  type="date"
                  {...form.register('availability_date')}
                />
              </div>
            </div>

            {/* GDPR */}
            <div className="border-t pt-4 space-y-2">
              <h4 className="text-sm font-semibold">GDPR</h4>
              <Controller
                control={form.control}
                name="gdpr_consent"
                render={({ field }) => (
                  <label className="flex items-start gap-2 cursor-pointer text-sm">
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(c) => field.onChange(c === true)}
                      className="mt-0.5"
                    />
                    <span>
                      Søkeren har gitt samtykke til behandling av personopplysninger.
                      {applicant.gdpr_consent && !field.value && (
                        <span className="block text-xs text-destructive mt-1">
                          Trekking av samtykke krever bekreftelse.
                        </span>
                      )}
                    </span>
                  </label>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updateMut.isPending}
              >
                Avbryt
              </Button>
              <Button type="submit" disabled={updateMut.isPending || !form.formState.isValid}>
                {updateMut.isPending && <Loader2 className="animate-spin" />}
                Lagre
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <SourceChangeWarningDialog
        open={sourceWarnOpen}
        onOpenChange={(o) => {
          setSourceWarnOpen(o);
          if (!o) setPendingPatch(null);
        }}
        fromValue={applicant.source}
        toValue={pendingPatch?.source ?? applicant.source}
        isPending={updateMut.isPending}
        onConfirm={() => {
          if (pendingPatch) void persist(pendingPatch);
        }}
      />

      <GDPRRevocationDialog
        open={gdprDialogOpen}
        onOpenChange={(o) => {
          setGdprDialogOpen(o);
          if (!o) setPendingPatch(null);
        }}
        isPending={updateMut.isPending}
        onConfirm={() => {
          if (pendingPatch) void persist(pendingPatch);
        }}
      />
    </>
  );
};

export default EditApplicantDialog;

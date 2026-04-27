import { z } from 'zod';

export const SOURCE_OPTIONS = [
  { value: 'manual', label: 'Manuell' },
  { value: 'csv_import', label: 'CSV-import' },
  { value: 'meta_lead_ad', label: 'Meta Lead Ad' },
  { value: 'website', label: 'Nettside' },
  { value: 'finn', label: 'Finn.no' },
  { value: 'referral', label: 'Referanse' },
  { value: 'other', label: 'Annet' },
] as const;

export const LANGUAGE_OPTIONS = [
  { value: 'native', label: 'Morsmål' },
  { value: 'fluent', label: 'Flytende' },
  { value: 'conversational', label: 'Grunnleggende' },
  { value: 'basic', label: 'Noe' },
  { value: 'none', label: 'Ingen' },
] as const;

export const PERMIT_OPTIONS = [
  { value: 'citizen', label: 'Norsk statsborger' },
  { value: 'permanent_resident', label: 'Permanent opphold' },
  { value: 'work_permit', label: 'Arbeidstillatelse' },
  { value: 'needs_sponsorship', label: 'Trenger sponsing' },
] as const;

export const LICENSE_CLASSES = ['B', 'B96', 'BE', 'C1', 'C1E', 'C', 'CE', 'D1', 'D1E', 'D', 'DE'] as const;

export const FILE_TYPE_OPTIONS = [
  { value: 'resume', label: 'CV' },
  { value: 'cover_letter', label: 'Søknadsbrev' },
  { value: 'drivers_license', label: 'Førerkort' },
  { value: 'certification', label: 'Sertifikat' },
  { value: 'id_document', label: 'ID-dokument' },
  { value: 'other', label: 'Annet' },
] as const;

export const editApplicantSchema = z.object({
  first_name: z.string().trim().min(1, 'Fornavn er påkrevd').max(100),
  last_name: z.string().trim().min(1, 'Etternavn er påkrevd').max(100),
  email: z.string().trim().email('Ugyldig e-post').max(255),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  location: z.string().trim().max(200).optional().or(z.literal('')),
  source: z.string().min(1),
  drivers_license_classes: z.array(z.string()).default([]),
  years_experience: z
    .union([z.coerce.number().int().min(0).max(80), z.literal('').transform(() => null), z.null()])
    .optional(),
  certifications: z.array(z.string()).default([]),
  own_vehicle: z.boolean().nullable(),
  availability_date: z.string().optional().or(z.literal('')),
  language_norwegian: z.string().min(1),
  work_permit_status: z.string().min(1),
  gdpr_consent: z.boolean(),
});

export type EditApplicantFormValues = z.infer<typeof editApplicantSchema>;

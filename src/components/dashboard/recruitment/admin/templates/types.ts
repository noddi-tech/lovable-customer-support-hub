import { z } from 'zod';

export interface EmailTemplate {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  subject: string;
  body: string;
  stage_trigger: string | null;
  is_active: boolean;
  soft_deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type TemplateFilter = 'all' | 'active' | 'inactive' | 'deleted';

export const TEMPLATE_FILTER_LABELS: Record<TemplateFilter, string> = {
  all: 'Alle maler',
  active: 'Aktive',
  inactive: 'Inaktive',
  deleted: 'Slettede',
};

export const templateFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Navn er påkrevd')
    .max(100, 'Maks 100 tegn'),
  description: z.string().max(200, 'Maks 200 tegn').nullable().optional(),
  subject: z.string().min(1, 'Emne er påkrevd'),
  body: z.string().min(1, 'Innhold er påkrevd'),
  stage_trigger: z.string().nullable(),
  is_active: z.boolean(),
});

export type TemplateFormValues = z.infer<typeof templateFormSchema>;

export const NEW_TEMPLATE_DEFAULTS: TemplateFormValues = {
  name: '',
  description: '',
  subject: '',
  body: '<p></p>',
  stage_trigger: null,
  is_active: true,
};

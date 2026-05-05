import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ApplicantFieldValueRow {
  id: string;
  applicant_id: string;
  field_id: string;
  value: unknown;
  raw_value: string | null;
  created_at: string;
  field_key: string;
  display_name: string;
  display_order: number;
  show_on_card: boolean;
  show_on_profile: boolean;
  type_key: string;
  options: Array<{ value: string; label_no?: string }> | null;
}

export type ApplicantFieldValuesFilter = 'card' | 'profile' | 'all';

export function useApplicantFieldValues(
  applicantId: string | null | undefined,
  filter: ApplicantFieldValuesFilter = 'profile',
) {
  return useQuery({
    queryKey: ['applicant-field-values', applicantId, filter],
    enabled: !!applicantId,
    staleTime: 30_000,
    refetchOnMount: 'always',
    queryFn: async (): Promise<ApplicantFieldValueRow[]> => {
      const { data, error } = await supabase
        .from('recruitment_applicant_field_values')
        .select(
          '*, recruitment_custom_fields!inner(field_key, display_name, display_order, show_on_card, show_on_profile, options, recruitment_custom_field_types!inner(type_key))'
        )
        .eq('applicant_id', applicantId!);
      if (error) throw error;
      const rows = ((data ?? []) as any[]).map((r) => ({
        id: r.id,
        applicant_id: r.applicant_id,
        field_id: r.field_id,
        value: r.value,
        raw_value: r.raw_value,
        created_at: r.created_at,
        field_key: r.recruitment_custom_fields?.field_key,
        display_name: r.recruitment_custom_fields?.display_name,
        display_order: r.recruitment_custom_fields?.display_order ?? 0,
        show_on_card: r.recruitment_custom_fields?.show_on_card ?? false,
        show_on_profile: r.recruitment_custom_fields?.show_on_profile ?? true,
        type_key: r.recruitment_custom_fields?.recruitment_custom_field_types?.type_key ?? 'text',
        options: r.recruitment_custom_fields?.options ?? null,
      })) as ApplicantFieldValueRow[];

      const filtered = rows.filter((r) => {
        if (filter === 'all') return true;
        if (filter === 'card') return r.show_on_card === true;
        // 'profile': show on profile but not on card (avoid sidebar duplication)
        return r.show_on_profile === true && r.show_on_card !== true;
      });

      return filtered.sort((a, b) => a.display_order - b.display_order);
    },
  });
}

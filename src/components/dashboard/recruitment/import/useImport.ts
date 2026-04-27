import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import { useAuth } from '@/hooks/useAuth';
import { isValidEmail, type MappedApplicant } from './parseFile';

export interface ImportError {
  row: number;
  reason: string;
}

export interface ImportResult {
  imported: number;
  duplicates: number;
  errors: ImportError[];
}

export interface BulkImportInput {
  rows: MappedApplicant[];
  position_id: string;
  source: string;
  gdprConfirmed: boolean;
  onProgress?: (current: number, total: number) => void;
}

const BATCH_SIZE = 10;

export function useBulkCreateApplicants() {
  const queryClient = useQueryClient();
  const { currentOrganizationId } = useOrganizationStore();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (input: BulkImportInput): Promise<ImportResult> => {
      if (!currentOrganizationId) throw new Error('Ingen organisasjon valgt');
      if (!profile?.id) throw new Error('Ingen profil lastet');

      const result: ImportResult = { imported: 0, duplicates: 0, errors: [] };
      const total = input.rows.length;

      const processRow = async (row: MappedApplicant, index: number) => {
        const rowNum = index + 1;
        try {
          if (!row.email || !isValidEmail(row.email)) {
            result.errors.push({ row: rowNum, reason: 'Mangler eller ugyldig e-post' });
            return;
          }
          if (!row.first_name && !row.last_name) {
            result.errors.push({ row: rowNum, reason: 'Mangler navn' });
            return;
          }

          // Duplicate check
          const { data: existing, error: dupErr } = await supabase
            .from('applicants')
            .select('id')
            .eq('organization_id', currentOrganizationId)
            .ilike('email', row.email)
            .maybeSingle();
          if (dupErr) throw dupErr;
          if (existing) {
            result.duplicates++;
            return;
          }

          // Insert applicant
          const { data: applicant, error: aErr } = await supabase
            .from('applicants')
            .insert({
              organization_id: currentOrganizationId,
              first_name: row.first_name || '(Ukjent)',
              last_name: row.last_name || '',
              email: row.email,
              phone: row.phone,
              location: row.location,
              source: input.source,
              gdpr_consent: input.gdprConfirmed,
              gdpr_consent_at: input.gdprConfirmed ? new Date().toISOString() : null,
              drivers_license_classes: row.drivers_license_classes,
              years_experience: row.years_experience,
              source_details: row.metadata,
              metadata: {},
            })
            .select('id')
            .single();
          if (aErr) throw aErr;

          // Insert application
          const { data: application, error: appErr } = await supabase
            .from('applications')
            .insert({
              applicant_id: applicant.id,
              position_id: input.position_id,
              current_stage_id: 'not_reviewed',
              organization_id: currentOrganizationId,
            })
            .select('id')
            .single();
          if (appErr) throw appErr;

          // Created event
          const { error: evtErr } = await supabase.from('application_events').insert({
            application_id: application.id,
            applicant_id: applicant.id,
            organization_id: currentOrganizationId,
            event_type: 'created',
            event_data: { source: input.source, import: true },
            performed_by: profile.id,
          });
          if (evtErr) throw evtErr;

          // Optional note
          if (row.note.trim()) {
            const { error: noteErr } = await supabase.from('applicant_notes').insert({
              applicant_id: applicant.id,
              application_id: application.id,
              organization_id: currentOrganizationId,
              author_id: profile.id,
              note_type: 'internal',
              content: row.note.trim(),
            });
            if (!noteErr) {
              await supabase.from('application_events').insert({
                application_id: application.id,
                applicant_id: applicant.id,
                organization_id: currentOrganizationId,
                event_type: 'note_added',
                event_data: { note_type: 'internal', preview: row.note.slice(0, 100) },
                performed_by: profile.id,
              });
            }
          }

          result.imported++;
        } catch (err: any) {
          result.errors.push({
            row: rowNum,
            reason: err?.message || 'Ukjent feil',
          });
        }
      };

      let processed = 0;
      for (let i = 0; i < input.rows.length; i += BATCH_SIZE) {
        const batch = input.rows.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map((row, j) => processRow(row, i + j)));
        processed = Math.min(i + BATCH_SIZE, total);
        input.onProgress?.(processed, total);
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applicants'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-applications'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['job-positions'] });
      queryClient.invalidateQueries({ queryKey: ['job-position'] });
      queryClient.invalidateQueries({ queryKey: ['applicant-profile'] });
    },
  });
}

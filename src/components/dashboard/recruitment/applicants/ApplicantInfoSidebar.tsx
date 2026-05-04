import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useApplicantFieldValues } from '@/hooks/recruitment/useApplicantFieldValues';
import { formatFieldValue } from './formatFieldValue';
import type { ApplicantProfileData } from './useApplicantProfile';

interface Props {
  applicant: ApplicantProfileData;
}

const SOURCE_LABELS: Record<string, string> = {
  meta_lead_ad: 'Meta Lead Ad',
};

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col gap-1 py-2 border-b last:border-0">
    <dt className="text-xs text-muted-foreground uppercase tracking-wide">{label}</dt>
    <dd className="text-sm text-foreground">{children}</dd>
  </div>
);

const Empty = () => <span className="text-muted-foreground">Ikke oppgitt</span>;

function useBulkImport(id: string | null) {
  return useQuery({
    queryKey: ['recruitment-bulk-import', id],
    enabled: !!id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recruitment_bulk_imports')
        .select('id, created_at')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; created_at: string } | null;
    },
  });
}

const ApplicantInfoSidebar: React.FC<Props> = ({ applicant }) => {
  const showImported = applicant.imported_via === 'bulk_import';
  const bulkImportId = showImported ? applicant.imported_via_bulk_import_id : null;
  const { data: bulkImport, isLoading: bulkLoading } = useBulkImport(bulkImportId);
  const { data: cardFields, isLoading: fieldsLoading } = useApplicantFieldValues(
    applicant.id,
    'card',
  );

  const sourceLabel = SOURCE_LABELS[applicant.source] ?? applicant.source;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Informasjon</CardTitle>
      </CardHeader>
      <CardContent>
        <dl>
          <Row label="Telefon">
            {applicant.phone ? <span>{applicant.phone}</span> : <Empty />}
          </Row>

          <Row label="Kilde">
            <span>{sourceLabel}</span>
          </Row>

          {showImported && (
            <Row label="Importert">
              {bulkLoading ? (
                <Skeleton className="h-4 w-48" />
              ) : bulkImport ? (
                <span>
                  Importert via Meta Lead Ads
                  <span className="text-muted-foreground">
                    {' · '}
                    {format(new Date(bulkImport.created_at), 'd. MMMM yyyy', { locale: nb })}
                  </span>
                </span>
              ) : (
                <span>Importert via Meta Lead Ads</span>
              )}
            </Row>
          )}

          <Row label="GDPR samtykke">
            {applicant.gdpr_consent ? (
              <span className="text-foreground">
                Ja
                {applicant.gdpr_consent_at && (
                  <span className="text-muted-foreground">
                    {' · '}
                    {format(new Date(applicant.gdpr_consent_at), 'd. MMMM yyyy', { locale: nb })}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-destructive">Nei</span>
            )}
          </Row>

          {/* Dynamic custom fields (show_on_card=true) */}
          {fieldsLoading ? null : cardFields && cardFields.length > 0 ? (
            <>
              {cardFields.map((row) => (
                <Row key={row.id} label={row.display_name}>
                  {formatFieldValue(row)}
                </Row>
              ))}
            </>
          ) : null}
        </dl>
      </CardContent>
    </Card>
  );
};

export default ApplicantInfoSidebar;

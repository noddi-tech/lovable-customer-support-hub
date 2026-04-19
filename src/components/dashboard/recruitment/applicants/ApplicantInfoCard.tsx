import React from 'react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ApplicantProfileData } from './useApplicantProfile';

const LANG_LABELS: Record<string, string> = {
  native: 'Morsmål',
  fluent: 'Flytende',
  conversational: 'Grunnleggende',
  basic: 'Noe',
  none: 'Ingen',
};

const PERMIT_LABELS: Record<string, string> = {
  citizen: 'Norsk statsborger',
  permanent_resident: 'Permanent opphold',
  work_permit: 'Arbeidstillatelse',
  needs_sponsorship: 'Trenger sponsing',
};

interface Props {
  applicant: ApplicantProfileData;
}

const Empty = () => <span className="text-muted-foreground">Ikke oppgitt</span>;

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col gap-1 py-2 border-b last:border-0">
    <dt className="text-xs text-muted-foreground uppercase tracking-wide">{label}</dt>
    <dd className="text-sm text-foreground">{children}</dd>
  </div>
);

const ApplicantInfoCard: React.FC<Props> = ({ applicant }) => {
  const licenses = applicant.drivers_license_classes ?? [];
  const certs = applicant.certifications ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Informasjon</CardTitle>
      </CardHeader>
      <CardContent>
        <dl>
          <Row label="Førerkort">
            {licenses.length ? (
              <div className="flex flex-wrap gap-1">
                {licenses.map((c) => (
                  <Badge key={c} variant="secondary">
                    {c}
                  </Badge>
                ))}
              </div>
            ) : (
              <Empty />
            )}
          </Row>
          <Row label="Erfaring">
            {applicant.years_experience != null ? `${applicant.years_experience} år` : <Empty />}
          </Row>
          <Row label="Sertifiseringer">
            {certs.length ? (
              <div className="flex flex-wrap gap-1">
                {certs.map((c) => (
                  <Badge key={c} variant="secondary">
                    {c}
                  </Badge>
                ))}
              </div>
            ) : (
              <Empty />
            )}
          </Row>
          <Row label="Egen bil">
            {applicant.own_vehicle == null ? <Empty /> : applicant.own_vehicle ? 'Ja' : 'Nei'}
          </Row>
          <Row label="Tilgjengelig fra">
            {applicant.availability_date ? (
              format(new Date(applicant.availability_date), 'd. MMM yyyy', { locale: nb })
            ) : (
              <Empty />
            )}
          </Row>
          <Row label="Norsk">
            {LANG_LABELS[applicant.language_norwegian] ?? <Empty />}
          </Row>
          <Row label="Arbeidstillatelse">
            {PERMIT_LABELS[applicant.work_permit_status] ?? <Empty />}
          </Row>
          <Row label="GDPR samtykke">
            {applicant.gdpr_consent ? (
              <span className="text-foreground">
                Ja
                {applicant.gdpr_consent_at && (
                  <span className="text-muted-foreground">
                    {' · '}
                    {format(new Date(applicant.gdpr_consent_at), 'd. MMM yyyy', { locale: nb })}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-destructive">Nei</span>
            )}
          </Row>
        </dl>
      </CardContent>
    </Card>
  );
};

export default ApplicantInfoCard;

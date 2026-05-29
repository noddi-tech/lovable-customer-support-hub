import React from 'react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ApplicantProfileData } from './useApplicantProfile';
import InlineEditableRow from './inline/InlineEditableRow';
import {
  AvailabilityDateRow,
  CertificationsRow,
  DriverLicenseClassesRow,
  LanguageNorwegianRow,
  LocationRow,
  OwnVehicleRow,
  WorkPermitStatusRow,
  YearsExperienceRow,
} from './inline/ApplicantScoringFieldRows';
import { SOURCE_OPTIONS } from './edit/schema';

const SOURCE_LABELS: Record<string, string> = SOURCE_OPTIONS.reduce(
  (acc, o) => ({ ...acc, [o.value]: o.label }),
  {} as Record<string, string>,
);

interface Props {
  applicant: ApplicantProfileData;
}

const Empty = () => <span className="text-muted-foreground">Ikke oppgitt</span>;

const ApplicantInfoCard: React.FC<Props> = ({ applicant }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Informasjon</CardTitle>
      </CardHeader>
      <CardContent>
        <dl>
          <InlineEditableRow
            applicantId={applicant.id}
            field="phone"
            label="Telefon"
            type="text"
            rawValue={applicant.phone ?? ''}
            display={applicant.phone ? <span>{applicant.phone}</span> : <Empty />}
          />
          <LocationRow applicant={applicant} />
          <InlineEditableRow
            applicantId={applicant.id}
            field="source"
            label="Kilde"
            type="select"
            options={SOURCE_OPTIONS}
            rawValue={applicant.source}
            display={<span>{SOURCE_LABELS[applicant.source] ?? applicant.source}</span>}
          />

          <DriverLicenseClassesRow applicant={applicant} />
          <YearsExperienceRow applicant={applicant} />
          <CertificationsRow applicant={applicant} />
          <OwnVehicleRow applicant={applicant} />
          <AvailabilityDateRow applicant={applicant} />
          <LanguageNorwegianRow applicant={applicant} />
          <WorkPermitStatusRow applicant={applicant} />

          <InlineEditableRow
            applicantId={applicant.id}
            field="gdpr_consent"
            label="GDPR samtykke"
            type="boolean"
            rawValue={applicant.gdpr_consent}
            gdprGuard
            display={
              applicant.gdpr_consent ? (
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
              )
            }
          />
        </dl>
      </CardContent>
    </Card>
  );
};

export default ApplicantInfoCard;

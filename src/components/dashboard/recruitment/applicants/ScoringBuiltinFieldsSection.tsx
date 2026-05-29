import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { ApplicantProfileData } from './useApplicantProfile';

interface Props {
  applicant: ApplicantProfileData;
}

const ScoringBuiltinFieldsSection: React.FC<Props> = ({ applicant }) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Søkerdata brukt for scoring</CardTitle>
        <p className="text-xs text-muted-foreground">
          Endringer her trigger automatisk ny AI-vurdering for søkeren.
        </p>
      </CardHeader>
      <CardContent>
        <dl>
          <LocationRow applicant={applicant} />
          <DriverLicenseClassesRow applicant={applicant} />
          <YearsExperienceRow applicant={applicant} />
          <CertificationsRow applicant={applicant} />
          <OwnVehicleRow applicant={applicant} />
          <AvailabilityDateRow applicant={applicant} />
          <LanguageNorwegianRow applicant={applicant} />
          <WorkPermitStatusRow applicant={applicant} />
        </dl>
      </CardContent>
    </Card>
  );
};

export default ScoringBuiltinFieldsSection;

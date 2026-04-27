import React from 'react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ApplicantProfileData } from './useApplicantProfile';
import InlineEditableRow from './inline/InlineEditableRow';
import { LANGUAGE_OPTIONS, PERMIT_OPTIONS, SOURCE_OPTIONS } from './edit/schema';

const LANG_LABELS: Record<string, string> = LANGUAGE_OPTIONS.reduce(
  (acc, o) => ({ ...acc, [o.value]: o.label }),
  {} as Record<string, string>,
);

const PERMIT_LABELS: Record<string, string> = PERMIT_OPTIONS.reduce(
  (acc, o) => ({ ...acc, [o.value]: o.label }),
  {} as Record<string, string>,
);

const SOURCE_LABELS: Record<string, string> = SOURCE_OPTIONS.reduce(
  (acc, o) => ({ ...acc, [o.value]: o.label }),
  {} as Record<string, string>,
);

interface Props {
  applicant: ApplicantProfileData;
}

const Empty = () => <span className="text-muted-foreground">Ikke oppgitt</span>;

const StaticRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
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
          <InlineEditableRow
            applicantId={applicant.id}
            field="phone"
            label="Telefon"
            type="text"
            rawValue={applicant.phone ?? ''}
            display={applicant.phone ? <span>{applicant.phone}</span> : <Empty />}
          />
          <InlineEditableRow
            applicantId={applicant.id}
            field="location"
            label="Sted"
            type="text"
            rawValue={applicant.location ?? ''}
            display={applicant.location ? <span>{applicant.location}</span> : <Empty />}
          />
          <InlineEditableRow
            applicantId={applicant.id}
            field="source"
            label="Kilde"
            type="select"
            options={SOURCE_OPTIONS}
            rawValue={applicant.source}
            display={<span>{SOURCE_LABELS[applicant.source] ?? applicant.source}</span>}
          />

          {/* Static — multi-value, edit via dialog */}
          <StaticRow label="Førerkort">
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
          </StaticRow>

          <InlineEditableRow
            applicantId={applicant.id}
            field="years_experience"
            label="Erfaring"
            type="number"
            rawValue={applicant.years_experience == null ? '' : String(applicant.years_experience)}
            display={
              applicant.years_experience != null ? (
                <span>{applicant.years_experience} år</span>
              ) : (
                <Empty />
              )
            }
          />

          <StaticRow label="Sertifiseringer">
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
          </StaticRow>

          <InlineEditableRow
            applicantId={applicant.id}
            field="own_vehicle"
            label="Egen bil"
            type="boolean"
            rawValue={applicant.own_vehicle ?? false}
            display={
              applicant.own_vehicle == null ? (
                <Empty />
              ) : applicant.own_vehicle ? (
                <span>Ja</span>
              ) : (
                <span>Nei</span>
              )
            }
          />

          <InlineEditableRow
            applicantId={applicant.id}
            field="availability_date"
            label="Tilgjengelig fra"
            type="date"
            rawValue={applicant.availability_date ?? ''}
            display={
              applicant.availability_date ? (
                <span>
                  {format(new Date(applicant.availability_date), 'd. MMM yyyy', { locale: nb })}
                </span>
              ) : (
                <Empty />
              )
            }
          />

          <InlineEditableRow
            applicantId={applicant.id}
            field="language_norwegian"
            label="Norsk"
            type="select"
            options={LANGUAGE_OPTIONS}
            rawValue={applicant.language_norwegian}
            display={
              <span>{LANG_LABELS[applicant.language_norwegian] ?? <Empty />}</span>
            }
          />

          <InlineEditableRow
            applicantId={applicant.id}
            field="work_permit_status"
            label="Arbeidstillatelse"
            type="select"
            options={PERMIT_OPTIONS}
            rawValue={applicant.work_permit_status}
            display={
              <span>{PERMIT_LABELS[applicant.work_permit_status] ?? <Empty />}</span>
            }
          />

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

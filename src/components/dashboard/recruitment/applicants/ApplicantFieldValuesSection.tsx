import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useApplicantFieldValues } from '@/hooks/recruitment/useApplicantFieldValues';
import { formatFieldValue } from './formatFieldValue';

interface Props {
  applicantId: string;
}

export function ApplicantFieldValuesSection({ applicantId }: Props) {
  // 'profile' returns show_on_profile fields that are NOT shown in the sidebar card,
  // avoiding duplication with ApplicantInfoSidebar.
  const { data, isLoading } = useApplicantFieldValues(applicantId, 'profile');

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Skjemasvar</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Skjemasvar</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-3">
          {data.map((row) => (
            <div key={row.id} className="grid grid-cols-3 gap-3 text-sm">
              <dt className="text-muted-foreground col-span-1">{row.display_name}</dt>
              <dd className="col-span-2 text-foreground">{formatFieldValue(row)}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import {
  useApplicantFieldValues,
  type ApplicantFieldValueRow,
} from '@/hooks/recruitment/useApplicantFieldValues';

interface Props {
  applicantId: string;
}

function formatValue(row: ApplicantFieldValueRow): React.ReactNode {
  const v = row.value as any;
  if (v === null || v === undefined || v === '') {
    return <span className="text-muted-foreground">—</span>;
  }
  switch (row.type_key) {
    case 'boolean':
      return v === true || v === 'true' ? 'Ja' : 'Nei';
    case 'date':
      try {
        return format(new Date(v), 'd. MMM yyyy', { locale: nb });
      } catch {
        return String(v);
      }
    case 'datetime':
      try {
        return format(new Date(v), 'd. MMM yyyy HH:mm', { locale: nb });
      } catch {
        return String(v);
      }
    case 'multi_select': {
      const arr = Array.isArray(v) ? v : [];
      const labels = arr.map((val: string) => {
        const opt = row.options?.find((o) => o.value === val);
        return opt?.label_no ?? val;
      });
      return labels.join(', ') || <span className="text-muted-foreground">—</span>;
    }
    case 'single_select': {
      const opt = row.options?.find((o) => o.value === v);
      return opt?.label_no ?? String(v);
    }
    case 'url':
      return (
        <a
          href={String(v)}
          target="_blank"
          rel="noreferrer noopener"
          className="text-primary hover:underline break-all"
        >
          {String(v)}
        </a>
      );
    case 'email':
      return (
        <a href={`mailto:${v}`} className="text-primary hover:underline">
          {String(v)}
        </a>
      );
    case 'phone':
      return (
        <a href={`tel:${v}`} className="text-primary hover:underline">
          {String(v)}
        </a>
      );
    case 'long_text':
      return <span className="whitespace-pre-wrap">{String(v)}</span>;
    default:
      return String(v);
  }
}

export function ApplicantFieldValuesSection({ applicantId }: Props) {
  const { data, isLoading } = useApplicantFieldValues(applicantId);

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
    // Hide entirely when no values exist (per memory note)
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
              <dd className="col-span-2 text-foreground">{formatValue(row)}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Props {
  source: string;
}

const SOURCE_MAP: Record<string, { label: string; className: string }> = {
  meta_lead_ad: { label: 'Meta', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100 border-transparent' },
  finn: { label: 'Finn.no', className: 'bg-orange-100 text-orange-800 hover:bg-orange-100 border-transparent' },
  website: { label: 'Nettside', className: 'bg-purple-100 text-purple-800 hover:bg-purple-100 border-transparent' },
  referral: { label: 'Referanse', className: 'bg-green-100 text-green-800 hover:bg-green-100 border-transparent' },
  manual: { label: 'Manuell', className: 'bg-muted text-muted-foreground hover:bg-muted border-transparent' },
  csv_import: { label: 'CSV', className: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100 border-transparent' },
};

const ApplicantSourceBadge: React.FC<Props> = ({ source }) => {
  const cfg = SOURCE_MAP[source] ?? { label: source, className: 'bg-muted text-muted-foreground' };
  return <Badge className={cn(cfg.className)}>{cfg.label}</Badge>;
};

export default ApplicantSourceBadge;

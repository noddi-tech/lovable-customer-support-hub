import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Props {
  status: string;
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  draft: { label: 'Utkast', className: 'bg-muted text-muted-foreground hover:bg-muted' },
  open: { label: 'Åpen', className: 'bg-green-100 text-green-800 hover:bg-green-100 border-transparent' },
  paused: { label: 'Pauset', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-transparent' },
  closed: { label: 'Lukket', className: 'bg-red-100 text-red-800 hover:bg-red-100 border-transparent' },
};

const PositionStatusBadge: React.FC<Props> = ({ status }) => {
  const cfg = STATUS_MAP[status] ?? { label: status, className: 'bg-muted text-muted-foreground' };
  return <Badge className={cn(cfg.className)}>{cfg.label}</Badge>;
};

export default PositionStatusBadge;

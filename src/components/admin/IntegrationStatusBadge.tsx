import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface IntegrationStatusBadgeProps {
  status: 'active' | 'inactive' | 'not-configured';
  className?: string;
}

export function IntegrationStatusBadge({ status, className }: IntegrationStatusBadgeProps) {
  const config = {
    active: {
      label: 'Active',
      variant: 'default' as const,
      icon: CheckCircle2,
      className: 'bg-green-500/10 text-green-600 border-green-500/20'
    },
    inactive: {
      label: 'Inactive',
      variant: 'secondary' as const,
      icon: XCircle,
      className: 'bg-muted text-muted-foreground'
    },
    'not-configured': {
      label: 'Not Configured',
      variant: 'outline' as const,
      icon: AlertCircle,
      className: 'bg-orange-500/10 text-orange-600 border-orange-500/20'
    }
  };

  const { label, icon: Icon, className: statusClassName } = config[status];

  return (
    <Badge variant="outline" className={`${statusClassName} ${className}`}>
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  );
}

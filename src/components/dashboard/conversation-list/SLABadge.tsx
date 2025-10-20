import { Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SLABadgeProps {
  status?: 'on_track' | 'at_risk' | 'breached' | 'met';
  slaBreachAt?: string;
}

export function SLABadge({ status, slaBreachAt }: SLABadgeProps) {
  if (!status || status === 'met') return null;

  const getStatusConfig = () => {
    switch (status) {
      case 'on_track':
        return {
          icon: Clock,
          variant: 'default' as const,
          label: 'On Track',
          className: 'bg-accent/10 text-accent-foreground border-accent/20'
        };
      case 'at_risk':
        return {
          icon: AlertCircle,
          variant: 'default' as const,
          label: 'At Risk',
          className: 'bg-warning/10 text-warning-foreground border-warning/20'
        };
      case 'breached':
        return {
          icon: XCircle,
          variant: 'destructive' as const,
          label: 'Breached',
          className: 'bg-destructive/10 text-destructive border-destructive/20'
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`text-xs flex items-center gap-1 ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}

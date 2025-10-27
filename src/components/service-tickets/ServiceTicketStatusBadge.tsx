import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ServiceTicketStatus, ServiceTicketPriority } from '@/types/service-tickets';
import { 
  Circle, 
  CheckCircle2, 
  Clock, 
  PlayCircle, 
  Package, 
  XCircle,
  AlertCircle
} from 'lucide-react';

const STATUS_CONFIG: Record<ServiceTicketStatus, { label: string; variant: string; icon: any }> = {
  open: { label: 'Open', variant: 'bg-blue-500/10 text-blue-700 dark:text-blue-400', icon: Circle },
  acknowledged: { label: 'Acknowledged', variant: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400', icon: CheckCircle2 },
  scheduled: { label: 'Scheduled', variant: 'bg-purple-500/10 text-purple-700 dark:text-purple-400', icon: Clock },
  in_progress: { label: 'In Progress', variant: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400', icon: PlayCircle },
  pending_customer: { label: 'Pending Customer', variant: 'bg-amber-500/10 text-amber-700 dark:text-amber-400', icon: Clock },
  awaiting_parts: { label: 'Awaiting Parts', variant: 'bg-orange-500/10 text-orange-700 dark:text-orange-400', icon: Package },
  on_hold: { label: 'On Hold', variant: 'bg-gray-500/10 text-gray-700 dark:text-gray-400', icon: Circle },
  completed: { label: 'Completed', variant: 'bg-green-500/10 text-green-700 dark:text-green-400', icon: CheckCircle2 },
  verified: { label: 'Verified', variant: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400', icon: CheckCircle2 },
  closed: { label: 'Closed', variant: 'bg-gray-500/10 text-gray-700 dark:text-gray-400', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', variant: 'bg-red-500/10 text-red-700 dark:text-red-400', icon: XCircle },
};

const PRIORITY_CONFIG: Record<ServiceTicketPriority, { label: string; variant: string; icon: any }> = {
  low: { label: 'Low', variant: 'bg-gray-500/10 text-gray-700 dark:text-gray-400', icon: Circle },
  normal: { label: 'Normal', variant: 'bg-blue-500/10 text-blue-700 dark:text-blue-400', icon: Circle },
  high: { label: 'High', variant: 'bg-orange-500/10 text-orange-700 dark:text-orange-400', icon: AlertCircle },
  urgent: { label: 'Urgent', variant: 'bg-red-500/10 text-red-700 dark:text-red-400', icon: AlertCircle },
};

interface ServiceTicketStatusBadgeProps {
  status: ServiceTicketStatus;
  showIcon?: boolean;
  className?: string;
}

export const ServiceTicketStatusBadge = ({ 
  status, 
  showIcon = true,
  className 
}: ServiceTicketStatusBadgeProps) => {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <Badge variant="secondary" className={cn(config.variant, 'font-medium', className)}>
      {showIcon && <Icon className="w-3 h-3 mr-1" />}
      {config.label}
    </Badge>
  );
};

interface ServiceTicketPriorityBadgeProps {
  priority: ServiceTicketPriority;
  showIcon?: boolean;
  className?: string;
}

export const ServiceTicketPriorityBadge = ({ 
  priority, 
  showIcon = true,
  className 
}: ServiceTicketPriorityBadgeProps) => {
  const config = PRIORITY_CONFIG[priority];
  const Icon = config.icon;

  return (
    <Badge variant="secondary" className={cn(config.variant, 'font-medium', className)}>
      {showIcon && <Icon className="w-3 h-3 mr-1" />}
      {config.label}
    </Badge>
  );
};

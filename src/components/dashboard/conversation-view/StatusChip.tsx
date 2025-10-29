import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  CheckCircle2, 
  Archive, 
  AlertCircle,
  Circle
} from "lucide-react";
import { cn } from "@/lib/utils";

type ConversationStatus = 'open' | 'pending' | 'closed' | 'archived' | 'resolved';

interface StatusChipProps {
  status: ConversationStatus;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig = {
  open: {
    label: 'Open',
    icon: Circle,
    colors: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900'
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    colors: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900'
  },
  closed: {
    label: 'Closed',
    icon: CheckCircle2,
    colors: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-900'
  },
  resolved: {
    label: 'Resolved',
    icon: CheckCircle2,
    colors: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-900'
  },
  archived: {
    label: 'Archived',
    icon: Archive,
    colors: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-950 dark:text-gray-300 dark:border-gray-900'
  }
};

export const StatusChip = ({ 
  status, 
  className,
  showIcon = true,
  size = 'md'
}: StatusChipProps) => {
  const config = statusConfig[status] || statusConfig.open;
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  return (
    <Badge 
      variant="outline"
      className={cn(
        config.colors,
        sizeClasses[size],
        'font-medium border',
        className
      )}
    >
      {showIcon && <Icon className={cn(
        'mr-1',
        size === 'sm' && 'h-3 w-3',
        size === 'md' && 'h-3.5 w-3.5',
        size === 'lg' && 'h-4 w-4'
      )} />}
      {config.label}
    </Badge>
  );
};

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface SidebarCounterProps {
  count: number;
  variant?: 'default' | 'active' | 'unread' | 'pending' | 'success' | 'warning';
  className?: string;
  maxDisplay?: number;
}

export const SidebarCounter: React.FC<SidebarCounterProps> = ({
  count,
  variant = 'default',
  className,
  maxDisplay = 999
}) => {
  const displayCount = count > maxDisplay ? `${maxDisplay}+` : count.toString();

  const getVariantStyles = () => {
    switch (variant) {
      case 'active':
        return "bg-primary text-primary-foreground";
      case 'unread':
        return "bg-inbox-unread text-white";
      case 'pending':
        return "bg-warning text-warning-foreground";
      case 'success':
        return "bg-success text-success-foreground";
      case 'warning':
        return "bg-warning text-warning-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  if (count <= 0) return null;

  return (
    <Badge 
      variant="secondary"
      className={cn(
        "h-5 min-w-5 px-1.5 text-xs font-medium rounded-full flex items-center justify-center shrink-0",
        "transition-colors duration-fast",
        getVariantStyles(),
        className
      )}
    >
      {displayCount}
    </Badge>
  );
};
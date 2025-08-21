import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { SidebarCounter } from './sidebar-counter';

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'channel' | 'inbox';
  color?: string;
  disabled?: boolean;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  icon: Icon,
  label,
  count,
  active = false,
  onClick,
  className,
  variant = 'default',
  color,
  disabled = false
}) => {
  const getVariantStyles = () => {
    if (active) {
      return "bg-sidebar-accent text-sidebar-accent-foreground font-medium";
    }
    return "hover:bg-sidebar-accent/50 text-sidebar-foreground";
  };

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "w-full justify-start gap-3 px-3 py-2.5 text-sm transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1",
          getVariantStyles(),
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        {/* Icon with optional color for inbox variant */}
        {variant === 'inbox' && color ? (
          <div 
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
        ) : (
          <Icon className="h-4 w-4 flex-shrink-0" />
        )}
        
        {/* Label */}
        <span className="truncate flex-1 text-left">{label}</span>
        
        {/* Count badge */}
        {count !== undefined && count > 0 && (
          <SidebarCounter 
            count={count} 
            variant={active ? 'active' : 'default'}
          />
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};
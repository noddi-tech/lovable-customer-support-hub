import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Filter } from 'lucide-react';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu
} from '@/components/ui/sidebar';

interface SidebarSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  collapsible?: boolean;
  showFilter?: boolean;
  onFilterClick?: () => void;
  className?: string;
}

export const SidebarSection: React.FC<SidebarSectionProps> = ({
  title,
  children,
  defaultExpanded = true,
  collapsible = true,
  showFilter = false,
  onFilterClick,
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleToggle = () => {
    if (collapsible) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <SidebarGroup className={cn("p-1", className)}>
      <SidebarGroupLabel className="flex items-center justify-between h-6 px-1">
        <span className="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wide">
          {title}
        </span>
        
        <div className="flex items-center gap-0.5">
          {showFilter && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-4 w-4 p-0 text-sidebar-foreground/50 hover:text-sidebar-foreground"
              onClick={onFilterClick}
            >
              <Filter className="h-2.5 w-2.5" />
            </Button>
          )}
          
          {collapsible && (
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 text-sidebar-foreground/50 hover:text-sidebar-foreground"
              onClick={handleToggle}
            >
              {isExpanded ? (
                <ChevronDown className="h-2.5 w-2.5" />
              ) : (
                <ChevronRight className="h-2.5 w-2.5" />
              )}
            </Button>
          )}
        </div>
      </SidebarGroupLabel>
      
      {isExpanded && (
        <SidebarGroupContent>
          <SidebarMenu className="gap-0">
            {children}
          </SidebarMenu>
        </SidebarGroupContent>
      )}
    </SidebarGroup>
  );
};
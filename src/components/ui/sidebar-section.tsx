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
    <SidebarGroup className={cn("", className)}>
      <SidebarGroupLabel className="flex items-center justify-between">
        <span className="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wide">
          {title}
        </span>
        
        <div className="flex items-center gap-1">
          {showFilter && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-5 w-5 p-0 text-sidebar-foreground/50 hover:text-sidebar-foreground"
              onClick={onFilterClick}
            >
              <Filter className="h-3 w-3" />
            </Button>
          )}
          
          {collapsible && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 text-sidebar-foreground/50 hover:text-sidebar-foreground"
              onClick={handleToggle}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      </SidebarGroupLabel>
      
      {isExpanded && (
        <SidebarGroupContent>
          <SidebarMenu>
            {children}
          </SidebarMenu>
        </SidebarGroupContent>
      )}
    </SidebarGroup>
  );
};
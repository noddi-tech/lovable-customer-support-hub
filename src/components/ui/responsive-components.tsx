import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsivePaneProps {
  children: React.ReactNode;
  className?: string;
  sticky?: boolean;
}

export const ResponsivePane = ({ children, className, sticky = false }: ResponsivePaneProps) => {
  return (
    <div 
      className={cn(
        "h-full overflow-auto",
        // Mobile touch scrolling optimization
        "touch-pan-y",
        // Webkit scrolling optimization
        "webkit-overflow-scrolling-touch",
        sticky && "sticky top-0",
        className
      )}
    >
      {children}
    </div>
  );
};

interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
}

export const ResponsiveTable = ({ children, className }: ResponsiveTableProps) => {
  return (
    <div className={cn(
      "overflow-x-auto",
      // Hide horizontal scrollbar on mobile for cleaner look
      "scrollbar-hide sm:scrollbar-default",
      className
    )}>
      <div className="min-w-full">
        {children}
      </div>
    </div>
  );
};

interface ResponsiveToolbarProps {
  children: React.ReactNode;
  className?: string;
}

export const ResponsiveToolbar = ({ children, className }: ResponsiveToolbarProps) => {
  return (
    <div className={cn(
      "sticky top-0 z-10 bg-background border-b",
      // Mobile padding adjustment
      "px-2 py-2 sm:px-4 sm:py-3",
      // Flex layout that wraps on small screens
      "flex flex-wrap gap-2 items-center",
      className
    )}>
      {children}
    </div>
  );
};
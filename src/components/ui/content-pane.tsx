import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ContentPaneProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'card' | 'bordered';
  scrollable?: boolean;
}

export const ContentPane: React.FC<ContentPaneProps> = ({
  children,
  className,
  variant = 'default',
  scrollable = true
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'card':
        return "bg-card border border-border rounded-lg shadow-sm";
      case 'bordered':
        return "border-r border-border bg-background";
      default:
        return "bg-background";
    }
  };

  const scrollStyles = scrollable ? "pane" : "";

  return (
    <div 
      className={cn(
        "flex flex-col min-h-0 h-full",
        getVariantStyles(),
        scrollStyles,
        className
      )}
    >
      {children}
    </div>
  );
};
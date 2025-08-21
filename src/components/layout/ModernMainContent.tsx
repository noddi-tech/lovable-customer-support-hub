import React from 'react';
import { cn } from '@/lib/utils';

interface ModernMainContentProps {
  children: React.ReactNode;
  className?: string;
}

export const ModernMainContent: React.FC<ModernMainContentProps> = ({
  children,
  className
}) => {
  return (
    <main className={cn(
      "modern-main-content flex-1 min-h-0 bg-background overflow-hidden",
      className
    )}>
      {children}
    </main>
  );
};
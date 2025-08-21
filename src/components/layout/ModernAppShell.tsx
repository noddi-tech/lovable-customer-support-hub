import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ModernAppShellProps {
  children: ReactNode;
  className?: string;
}

export const ModernAppShell: React.FC<ModernAppShellProps> = ({
  children,
  className
}) => {
  return (
    <div className={cn(
      "modern-app-shell h-screen flex flex-col bg-background overflow-hidden",
      className
    )}>
      {children}
    </div>
  );
};
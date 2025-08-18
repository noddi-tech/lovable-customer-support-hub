import React from 'react';
import { cn } from '@/lib/utils';

interface AppRootProps {
  children: React.ReactNode;
  className?: string;
}

const AppRoot = ({ children, className }: AppRootProps) => {
  return (
    <div className={cn(
      "h-screen overflow-hidden bg-background",
      "flex flex-col",
      "max-w-[var(--max-app-w)] mx-auto",
      className
    )}>
      {children}
    </div>
  );
};

export default AppRoot;
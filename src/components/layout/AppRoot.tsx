import React from 'react';
import { cn } from '@/lib/utils';

interface AppRootProps {
  children: React.ReactNode;
  className?: string;
}

const AppRoot = ({ children, className }: AppRootProps) => {
  return (
    <div className={cn("app-root", className)}>
      {children}
    </div>
  );
};

export default AppRoot;
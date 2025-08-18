import React from 'react';
import { cn } from '@/lib/utils';

interface AppMainProps {
  children: React.ReactNode;
  className?: string;
}

const AppMain = ({ children, className }: AppMainProps) => {
  return (
    <main className={cn("app-main", className)}>
      {children}
    </main>
  );
};

export default AppMain;
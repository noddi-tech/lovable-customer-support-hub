import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AppShellProps {
  header: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
  className?: string;
}

export const AppShell: React.FC<AppShellProps> = ({
  header,
  sidebar,
  children,
  className
}) => {
  return (
    <div className={cn("app-root", className)}>
      {/* Header */}
      <header className="app-header">
        {header}
      </header>

      {/* Main application area */}
      <div className="app-main">
        {/* Sidebar */}
        <aside className="flex-shrink-0">
          {sidebar}
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
};
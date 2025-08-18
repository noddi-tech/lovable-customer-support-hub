import React from 'react';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from './ErrorBoundary';
import { usePerformanceMonitoring, useMemoryMonitoring } from '@/hooks/usePerformanceMonitoring';

interface AppRootProps {
  children: React.ReactNode;
  className?: string;
}

const AppRoot = ({ children, className }: AppRootProps) => {
  const { measureRender } = usePerformanceMonitoring('AppRoot');
  useMemoryMonitoring();

  React.useEffect(() => {
    measureRender();
  });

  return (
    <ErrorBoundary>
      <div className={cn(
        "h-screen overflow-hidden bg-background",
        "flex flex-col",
        "max-w-[var(--max-app-w)] mx-auto",
        className
      )}>
        {children}
      </div>
    </ErrorBoundary>
  );
};

export default AppRoot;
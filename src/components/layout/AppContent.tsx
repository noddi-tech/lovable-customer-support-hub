import React from 'react';
import { cn } from '@/lib/utils';

interface AppContentProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * AppContent wrapper for main application content areas.
 * Provides consistent full-width layout with responsive gutters.
 * Use this instead of ResponsiveContainer for app content to avoid centering.
 */
export function AppContent({ children, className = '' }: AppContentProps) {
  return (
    <div className={cn(
      'min-h-0 w-full px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12',
      className
    )}>
      {children}
    </div>
  );
}
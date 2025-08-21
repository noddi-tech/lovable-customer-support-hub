import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface EnhancedLoadingSkeletonProps {
  type: 'sidebar' | 'conversation-list' | 'conversation-view' | 'counts';
  count?: number;
}

export const EnhancedLoadingSkeleton: React.FC<EnhancedLoadingSkeletonProps> = ({
  type,
  count = 6
}) => {
  switch (type) {
    case 'sidebar':
      return (
        <div className="space-y-1 px-3">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 px-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded-sm" />
                <Skeleton className="h-4 w-16 rounded-sm" />
              </div>
              <Skeleton className="h-4 w-6 rounded-full" />
            </div>
          ))}
        </div>
      );

    case 'conversation-list':
      return (
        <div className="space-y-0 p-0">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2 p-4 border-b border-border">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32 rounded-sm" />
                  <Skeleton className="h-3 w-24 rounded-sm" />
                </div>
                <Skeleton className="h-3 w-12 rounded-sm" />
              </div>
              <Skeleton className="h-4 w-full rounded-sm" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-12 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      );

    case 'conversation-view':
      return (
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <Skeleton className="h-6 w-64 rounded-sm" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-20 rounded-sm" />
              <Skeleton className="h-4 w-16 rounded-sm" />
            </div>
          </div>
          
          {/* Messages */}
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-4 w-24 rounded-sm" />
                  <Skeleton className="h-4 w-16 rounded-sm" />
                </div>
                <Skeleton className="h-20 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      );

    case 'counts':
      return (
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-sm" />
          <Skeleton className="h-4 w-12 rounded-sm" />
          <Skeleton className="h-4 w-6 rounded-full ml-auto" />
        </div>
      );

    default:
      return (
        <div className="space-y-2 p-3">
          {Array.from({ length: count }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-sm" />
          ))}
        </div>
      );
  }
};
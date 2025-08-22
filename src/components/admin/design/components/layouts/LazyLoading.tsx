import React, { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Dynamic imports for bundle optimization
export const LazyResponsiveTabs = React.lazy(() => 
  import('./ResponsiveTabs').then(module => ({ default: module.ResponsiveTabs }))
);

export const LazyAdaptiveSection = React.lazy(() => 
  import('./AdaptiveSection').then(module => ({ default: module.AdaptiveSection }))
);

// Loading fallback components
export const TabsLoadingFallback = () => (
  <div className="w-full space-y-4">
    <div className="flex space-x-1">
      <Skeleton className="h-10 w-20" />
      <Skeleton className="h-10 w-20" />
      <Skeleton className="h-10 w-20" />
    </div>
    <Skeleton className="h-32 w-full" />
  </div>
);

export const SectionLoadingFallback = () => (
  <div className="space-y-4">
    <Skeleton className="h-6 w-48" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
  </div>
);

// Wrapper components with Suspense
export const ResponsiveTabsSuspense: React.FC<React.ComponentProps<typeof LazyResponsiveTabs>> = (props) => (
  <Suspense fallback={<TabsLoadingFallback />}>
    <LazyResponsiveTabs {...props} />
  </Suspense>
);

export const AdaptiveSectionSuspense: React.FC<React.ComponentProps<typeof LazyAdaptiveSection>> = (props) => (
  <Suspense fallback={<SectionLoadingFallback />}>
    <LazyAdaptiveSection {...props} />
  </Suspense>
);
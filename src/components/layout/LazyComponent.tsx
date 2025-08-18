import React, { Suspense, ComponentType } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary } from './ErrorBoundary';

interface LazyComponentProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
}

const DefaultFallback = () => (
  <div className="space-y-3 p-4">
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
  </div>
);

export const LazyComponent: React.FC<LazyComponentProps> = ({
  children,
  fallback = <DefaultFallback />,
  errorFallback
}) => {
  return (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

export const withLazyLoading = <P extends object>(
  Component: ComponentType<P>,
  fallback?: React.ReactNode
) => {
  const LazyWrappedComponent = (props: P) => (
    <LazyComponent fallback={fallback}>
      <Component {...props} />
    </LazyComponent>
  );
  
  LazyWrappedComponent.displayName = `LazyLoaded(${Component.displayName || Component.name})`;
  
  return LazyWrappedComponent;
};
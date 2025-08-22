import React, { memo, useMemo } from 'react';
import { useUserLanguage } from '@/hooks/useUserLanguage';

interface I18nWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const LoadingFallback = memo(() => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">Loading translations...</p>
    </div>
  </div>
));

LoadingFallback.displayName = 'LoadingFallback';

export const I18nWrapper: React.FC<I18nWrapperProps> = memo(({ 
  children, 
  fallback
}) => {
  const { isReady, debug } = useUserLanguage();

  // Memoize the loading decision to prevent re-renders
  const shouldShowApp = useMemo(() => {
    return isReady || debug.initialized || debug.hasResources;
  }, [isReady, debug.initialized, debug.hasResources]);

  // Memoize the fallback component
  const memoizedFallback = useMemo(() => {
    return fallback || <LoadingFallback />;
  }, [fallback]);

  if (!shouldShowApp) {
    return <>{memoizedFallback}</>;
  }

  return <>{children}</>;
});

I18nWrapper.displayName = 'I18nWrapper';
import React from 'react';
import { useUserLanguage } from '@/hooks/useUserLanguage';

interface I18nWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const I18nWrapper: React.FC<I18nWrapperProps> = ({ 
  children, 
  fallback = (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}) => {
  const { isReady } = useUserLanguage();

  if (!isReady) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
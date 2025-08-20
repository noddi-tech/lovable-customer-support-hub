import React from 'react';
import { useUserLanguage } from '@/hooks/useUserLanguage';

interface I18nWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const I18nWrapper: React.FC<I18nWrapperProps> = ({ 
  children, 
  fallback = (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading translations...</p>
      </div>
    </div>
  )
}) => {
  const { isReady, debug } = useUserLanguage();

  // Show debug info in development
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 I18nWrapper status:', { isReady, debug });
  }

  // For better UX, reduce loading time - show app faster even if i18n isn't 100% ready
  // The fallbacks in translation keys will handle missing translations
  const shouldShowApp = isReady || debug.initialized || debug.hasResources;

  if (!shouldShowApp) {
    console.log('⏳ I18nWrapper: Showing fallback while waiting for i18n...');
    return <>{fallback}</>;
  }

  console.log('✅ I18nWrapper: Rendering app with i18n ready');
  return <>{children}</>;
};
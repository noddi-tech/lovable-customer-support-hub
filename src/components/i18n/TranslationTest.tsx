import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const TranslationTest: React.FC = () => {
  const { t, i18n } = useTranslation();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Card className="fixed top-4 left-4 z-[999] w-80 bg-black/90 text-white">
      <CardHeader>
        <CardTitle className="text-sm">Translation Debug</CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div>i18n Ready: {i18n.isInitialized ? 'Yes' : 'No'}</div>
        <div>Current Language: {i18n.language}</div>
        <div>Test Key: {t('dashboard.conversationView.noConversationSelected')}</div>
        <div>Fallback: {t('dashboard.conversationView.noConversationSelected', 'No conversation selected')}</div>
        <div>Resources Loaded: {Object.keys(i18n.services.resourceStore.data).join(', ')}</div>
      </CardContent>
    </Card>
  );
};
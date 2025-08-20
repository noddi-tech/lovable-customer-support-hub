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
        <div>Without Fallback: "{t('dashboard.conversationView.noConversationSelected')}"</div>
        <div>With Fallback: "{t('dashboard.conversationView.noConversationSelected', 'No conversation selected')}"</div>
        <div>Resources: {Object.keys(i18n.services.resourceStore.data).join(', ')}</div>
        <div className="text-yellow-300">Translation Status: {
          t('dashboard.conversationView.noConversationSelected') === 'dashboard.conversationView.noConversationSelected' 
            ? 'FAILING - showing keys instead of text' 
            : 'Working'
        }</div>
      </CardContent>
    </Card>
  );
};
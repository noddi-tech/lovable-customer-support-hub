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
        <div>i18n Status: {i18n.isInitialized ? '✅ Ready' : '❌ Not Ready'}</div>
        <div>Language: {i18n.language}</div>
        <div>Resources: {Object.keys(i18n.services.resourceStore.data).join(', ')}</div>
        <div className="border-t border-white/20 pt-2">
          <div>Translation Tests:</div>
          <div className="text-green-300">✓ With Fallback: "{t('dashboard.conversationView.noConversationSelected', 'No conversation selected')}"</div>
          <div className={t('dashboard.conversationView.noConversationSelected') === 'dashboard.conversationView.noConversationSelected' ? 'text-red-300' : 'text-green-300'}>
            {t('dashboard.conversationView.noConversationSelected') === 'dashboard.conversationView.noConversationSelected' ? '❌' : '✓'} Without Fallback: "{t('dashboard.conversationView.noConversationSelected')}"
          </div>
        </div>
        <div className="border-t border-white/20 pt-2">
          <div>Status: {
            t('dashboard.conversationView.noConversationSelected') === 'dashboard.conversationView.noConversationSelected' 
              ? '🚨 FAILING - showing keys' 
              : '✅ Working properly'
          }</div>
        </div>
      </CardContent>
    </Card>
  );
};
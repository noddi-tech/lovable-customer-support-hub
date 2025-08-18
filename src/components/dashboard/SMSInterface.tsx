import React from 'react';
import { MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const SMSInterface = () => {
  const { t } = useTranslation();

  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="text-center">
        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-2xl font-semibold mb-2">{t('smsFeatures')}</h2>
        <p className="text-muted-foreground">{t('smsMarketingComingSoon')}</p>
      </div>
    </div>
  );
};
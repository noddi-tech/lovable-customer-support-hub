import React from 'react';
import { Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const VoiceInterface = () => {
  const { t } = useTranslation();

  return (
    <div className="pane flex items-center justify-center p-6">
      <div className="text-center">
        <Phone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-2xl font-semibold mb-2">{t('voiceCommunication')}</h2>
        <p className="text-muted-foreground">{t('voiceFeaturesComingSoon')}</p>
      </div>
    </div>
  );
};
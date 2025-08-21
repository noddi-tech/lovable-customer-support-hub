import React from 'react';
import { StandardThreePanelLayout } from '@/components/layout/StandardThreePanelLayout';
import { StandardActionToolbar } from '@/components/layout/StandardActionToolbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const DoormanInterface = () => {
  const { t } = useTranslation();

  const header = (
    <StandardActionToolbar
      title={t('doorman.title', 'Doorman Service')}
      breadcrumbs={[{ label: t('nav.operations', 'Operations') }, { label: t('doorman.title', 'Doorman') }]}
    />
  );

  const sidebar = (
    <div className="flex flex-col h-full p-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-primary" />
            <CardTitle className="text-sm">{t('doorman.externalService', 'External Service')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            {t('doorman.description', 'This service is hosted externally and opens in an embedded frame.')}
          </p>
        </CardContent>
      </Card>
    </div>
  );

  const listView = (
    <div className="w-full h-full">
      <iframe
        src="https://doorman.noddi.co/"
        className="w-full h-full border-0 rounded-lg"
        title="Doorman Service"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );

  return (
    <StandardThreePanelLayout
      storageKey="doorman-interface"
      header={header}
      sidebar={sidebar}
      listView={listView}
    />
  );
};

export default DoormanInterface;
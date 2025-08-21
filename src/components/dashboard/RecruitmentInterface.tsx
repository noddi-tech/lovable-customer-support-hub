import React from 'react';
import { StandardThreePanelLayout } from '@/components/layout/StandardThreePanelLayout';
import { StandardActionToolbar } from '@/components/layout/StandardActionToolbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const RecruitmentInterface = () => {
  const { t } = useTranslation();

  const header = (
    <StandardActionToolbar
      title={t('recruitment.title', 'Recruitment Portal')}
      breadcrumbs={[{ label: t('nav.operations', 'Operations') }, { label: t('recruitment.title', 'Recruitment') }]}
    />
  );

  const sidebar = (
    <div className="flex flex-col h-full p-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="text-sm">{t('recruitment.portal', 'Recruitment Portal')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            {t('recruitment.description', 'Manage job applications and candidate recruitment process.')}
          </p>
        </CardContent>
      </Card>
    </div>
  );

  const listView = (
    <div className="w-full h-full">
      <iframe
        src="https://apply.noddi.co/login"
        className="w-full h-full border-0 rounded-lg"
        title="Recruitment Portal"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );

  return (
    <StandardThreePanelLayout
      storageKey="recruitment-interface"
      header={header}
      sidebar={sidebar}
      listView={listView}
    />
  );
};

export default RecruitmentInterface;
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const RecruitmentInterface = () => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center h-full p-8">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>{t('recruitment')}</CardTitle>
          <CardDescription>
            {t('recruitmentComingSoon')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Manage job postings, candidate applications, and hiring workflows.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default RecruitmentInterface;
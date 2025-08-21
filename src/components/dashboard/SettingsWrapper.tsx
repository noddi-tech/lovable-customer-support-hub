import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { NotificationsList } from '@/components/notifications/NotificationsList';
import { EmailTemplateSettings } from '@/components/settings/EmailTemplateSettings';
import { LanguageSettings } from '@/components/settings/LanguageSettings';
import { TimezoneSettings } from '@/components/settings/TimezoneSettings';
import { AdminPortal } from '@/components/admin/AdminPortal';

interface SettingsWrapperProps {
  activeSubSection?: string;
}

const SettingsWrapper: React.FC<SettingsWrapperProps> = ({ activeSubSection = 'general' }) => {
  const { loading } = useAuth();
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const { t } = useTranslation();
  
  const canManageSettings = hasPermission('manage_settings');

  if (loading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">{t('common.loading')}</div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSubSection) {
      case 'language':
        return (
          <div className="space-y-6">
            <LanguageSettings />
          </div>
        );

      case 'timezone':
        return (
          <div className="space-y-6">
            <TimezoneSettings />
          </div>
        );

      case 'general':
        return (
          <div className="space-y-6">
            <LanguageSettings />
            <TimezoneSettings />
            <Card className="bg-gradient-surface border-border/50 shadow-surface">
              <CardHeader>
                <CardTitle className="text-primary">{t('common.settings')}</CardTitle>
                <CardDescription>
                  {t('settings.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {t('settings.description')}
                </p>
              </CardContent>
            </Card>
          </div>
        );

      case 'profile':
        return (
          <div className="space-y-6">
            <Card className="bg-gradient-surface border-border/50 shadow-surface">
              <CardHeader>
                <CardTitle className="text-primary">{t('settings.tabs.profile')}</CardTitle>
                <CardDescription>
                  {t('settings.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {t('settings.description')}
                </p>
              </CardContent>
            </Card>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <Card className="bg-gradient-surface border-border/50 shadow-surface">
              <CardHeader>
                <CardTitle className="text-primary">{t('settings.tabs.notifications')}</CardTitle>
                <CardDescription>
                  {t('settings.description')}
                </CardDescription>
              </CardHeader>
            </Card>
            <NotificationsList context="text" />
          </div>
        );

      case 'email-templates':
        return (
          <div className="space-y-6">
            <EmailTemplateSettings />
          </div>
        );

      case 'admin':
        return (
          <div className="space-y-6">
            {canManageSettings ? (
              <AdminPortal />
            ) : (
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  {t('settings.permissions.denied')}
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            <LanguageSettings />
            <TimezoneSettings />
          </div>
        );
    }
  };

  return (
    <div className="h-full">
      <div className="pane h-full">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {renderContent()}
        </div>
      </div>
      </div>
    </div>
  );
};

export default SettingsWrapper;
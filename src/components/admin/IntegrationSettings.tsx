import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmailAccountConnection } from '@/components/dashboard/EmailAccountConnection';
import { Separator } from '@/components/ui/separator';
import { Mail, MessageSquare, Instagram } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { InboxManagement } from '@/components/admin/InboxManagement';
import { useTranslation } from 'react-i18next';

export const IntegrationSettings = () => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      {/* Email accounts and inbox management */}

      {/* Email accounts and inbox management */}
      <Card className="bg-gradient-surface border-border/50 shadow-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Mail className="w-5 h-5" />
            {t('admin.emailIntegration')}
          </CardTitle>
          <CardDescription>
            {t('admin.connectAndManage')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <EmailAccountConnection />
          <Separator />
          <InboxManagement />
        </CardContent>
      </Card>

      {/* Channel toggles */}
      <Card className="bg-gradient-surface border-border/50 shadow-surface">
        <CardHeader>
          <CardTitle className="text-primary">{t('admin.channelSettings')}</CardTitle>
          <CardDescription>
            {t('admin.enableOrDisable')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-channel-email" />
              <div>
                <Label htmlFor="email-channel" className="text-sm font-medium">{t('admin.emailSupport')}</Label>
                <p className="text-xs text-muted-foreground">{t('admin.receiveAndRespond')}</p>
              </div>
            </div>
            <Switch id="email-channel" defaultChecked />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-channel-facebook" />
              <div>
                <Label htmlFor="messenger-channel" className="text-sm font-medium">{t('admin.facebookMessenger')}</Label>
                <p className="text-xs text-muted-foreground">{t('admin.connectCustomers')}</p>
              </div>
            </div>
            <Switch id="messenger-channel" />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Instagram className="w-5 h-5 text-channel-instagram" />
              <div>
                <Label htmlFor="instagram-channel" className="text-sm font-medium">{t('admin.instagramDMs')}</Label>
                <p className="text-xs text-muted-foreground">{t('admin.manageInstagram')}</p>
              </div>
            </div>
            <Switch id="instagram-channel" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

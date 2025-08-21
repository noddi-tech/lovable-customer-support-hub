import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmailAccountConnection } from '@/components/dashboard/EmailAccountConnection';
import { Separator } from '@/components/ui/separator';
import { Mail, MessageSquare, Instagram, Phone } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { InboxManagement } from '@/components/admin/InboxManagement';
import { VoiceIntegrationsList } from '@/components/admin/VoiceIntegrationsList';
import { useTranslation } from 'react-i18next';

export const IntegrationSettings = () => {
  const { t } = useTranslation();
  
  return (
    <div className="pane">
      <div className="space-y-6">
      <Tabs defaultValue="email" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-card/50 backdrop-blur-sm shadow-surface">
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            {t('admin.email')}
          </TabsTrigger>
          <TabsTrigger value="sms" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            {t('admin.sms')}
          </TabsTrigger>
          <TabsTrigger value="voice" className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            {t('admin.voice')}
          </TabsTrigger>
        </TabsList>

        {/* Email Integration Tab */}
        <TabsContent value="email" className="space-y-6">
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

          {/* Email channel settings */}
          <Card className="bg-gradient-surface border-border/50 shadow-surface">
            <CardHeader>
              <CardTitle className="text-primary">{t('admin.emailChannelSettings')}</CardTitle>
              <CardDescription>
                {t('admin.configureEmailSupport')}
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
        </TabsContent>

        {/* SMS Integration Tab */}
        <TabsContent value="sms" className="space-y-6">
          <Card className="bg-gradient-surface border-border/50 shadow-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <MessageSquare className="w-5 h-5" />
                {t('admin.smsIntegration')}
              </CardTitle>
              <CardDescription>
                {t('admin.smsConfiguration')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>SMS integration configuration will be available here</p>
                <p className="text-sm">Configure Twilio, Vonage, or other SMS providers</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Voice Integration Tab */}
        <TabsContent value="voice" className="space-y-6">
          <Card className="bg-gradient-surface border-border/50 shadow-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Phone className="w-5 h-5" />
                {t('admin.voiceIntegration')}
              </CardTitle>
              <CardDescription>
                Configure voice communication providers and telephony integrations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <VoiceIntegrationsList />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  </div>
  );
};

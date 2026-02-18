import { useState } from "react";
import { ResponsiveTabs, ResponsiveTabsList, ResponsiveTabsTrigger, ResponsiveTabsContent } from '@/components/admin/design/components/layouts';
import { Separator } from '@/components/ui/separator';
import { Mail, MessageSquare, Instagram, Phone, Plus, Inbox, Bell, MailCheck } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { VoiceIntegrationsList } from '@/components/admin/VoiceIntegrationsList';
import { EmailIntegrationWizard } from './EmailIntegrationWizard';
import { SlackIntegrationSettings } from './SlackIntegrationSettings';
import { IntegrationSection } from './integrations/IntegrationSection';
import { IntegrationStatusBadge } from './IntegrationStatusBadge';
import { InboundRoutesContent } from './integrations/InboundRoutesContent';
import { SendgridSetupWizard } from './SendgridSetupWizard';
import { Globe } from 'lucide-react';
import { ConnectedEmailAccountsContent } from '@/components/dashboard/ConnectedEmailAccounts';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVoiceIntegrations } from '@/hooks/useVoiceIntegrations';

export const IntegrationSettings = () => {
  const { t } = useTranslation();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  
  // Fetch email accounts for status badges
  const { data: emailAccounts = [] } = useQuery({
    queryKey: ['email-accounts-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_accounts')
        .select('id, provider, is_active');
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch inbound routes for Google Group status
  const { data: inboundRoutes = [] } = useQuery({
    queryKey: ['inbound-routes-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inbound_routes')
        .select('id, is_active');
      if (error) throw error;
      return data || [];
    }
  });

  // Get voice integration status
  const { integrations: voiceIntegrations } = useVoiceIntegrations();

  // Calculate counts
  const activeAccountCount = emailAccounts.filter(acc => acc.is_active).length;
  const activeRoutesCount = inboundRoutes.filter(r => r.is_active).length;
  const hasActiveVoice = voiceIntegrations?.some(i => i.is_active);

  // Determine statuses
  const getGmailStatus = (): 'active' | 'inactive' | 'not-configured' => {
    if (activeAccountCount > 0) return 'active';
    if (emailAccounts.length > 0) return 'inactive';
    return 'not-configured';
  };

  const getForwardingStatus = (): 'active' | 'inactive' | 'not-configured' => {
    if (activeRoutesCount > 0) return 'active';
    if (inboundRoutes.length > 0) return 'inactive';
    return 'not-configured';
  };

  const getVoiceStatus = (): 'active' | 'inactive' | 'not-configured' => {
    if (hasActiveVoice) return 'active';
    if (voiceIntegrations && voiceIntegrations.length > 0) return 'inactive';
    return 'not-configured';
  };
  
  return (
    <div className="space-y-6 px-5">
      <EmailIntegrationWizard open={isWizardOpen} onOpenChange={setIsWizardOpen} />

      <ResponsiveTabs 
        defaultValue="email" 
        variant="pills" 
        size="md" 
        equalWidth 
        className="space-y-6"
      >
        <ResponsiveTabsList className="flex flex-wrap items-center gap-2 min-w-0 bg-card/50 backdrop-blur-sm shadow-surface">
          <ResponsiveTabsTrigger value="email">
            <Mail className="w-4 h-4" aria-hidden />
            <span>{t('admin.email')}</span>
          </ResponsiveTabsTrigger>
          <ResponsiveTabsTrigger value="sms">
            <MessageSquare className="w-4 h-4" aria-hidden />
            <span>{t('admin.sms')}</span>
          </ResponsiveTabsTrigger>
          <ResponsiveTabsTrigger value="voice">
            <Phone className="w-4 h-4" aria-hidden />
            <span>{t('admin.voice')}</span>
          </ResponsiveTabsTrigger>
          <ResponsiveTabsTrigger value="notifications">
            <Bell className="w-4 h-4" aria-hidden />
            <span>Notifications</span>
          </ResponsiveTabsTrigger>
        </ResponsiveTabsList>

        {/* Email Integration Tab */}
        <ResponsiveTabsContent value="email" className="space-y-4">
          {/* Quick Start CTA - inline banner */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Inbox className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Quick Start: Add Email Integration</p>
                <p className="text-sm text-muted-foreground">
                  Connect Gmail, Google Group, or set up forwarding
                </p>
              </div>
            </div>
            <Button onClick={() => setIsWizardOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Email
            </Button>
          </div>

          {/* SendGrid Email Channels - Primary Email Integration */}
          <IntegrationSection
            icon={MailCheck}
            title="Email Channels (SendGrid)"
            description="Send and receive emails via SendGrid – bidirectional email routing"
            defaultOpen={true}
            statusBadge={
              <IntegrationStatusBadge status={getForwardingStatus()} />
            }
          >
            <InboundRoutesContent />
          </IntegrationSection>

          {/* Domain Setup (SendGrid) */}
          <IntegrationSection
            icon={Globe}
            title="Domain Setup (SendGrid)"
            description="Add new email domains, create parse routes, and manage DNS records"
            defaultOpen={false}
          >
            <SendgridSetupWizard />
          </IntegrationSection>

          {/* Gmail Direct Sync - Secondary */}
          <IntegrationSection
            icon={Mail}
            title="Gmail Direct Sync"
            description="Connect Gmail accounts via OAuth for direct email sync"
            defaultOpen={false}
            statusBadge={
              <IntegrationStatusBadge status={getGmailStatus()} />
            }
          >
            <ConnectedEmailAccountsContent />
          </IntegrationSection>

          {/* Email Channel Settings Section */}
          <IntegrationSection
            icon={MessageSquare}
            title="Email Channel Settings"
            description="Configure email support channels"
            defaultOpen={false}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2">
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

              <div className="flex items-center justify-between py-2">
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

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Instagram className="w-5 h-5 text-channel-instagram" />
                  <div>
                    <Label htmlFor="instagram-channel" className="text-sm font-medium">{t('admin.instagramDMs')}</Label>
                    <p className="text-xs text-muted-foreground">{t('admin.manageInstagram')}</p>
                  </div>
                </div>
                <Switch id="instagram-channel" />
              </div>
            </div>
          </IntegrationSection>
        </ResponsiveTabsContent>

        {/* SMS Integration Tab */}
        <ResponsiveTabsContent value="sms" className="space-y-4">
          <IntegrationSection
            icon={MessageSquare}
            title={t('admin.smsIntegration')}
            description={t('admin.smsConfiguration')}
            defaultOpen={false}
            statusBadge={
              <IntegrationStatusBadge status="not-configured" />
            }
          >
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>SMS integration configuration will be available here</p>
              <p className="text-sm">Configure Twilio, Vonage, or other SMS providers</p>
            </div>
          </IntegrationSection>
        </ResponsiveTabsContent>

        {/* Voice Integration Tab */}
        <ResponsiveTabsContent value="voice" className="space-y-4">
          <IntegrationSection
            icon={Phone}
            title={t('admin.voiceIntegration')}
            description="Configure voice communication providers and telephony integrations"
            defaultOpen={false}
            statusBadge={
              <IntegrationStatusBadge status={getVoiceStatus()} />
            }
          >
            <VoiceIntegrationsList />
          </IntegrationSection>
        </ResponsiveTabsContent>

        {/* Notifications Integration Tab */}
        <ResponsiveTabsContent value="notifications" className="space-y-4">
          <SlackIntegrationSettings />
        </ResponsiveTabsContent>
      </ResponsiveTabs>
    </div>
  );
};

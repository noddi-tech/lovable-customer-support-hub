import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MessageSquare, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const MessagingSettings = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-surface border-border/50 shadow-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Social Messaging Channels
          </CardTitle>
          <CardDescription>
            Configure social media messaging integrations for customer communication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="facebook-messenger">Facebook Messenger</Label>
              <p className="text-sm text-muted-foreground">
                Connect Facebook Messenger to receive messages from your Facebook page
              </p>
            </div>
            <Switch id="facebook-messenger" />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="instagram-dm">Instagram Direct Messages</Label>
              <p className="text-sm text-muted-foreground">
                Connect Instagram to receive direct messages from your Instagram account
              </p>
            </div>
            <Switch id="instagram-dm" />
          </div>

          <div className="flex items-center justify-between opacity-50">
            <div className="space-y-0.5">
              <Label htmlFor="whatsapp">WhatsApp Business</Label>
              <p className="text-sm text-muted-foreground">
                Coming soon - Connect WhatsApp Business API
              </p>
            </div>
            <Switch id="whatsapp" disabled />
          </div>

          <div className="flex items-center justify-between opacity-50">
            <div className="space-y-0.5">
              <Label htmlFor="telegram">Telegram</Label>
              <p className="text-sm text-muted-foreground">
                Coming soon - Connect Telegram bot for customer support
              </p>
            </div>
            <Switch id="telegram" disabled />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-surface border-border/50 shadow-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            SMS & Text Messaging
          </CardTitle>
          <CardDescription>
            Configure SMS providers for text message communication
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="mb-2">SMS integration configuration coming soon</p>
            <p className="text-sm">Configure providers like Twilio, Vonage, or AWS SNS</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

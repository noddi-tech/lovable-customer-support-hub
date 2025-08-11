import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmailAccountConnection } from '@/components/dashboard/EmailAccountConnection';
import { Separator } from '@/components/ui/separator';
import { Mail, MessageSquare, Instagram } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { InboxManagement } from '@/components/admin/InboxManagement';
import { SendgridSetupWizard } from '@/components/admin/SendgridSetupWizard';
export const IntegrationSettings = () => {
  return (
    <div className="space-y-6">
      <SendgridSetupWizard />
      <Card className="bg-gradient-surface border-border/50 shadow-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Mail className="w-5 h-5" />
            Email Integration
          </CardTitle>
          <CardDescription>
            Connect and manage email accounts for your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <EmailAccountConnection />
          <Separator />
          <InboxManagement />
        </CardContent>
      </Card>

      <Card className="bg-gradient-surface border-border/50 shadow-surface">
        <CardHeader>
          <CardTitle className="text-primary">Channel Settings</CardTitle>
          <CardDescription>
            Enable or disable communication channels for your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-channel-email" />
              <div>
                <Label htmlFor="email-channel" className="text-sm font-medium">Email Support</Label>
                <p className="text-xs text-muted-foreground">Receive and respond to emails</p>
              </div>
            </div>
            <Switch id="email-channel" defaultChecked />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-channel-facebook" />
              <div>
                <Label htmlFor="messenger-channel" className="text-sm font-medium">Facebook Messenger</Label>
                <p className="text-xs text-muted-foreground">Connect with customers via Messenger</p>
              </div>
            </div>
            <Switch id="messenger-channel" />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Instagram className="w-5 h-5 text-channel-instagram" />
              <div>
                <Label htmlFor="instagram-channel" className="text-sm font-medium">Instagram DMs</Label>
                <p className="text-xs text-muted-foreground">Manage Instagram direct messages</p>
              </div>
            </div>
            <Switch id="instagram-channel" />
          </div>
        </CardContent>
      </Card>

    </div>
  );
};
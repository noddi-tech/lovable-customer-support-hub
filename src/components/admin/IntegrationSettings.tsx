import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmailAccountConnection } from '@/components/dashboard/EmailAccountConnection';
import { Separator } from '@/components/ui/separator';
import { Mail, MessageSquare, Instagram } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export const IntegrationSettings = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Integration
          </CardTitle>
          <CardDescription>
            Connect and manage email accounts for your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmailAccountConnection />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Channel Settings</CardTitle>
          <CardDescription>
            Enable or disable communication channels for your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-blue-500" />
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
              <MessageSquare className="w-5 h-5 text-green-500" />
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
              <Instagram className="w-5 h-5 text-pink-500" />
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
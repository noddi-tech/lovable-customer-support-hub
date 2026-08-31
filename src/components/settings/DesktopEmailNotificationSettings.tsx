import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MonitorSmartphone } from 'lucide-react';
import { toast } from 'sonner';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';
import { useDesktopEmailNotificationsSetting } from '@/hooks/useDesktopEmailNotifications';

export function DesktopEmailNotificationSettings() {
  const { permission, isSupported, requestPermission } = useBrowserNotifications();
  const { enabled, setEnabled } = useDesktopEmailNotificationsSetting();

  const handleToggle = async (checked: boolean) => {
    if (!checked) {
      setEnabled(false);
      return;
    }

    if (permission !== 'granted') {
      const result = await requestPermission();
      if (result !== 'granted') {
        toast.error('Browser notifications are blocked. Allow them in your browser settings.');
        return;
      }
    }
    setEnabled(true);
    toast.success('Desktop notifications enabled for new emails');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MonitorSmartphone className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">Desktop notifications</CardTitle>
        </div>
        <CardDescription>
          Get a browser notification on this device when a new email or chat message arrives in your inboxes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isSupported ? (
          <p className="text-sm text-muted-foreground">
            This browser does not support desktop notifications.
          </p>
        ) : (
          <div className="flex items-center justify-between py-1">
            <div className="space-y-0.5">
              <Label htmlFor="desktop-email-notifications" className="text-sm font-medium cursor-pointer">
                New email & chat notifications
              </Label>
              <p className="text-xs text-muted-foreground">
                {permission === 'denied'
                  ? 'Notifications are blocked for this site — enable them in your browser settings first.'
                  : 'Shows sender and subject; clicking opens the conversation.'}
              </p>
            </div>
            {permission === 'denied' ? (
              <Button variant="outline" size="sm" disabled>
                Blocked
              </Button>
            ) : (
              <Switch
                id="desktop-email-notifications"
                checked={enabled && permission === 'granted'}
                onCheckedChange={handleToggle}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

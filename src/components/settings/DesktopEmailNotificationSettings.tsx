import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MonitorSmartphone, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';
import { useDesktopEmailNotificationsSetting } from '@/hooks/useDesktopEmailNotifications';

/** The Lovable preview runs inside an iframe, where browsers block notification prompts. */
const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

export function DesktopEmailNotificationSettings() {
  const { permission, isSupported, requestPermission, refreshPermission } = useBrowserNotifications();
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
          <div className="space-y-3">
            <div className="flex items-center justify-between py-1">
              <div className="space-y-0.5">
                <Label htmlFor="desktop-email-notifications" className="text-sm font-medium cursor-pointer">
                  New email & chat notifications
                </Label>
                <p className="text-xs text-muted-foreground">
                  {permission === 'denied'
                    ? 'Notifications are blocked for this site — you have to re-allow them in the browser itself.'
                    : 'Shows sender and subject; clicking opens the conversation.'}
                </p>
              </div>
              {permission === 'denied' ? (
                <Button variant="outline" size="sm" onClick={handleRecheck}>
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  Re-check
                </Button>
              ) : (
                <Switch
                  id="desktop-email-notifications"
                  checked={enabled && permission === 'granted'}
                  onCheckedChange={handleToggle}
                />
              )}
            </div>

            {permission === 'denied' && (
              <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">How to unblock</p>
                <ul className="list-disc space-y-1 pl-4">
                  <li>Click the lock / settings icon left of the address bar.</li>
                  <li>Set <span className="font-medium">Notifications</span> to “Allow” (or reset the permission).</li>
                  <li>Reload this page, then press “Re-check”.</li>
                </ul>
                {isInIframe && (
                  <p>
                    You are viewing this inside an embedded preview, where browsers refuse the
                    notification prompt. Open the app in its own tab to enable them.
                  </p>
                )}
              </div>
            )}

            {isInIframe && permission !== 'granted' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(window.location.href, '_blank', 'noopener')}
              >
                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                Open app in a new tab
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

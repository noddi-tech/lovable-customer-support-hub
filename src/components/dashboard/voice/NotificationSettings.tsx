import React from 'react';
import { Bell, BellOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';

interface NotificationSettingsProps {
  soundEnabled: boolean;
  onSoundEnabledChange: (enabled: boolean) => void;
  soundVolume: number;
  onSoundVolumeChange: (volume: number) => void;
  browserNotificationsEnabled: boolean;
  onBrowserNotificationsEnabledChange: (enabled: boolean) => void;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  soundEnabled,
  onSoundEnabledChange,
  soundVolume,
  onSoundVolumeChange,
  browserNotificationsEnabled,
  onBrowserNotificationsEnabledChange,
}) => {
  const { permission, requestPermission, isSupported } = useBrowserNotifications();

  const handleBrowserNotificationsToggle = async (checked: boolean) => {
    if (checked && permission !== 'granted') {
      const result = await requestPermission();
      if (result === 'granted') {
        onBrowserNotificationsEnabledChange(true);
      }
    } else {
      onBrowserNotificationsEnabledChange(checked);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          {soundEnabled || browserNotificationsEnabled ? (
            <Bell className="h-4 w-4" />
          ) : (
            <BellOff className="h-4 w-4" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm mb-3">Notification Settings</h4>
          </div>

          {/* Sound Notifications */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <VolumeX className="h-4 w-4 text-muted-foreground" />
                )}
                <Label htmlFor="sound-enabled" className="text-sm">
                  Sound Alerts
                </Label>
              </div>
              <Switch
                id="sound-enabled"
                checked={soundEnabled}
                onCheckedChange={onSoundEnabledChange}
              />
            </div>

            {soundEnabled && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="sound-volume" className="text-xs text-muted-foreground">
                  Volume: {Math.round(soundVolume * 100)}%
                </Label>
                <Slider
                  id="sound-volume"
                  min={0}
                  max={1}
                  step={0.1}
                  value={[soundVolume]}
                  onValueChange={(values) => onSoundVolumeChange(values[0])}
                  className="w-full"
                />
              </div>
            )}
          </div>

          {/* Browser Notifications */}
          {isSupported && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="browser-notifications" className="text-sm">
                    Browser Notifications
                  </Label>
                </div>
                <Switch
                  id="browser-notifications"
                  checked={browserNotificationsEnabled && permission === 'granted'}
                  onCheckedChange={handleBrowserNotificationsToggle}
                  disabled={permission === 'denied'}
                />
              </div>

              {permission === 'denied' && (
                <p className="text-xs text-destructive pl-6">
                  Permission denied. Please enable in browser settings.
                </p>
              )}

              {permission === 'default' && (
                <p className="text-xs text-muted-foreground pl-6">
                  Click the switch to request permission
                </p>
              )}
            </div>
          )}

          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              Get notified for incoming calls, missed calls, voicemails, and callback requests.
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

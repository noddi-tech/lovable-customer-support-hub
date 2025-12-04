import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useNotificationPreferences, NotificationPreferences } from '@/hooks/useNotificationPreferences';
import { Mail, Bell, Calendar, Loader2 } from 'lucide-react';

interface NotificationToggleProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

function NotificationToggle({ id, label, description, checked, onCheckedChange, disabled }: NotificationToggleProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="text-sm font-medium cursor-pointer">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

export function UserNotificationSettings() {
  const { preferences, isLoading, updatePreferences, isUpdating } = useNotificationPreferences();

  const handleToggle = (key: keyof NotificationPreferences) => (checked: boolean) => {
    updatePreferences({ [key]: checked });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!preferences) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Unable to load notification preferences.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Email Notifications</CardTitle>
          </div>
          <CardDescription>
            Choose which events trigger email notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <NotificationToggle
            id="email_on_ticket_assigned"
            label="Ticket assigned to me"
            description="Receive an email when a ticket is assigned to you"
            checked={preferences.email_on_ticket_assigned ?? true}
            onCheckedChange={handleToggle('email_on_ticket_assigned')}
            disabled={isUpdating}
          />
          <Separator />
          <NotificationToggle
            id="email_on_ticket_updated"
            label="Ticket updates"
            description="Receive an email when a ticket you're involved with is updated"
            checked={preferences.email_on_ticket_updated ?? false}
            onCheckedChange={handleToggle('email_on_ticket_updated')}
            disabled={isUpdating}
          />
          <Separator />
          <NotificationToggle
            id="email_on_ticket_commented"
            label="New comments"
            description="Receive an email when someone comments on your ticket"
            checked={preferences.email_on_ticket_commented ?? true}
            onCheckedChange={handleToggle('email_on_ticket_commented')}
            disabled={isUpdating}
          />
          <Separator />
          <NotificationToggle
            id="email_on_sla_breach"
            label="SLA breach warnings"
            description="Receive an email when an SLA is about to breach"
            checked={preferences.email_on_sla_breach ?? true}
            onCheckedChange={handleToggle('email_on_sla_breach')}
            disabled={isUpdating}
          />
        </CardContent>
      </Card>

      {/* In-App Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">In-App Notifications</CardTitle>
          </div>
          <CardDescription>
            Choose which events show notifications in the app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <NotificationToggle
            id="app_on_ticket_assigned"
            label="Ticket assigned to me"
            description="Show a notification when a ticket is assigned to you"
            checked={preferences.app_on_ticket_assigned ?? true}
            onCheckedChange={handleToggle('app_on_ticket_assigned')}
            disabled={isUpdating}
          />
          <Separator />
          <NotificationToggle
            id="app_on_ticket_updated"
            label="Ticket updates"
            description="Show a notification when a ticket you're involved with is updated"
            checked={preferences.app_on_ticket_updated ?? true}
            onCheckedChange={handleToggle('app_on_ticket_updated')}
            disabled={isUpdating}
          />
          <Separator />
          <NotificationToggle
            id="app_on_ticket_commented"
            label="New comments"
            description="Show a notification when someone comments on your ticket"
            checked={preferences.app_on_ticket_commented ?? true}
            onCheckedChange={handleToggle('app_on_ticket_commented')}
            disabled={isUpdating}
          />
          <Separator />
          <NotificationToggle
            id="app_on_sla_breach"
            label="SLA breach warnings"
            description="Show a notification when an SLA is about to breach"
            checked={preferences.app_on_sla_breach ?? true}
            onCheckedChange={handleToggle('app_on_sla_breach')}
            disabled={isUpdating}
          />
        </CardContent>
      </Card>

      {/* Digest Emails */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Digest Emails</CardTitle>
          </div>
          <CardDescription>
            Receive periodic summaries of activity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <NotificationToggle
            id="daily_digest_enabled"
            label="Daily digest"
            description="Receive a daily summary of activity every morning"
            checked={preferences.daily_digest_enabled ?? false}
            onCheckedChange={handleToggle('daily_digest_enabled')}
            disabled={isUpdating}
          />
          <Separator />
          <NotificationToggle
            id="weekly_digest_enabled"
            label="Weekly digest"
            description="Receive a weekly summary every Monday morning"
            checked={preferences.weekly_digest_enabled ?? true}
            onCheckedChange={handleToggle('weekly_digest_enabled')}
            disabled={isUpdating}
          />
        </CardContent>
      </Card>
    </div>
  );
}

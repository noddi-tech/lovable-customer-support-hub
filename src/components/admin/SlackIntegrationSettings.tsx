import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle2, Hash, Lock, Send, ExternalLink, Slack, Info, Clock, AlertTriangle, BarChart3, Building2 } from 'lucide-react';
import { useSlackIntegration } from '@/hooks/useSlackIntegration';
import { SlackSetupWizard } from './SlackSetupWizard';

const EVENT_OPTIONS = [
  { id: 'new_conversation', label: 'New Conversation', description: 'When a new email/message arrives' },
  { id: 'customer_reply', label: 'Customer Reply', description: 'When a customer responds' },
  { id: 'assignment', label: 'Assignment Changed', description: 'When assigned to someone' },
  { id: 'mention', label: '@Mention', description: "When you're mentioned in a note" },
  { id: 'sla_warning', label: 'SLA Warning', description: 'Before an SLA breach' },
] as const;

export const SlackIntegrationSettings = () => {
  const {
    integration,
    isLoading,
    isConnected,
    setupCompleted,
    channels,
    isLoadingChannels,
    refetchChannels,
    refetch,
    disconnectSlack,
    updateConfiguration,
    testConnection,
    hasSecondaryWorkspace,
    secondaryChannels,
    isLoadingSecondaryChannels,
    refetchSecondaryChannels,
    saveSecondaryToken,
    disconnectSecondary,
  } = useSlackIntegration();

  const [localConfig, setLocalConfig] = useState({
    enabled_events: ['new_conversation', 'customer_reply', 'assignment', 'mention'] as string[],
    mention_assigned_user: true,
    include_message_preview: true,
    digest_enabled: false,
    digest_time: '08:00',
    critical_alerts_enabled: false,
  });
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [digestChannelId, setDigestChannelId] = useState<string>('');
  const [criticalChannelId, setCriticalChannelId] = useState<string>('');
  const [secondaryToken, setSecondaryToken] = useState('');

  // Channels for digest/critical: use secondary workspace if connected, else primary
  const routingChannels = hasSecondaryWorkspace ? secondaryChannels : channels;
  const isLoadingRoutingChannels = hasSecondaryWorkspace ? isLoadingSecondaryChannels : isLoadingChannels;

  // Sync local state with fetched integration
  useEffect(() => {
    if (integration) {
      setLocalConfig({
        enabled_events: integration.configuration?.enabled_events || [],
        mention_assigned_user: integration.configuration?.mention_assigned_user ?? true,
        include_message_preview: integration.configuration?.include_message_preview ?? true,
        digest_enabled: integration.configuration?.digest_enabled ?? false,
        digest_time: integration.configuration?.digest_time || '08:00',
        critical_alerts_enabled: integration.configuration?.critical_alerts_enabled ?? false,
      });
      setSelectedChannelId(integration.default_channel_id || '');
      setDigestChannelId(integration.digest_channel_id || '');
      setCriticalChannelId(integration.critical_channel_id || '');
    }
  }, [integration]);

  const handleDisconnect = () => {
    if (confirm('Are you sure you want to disconnect Slack? You will stop receiving notifications.')) {
      disconnectSlack.mutate();
    }
  };

  const handleChannelChange = (channelId: string) => {
    const channel = channels.find(c => c.id === channelId);
    setSelectedChannelId(channelId);
    updateConfiguration.mutate({
      default_channel_id: channelId,
      default_channel_name: channel?.name || '',
    });
  };

  const handleEventToggle = (eventId: string, enabled: boolean) => {
    const newEvents = enabled
      ? [...localConfig.enabled_events, eventId]
      : localConfig.enabled_events.filter(e => e !== eventId);
    
    setLocalConfig(prev => ({ ...prev, enabled_events: newEvents }));
    updateConfiguration.mutate({
      configuration: { enabled_events: newEvents },
    });
  };

  const handleAdvancedToggle = (key: 'mention_assigned_user' | 'include_message_preview', enabled: boolean) => {
    setLocalConfig(prev => ({ ...prev, [key]: enabled }));
    updateConfiguration.mutate({
      configuration: { [key]: enabled },
    });
  };

  const handleConnectSecondary = () => {
    if (!secondaryToken.trim()) return;
    saveSecondaryToken.mutate({ bot_token: secondaryToken.trim() }, {
      onSuccess: () => setSecondaryToken(''),
    });
  };

  const handleDisconnectSecondary = () => {
    if (confirm('Disconnect secondary workspace? Digest and critical alerts will fall back to the primary workspace.')) {
      disconnectSecondary.mutate();
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-surface border-border/50">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Show setup wizard if not connected
  if (!isConnected || !setupCompleted) {
    return <SlackSetupWizard onComplete={() => refetch()} />;
  }

  return (
    <div className="space-y-6">
      {/* Connection Status Card */}
      <Card className="bg-gradient-surface border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#4A154B]/10">
                <Slack className="h-6 w-6 text-[#4A154B]" />
              </div>
              <div>
                <CardTitle className="text-lg">Slack Integration</CardTitle>
                <CardDescription>
                  Post notifications to your team's Slack workspace
                </CardDescription>
              </div>
            </div>
            <Badge 
              variant="default"
              className="bg-success/10 text-success border-success/20"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div>
                <p className="font-medium">{integration?.team_name}</p>
                <p className="text-sm text-muted-foreground">Slack Workspace</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnectSlack.isPending}
              >
                {disconnectSlack.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Disconnect'
                )}
              </Button>
            </div>

            {/* Channel Selection */}
            <div className="space-y-2">
              <Label>Default Notification Channel</Label>
              <div className="flex gap-2">
                <Select
                  value={selectedChannelId}
                  onValueChange={handleChannelChange}
                  disabled={isLoadingChannels}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a channel..." />
                  </SelectTrigger>
                  <SelectContent>
                    {channels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        <div className="flex items-center gap-2">
                          {channel.is_private ? (
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <Hash className="h-3 w-3 text-muted-foreground" />
                          )}
                          {channel.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => refetchChannels()}
                  disabled={isLoadingChannels}
                >
                  {isLoadingChannels ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                All notifications will be sent to this channel unless overridden
              </p>

              {/* Bot invitation instruction */}
              {selectedChannelId && (
                <Alert className="mt-3 bg-amber-500/10 border-amber-500/30">
                  <Info className="h-4 w-4 text-amber-500" />
                  <AlertDescription className="text-sm">
                    <span className="font-medium">Important:</span> You must invite the bot to your channel before it can post notifications.
                    <ol className="mt-2 ml-4 list-decimal space-y-1 text-muted-foreground">
                      <li>Open <span className="font-mono text-foreground">#{channels.find(c => c.id === selectedChannelId)?.name || 'your-channel'}</span> in Slack</li>
                      <li>Type <span className="font-mono bg-muted px-1.5 py-0.5 rounded">/invite @{integration?.team_name || 'YourBotName'}</span></li>
                      <li>Press Enter to add the bot to the channel</li>
                    </ol>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Test Connection */}
            {selectedChannelId && (
              <Button
                variant="outline"
                onClick={() => testConnection.mutate()}
                disabled={testConnection.isPending}
                className="w-full"
              >
                {testConnection.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Test Notification
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Secondary Workspace (Product Team) */}
      <Card className="bg-gradient-surface border-border/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Product Team Workspace</CardTitle>
              <CardDescription>
                Route daily digests and critical alerts to a different Slack workspace
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasSecondaryWorkspace ? (
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium">{integration?.secondary_team_name}</p>
                  <p className="text-sm text-muted-foreground">Secondary Workspace</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnectSecondary}
                disabled={disconnectSecondary.isPending}
              >
                {disconnectSecondary.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Disconnect'
                )}
              </Button>
            </div>
          ) : (
            <SecondarySlackSetupWizard
              onConnect={async (token) => {
                await saveSecondaryToken.mutateAsync({ bot_token: token });
              }}
              isConnecting={saveSecondaryToken.isPending}
            />
          )}
        </CardContent>
      </Card>

      {/* Event Configuration */}
      <Card className="bg-gradient-surface border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Notification Events</CardTitle>
          <CardDescription>
            Choose which events trigger Slack notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {EVENT_OPTIONS.map((event, index) => (
            <div key={event.id}>
              {index > 0 && <Separator className="mb-4" />}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor={event.id} className="font-medium">
                    {event.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {event.description}
                  </p>
                </div>
                <Switch
                  id={event.id}
                  checked={localConfig.enabled_events.includes(event.id)}
                  onCheckedChange={(checked) => handleEventToggle(event.id, checked)}
                  disabled={updateConfiguration.isPending}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Daily Digest Channel */}
      <Card className="bg-gradient-surface border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Daily Digest</CardTitle>
                <CardDescription>
                  Push a daily summary of conversations to a Slack channel
                  {hasSecondaryWorkspace && (
                    <span className="ml-1 text-primary">
                      (→ {integration?.secondary_team_name})
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={localConfig.digest_enabled}
              onCheckedChange={(checked) => {
                setLocalConfig(prev => ({ ...prev, digest_enabled: checked }));
                updateConfiguration.mutate({
                  configuration: { digest_enabled: checked },
                });
              }}
              disabled={updateConfiguration.isPending}
            />
          </div>
        </CardHeader>
        {localConfig.digest_enabled && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Digest Channel</Label>
              <div className="flex gap-2">
                <Select
                  value={digestChannelId}
                  onValueChange={(channelId) => {
                    const channel = routingChannels.find(c => c.id === channelId);
                    setDigestChannelId(channelId);
                    updateConfiguration.mutate({
                      digest_channel_id: channelId,
                      digest_channel_name: channel?.name || '',
                    });
                  }}
                  disabled={isLoadingRoutingChannels}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a channel for daily digest..." />
                  </SelectTrigger>
                  <SelectContent>
                    {routingChannels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        <div className="flex items-center gap-2">
                          {channel.is_private ? (
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <Hash className="h-3 w-3 text-muted-foreground" />
                          )}
                          {channel.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasSecondaryWorkspace && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => refetchSecondaryChannels()}
                    disabled={isLoadingSecondaryChannels}
                  >
                    {isLoadingSecondaryChannels ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Send digest at
              </Label>
              <Input
                type="time"
                value={localConfig.digest_time}
                onChange={(e) => {
                  const newTime = e.target.value;
                  setLocalConfig(prev => ({ ...prev, digest_time: newTime }));
                  updateConfiguration.mutate({
                    configuration: { digest_time: newTime },
                  });
                }}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">
                Weekdays only (Mon–Fri), Oslo timezone
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Critical Alerts Channel */}
      <Card className="bg-gradient-surface border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-lg">Critical Alerts</CardTitle>
                <CardDescription>
                  Instantly push critical issues (booking errors, payment failures) to a dedicated channel
                  {hasSecondaryWorkspace && (
                    <span className="ml-1 text-primary">
                      (→ {integration?.secondary_team_name})
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={localConfig.critical_alerts_enabled}
              onCheckedChange={(checked) => {
                setLocalConfig(prev => ({ ...prev, critical_alerts_enabled: checked }));
                updateConfiguration.mutate({
                  configuration: { critical_alerts_enabled: checked },
                });
              }}
              disabled={updateConfiguration.isPending}
            />
          </div>
        </CardHeader>
        {localConfig.critical_alerts_enabled && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Critical Alerts Channel</Label>
              <div className="flex gap-2">
                <Select
                  value={criticalChannelId}
                  onValueChange={(channelId) => {
                    const channel = routingChannels.find(c => c.id === channelId);
                    setCriticalChannelId(channelId);
                    updateConfiguration.mutate({
                      critical_channel_id: channelId,
                      critical_channel_name: channel?.name || '',
                    });
                  }}
                  disabled={isLoadingRoutingChannels}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a channel for critical alerts..." />
                  </SelectTrigger>
                  <SelectContent>
                    {routingChannels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        <div className="flex items-center gap-2">
                          {channel.is_private ? (
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <Hash className="h-3 w-3 text-muted-foreground" />
                          )}
                          {channel.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasSecondaryWorkspace && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => refetchSecondaryChannels()}
                    disabled={isLoadingSecondaryChannels}
                  >
                    {isLoadingSecondaryChannels ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>

            <Alert className="bg-destructive/5 border-destructive/20">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-sm">
                Critical alerts are triggered by keywords in Norwegian and English like <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">bestilling feilet</span>, <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">fungerer ikke</span>, <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">payment failed</span>, or conversations marked as <span className="font-semibold">urgent/high</span> priority.
                Messages will include <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">@channel</span> to notify everyone.
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Advanced Settings */}
      <Card className="bg-gradient-surface border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Advanced Settings</CardTitle>
          <CardDescription>
            Customize notification behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="mention-user" className="font-medium">
                @mention assigned user
              </Label>
              <p className="text-sm text-muted-foreground">
                Tag the assigned user in Slack when they receive a notification
              </p>
            </div>
            <Switch
              id="mention-user"
              checked={localConfig.mention_assigned_user}
              onCheckedChange={(checked) => handleAdvancedToggle('mention_assigned_user', checked)}
              disabled={updateConfiguration.isPending}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="include-preview" className="font-medium">
                Include message preview
              </Label>
              <p className="text-sm text-muted-foreground">
                Show the first 200 characters of the message in the notification
              </p>
            </div>
            <Switch
              id="include-preview"
              checked={localConfig.include_message_preview}
              onCheckedChange={(checked) => handleAdvancedToggle('include_message_preview', checked)}
              disabled={updateConfiguration.isPending}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, Hash, Lock, Send, ExternalLink, Slack, Info } from 'lucide-react';
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
  } = useSlackIntegration();

  const [localConfig, setLocalConfig] = useState({
    enabled_events: ['new_conversation', 'customer_reply', 'assignment', 'mention'] as string[],
    mention_assigned_user: true,
    include_message_preview: true,
  });
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');

  // Sync local state with fetched integration
  useEffect(() => {
    if (integration) {
      setLocalConfig({
        enabled_events: integration.configuration?.enabled_events || [],
        mention_assigned_user: integration.configuration?.mention_assigned_user ?? true,
        include_message_preview: integration.configuration?.include_message_preview ?? true,
      });
      setSelectedChannelId(integration.default_channel_id || '');
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

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, CheckCircle2, XCircle, Hash, Lock, Send, ExternalLink, Settings, Eye, EyeOff, AlertTriangle, Slack } from 'lucide-react';
import { useSlackIntegration } from '@/hooks/useSlackIntegration';
import { SlackSetupWizard } from './SlackSetupWizard';
import { toast } from 'sonner';

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
    hasCredentials,
    channels,
    isLoadingChannels,
    refetchChannels,
    refetch,
    getAuthorizationUrl,
    disconnectSlack,
    updateConfiguration,
    testConnection,
    testCredentials,
    saveCredentials,
  } = useSlackIntegration();

  const [localConfig, setLocalConfig] = useState({
    enabled_events: ['new_conversation', 'customer_reply', 'assignment', 'mention'] as string[],
    mention_assigned_user: true,
    include_message_preview: true,
  });
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  
  // Reconfigure dialog state
  const [isReconfigureOpen, setIsReconfigureOpen] = useState(false);
  const [reconfigClientId, setReconfigClientId] = useState('');
  const [reconfigClientSecret, setReconfigClientSecret] = useState('');
  const [showReconfigSecret, setShowReconfigSecret] = useState(false);
  const [isTestingReconfigCredentials, setIsTestingReconfigCredentials] = useState(false);
  const [reconfigCredentialsTested, setReconfigCredentialsTested] = useState(false);
  const [isSavingReconfigCredentials, setIsSavingReconfigCredentials] = useState(false);

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

  // Pre-fill reconfigure dialog when opened
  useEffect(() => {
    if (isReconfigureOpen && integration?.client_id) {
      setReconfigClientId(integration.client_id);
      setReconfigClientSecret('');
      setReconfigCredentialsTested(false);
    }
  }, [isReconfigureOpen, integration?.client_id]);

  const handleConnect = async () => {
    try {
      const result = await getAuthorizationUrl.mutateAsync();
      if (result?.authorization_url) {
        window.location.href = result.authorization_url;
      }
    } catch (error) {
      console.error('Failed to get authorization URL:', error);
    }
  };

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

  const handleTestReconfigCredentials = async () => {
    if (!reconfigClientId || !reconfigClientSecret) {
      toast.error('Please enter both Client ID and Client Secret');
      return;
    }

    setIsTestingReconfigCredentials(true);
    try {
      await testCredentials.mutateAsync({ 
        client_id: reconfigClientId, 
        client_secret: reconfigClientSecret 
      });
      setReconfigCredentialsTested(true);
      toast.success('Credentials are valid!');
    } catch (error: any) {
      setReconfigCredentialsTested(false);
      toast.error(error.message || 'Invalid credentials');
    } finally {
      setIsTestingReconfigCredentials(false);
    }
  };

  const handleSaveReconfigCredentials = async () => {
    if (!reconfigCredentialsTested) {
      toast.error('Please test your credentials first');
      return;
    }

    setIsSavingReconfigCredentials(true);
    try {
      await saveCredentials.mutateAsync({ 
        client_id: reconfigClientId, 
        client_secret: reconfigClientSecret 
      });
      setIsReconfigureOpen(false);
      toast.success('Credentials updated. Please reconnect to Slack.');
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save credentials');
    } finally {
      setIsSavingReconfigCredentials(false);
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

  // Show setup wizard if no credentials configured
  if (!hasCredentials) {
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
              variant={isConnected ? 'default' : 'secondary'}
              className={isConnected ? 'bg-success/10 text-success border-success/20' : ''}
            >
              {isConnected ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Connected
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3 mr-1" />
                  Not Connected
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isConnected ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">{integration?.team_name}</p>
                  <p className="text-sm text-muted-foreground">Slack Workspace</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsReconfigureOpen(true)}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Reconfigure
                  </Button>
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
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-4">
                Your Slack app credentials are configured. Click below to connect your workspace.
              </p>
              <div className="flex flex-col gap-3 items-center">
                <Button
                  onClick={handleConnect}
                  disabled={getAuthorizationUrl.isPending}
                  className="bg-[#4A154B] hover:bg-[#3a1039] text-white"
                >
                  {getAuthorizationUrl.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Slack className="h-4 w-4 mr-2" />
                  )}
                  Connect to Slack
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsReconfigureOpen(true)}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Update Credentials
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Configuration - Only show when connected */}
      {isConnected && (
        <>
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
        </>
      )}

      {/* Reconfigure Dialog */}
      <Dialog open={isReconfigureOpen} onOpenChange={setIsReconfigureOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reconfigure Slack Integration</DialogTitle>
            <DialogDescription>
              Update your Slack App credentials to reconnect with a different app or refresh expired tokens.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reconfig-client-id">Client ID</Label>
              <Input
                id="reconfig-client-id"
                value={reconfigClientId}
                onChange={(e) => {
                  setReconfigClientId(e.target.value);
                  setReconfigCredentialsTested(false);
                }}
                placeholder="e.g., 1234567890.1234567890"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reconfig-client-secret">Client Secret</Label>
              <div className="relative">
                <Input
                  id="reconfig-client-secret"
                  type={showReconfigSecret ? 'text' : 'password'}
                  value={reconfigClientSecret}
                  onChange={(e) => {
                    setReconfigClientSecret(e.target.value);
                    setReconfigCredentialsTested(false);
                  }}
                  placeholder="Enter your new Client Secret"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowReconfigSecret(!showReconfigSecret)}
                >
                  {showReconfigSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleTestReconfigCredentials}
              disabled={!reconfigClientId || !reconfigClientSecret || isTestingReconfigCredentials}
              className="w-full"
            >
              {isTestingReconfigCredentials ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : reconfigCredentialsTested ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                  Credentials Valid
                </>
              ) : (
                '🧪 Test Credentials'
              )}
            </Button>

            {reconfigCredentialsTested && (
              <div className="flex items-start gap-2 text-sm bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-amber-700 dark:text-amber-300">
                  <p className="font-medium">Heads up!</p>
                  <p>Saving new credentials will disconnect your current workspace. You'll need to re-authorize after saving.</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReconfigureOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveReconfigCredentials}
              disabled={!reconfigCredentialsTested || isSavingReconfigCredentials}
            >
              {isSavingReconfigCredentials ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save & Reconnect'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
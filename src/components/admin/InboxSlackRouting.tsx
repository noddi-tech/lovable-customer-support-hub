import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Hash, Lock, Inbox, Building2, Bell, BarChart3, AlertTriangle, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import { toast } from 'sonner';
import type { SlackChannel, SlackIntegration } from '@/hooks/useSlackIntegration';

interface InboxSlackRoutingProps {
  integration: SlackIntegration;
  channels: SlackChannel[];
  secondaryChannels: SlackChannel[];
  hasSecondaryWorkspace: boolean;
}

interface RoutingEntry {
  id: string;
  inbox_id: string;
  slack_integration_id: string;
  channel_id: string;
  channel_name: string | null;
  use_secondary_workspace: boolean;
  is_active: boolean;
  digest_channel_id: string | null;
  digest_channel_name: string | null;
  digest_use_secondary: boolean;
  digest_enabled: boolean;
  critical_channel_id: string | null;
  critical_channel_name: string | null;
  critical_use_secondary: boolean;
  critical_enabled: boolean;
}

interface InboxInfo {
  id: string;
  name: string;
}

type SlotKey = 'notifications' | 'digest' | 'critical';

const SLOTS: { key: SlotKey; label: string; icon: React.ElementType; toggleable: boolean }[] = [
  { key: 'notifications', label: 'Notifications', icon: Bell, toggleable: false },
  { key: 'digest', label: 'Digest', icon: BarChart3, toggleable: true },
  { key: 'critical', label: 'Critical Alerts', icon: AlertTriangle, toggleable: true },
];

export const InboxSlackRouting = ({
  integration,
  channels,
  secondaryChannels,
  hasSecondaryWorkspace,
}: InboxSlackRoutingProps) => {
  const queryClient = useQueryClient();
  const { currentOrganizationId } = useOrganizationStore();

  const { data: inboxes = [], isLoading: isLoadingInboxes } = useQuery({
    queryKey: ['inboxes-for-routing', currentOrganizationId],
    queryFn: async () => {
      if (!currentOrganizationId) return [];
      const { data, error } = await supabase
        .from('inboxes')
        .select('id, name')
        .eq('organization_id', currentOrganizationId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data || []) as InboxInfo[];
    },
    enabled: !!currentOrganizationId,
  });

  const { data: routingEntries = [], isLoading: isLoadingRouting } = useQuery({
    queryKey: ['inbox-slack-routing', integration.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inbox_slack_routing')
        .select('*')
        .eq('slack_integration_id', integration.id);
      if (error) throw error;
      return (data || []) as RoutingEntry[];
    },
    enabled: !!integration.id,
  });

  const upsertRouting = useMutation({
    mutationFn: async (params: {
      inbox_id: string;
      updates: Partial<RoutingEntry>;
    }) => {
      const existing = routingEntries.find(r => r.inbox_id === params.inbox_id);
      if (existing) {
        const { error } = await supabase
          .from('inbox_slack_routing')
          .update(params.updates)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('inbox_slack_routing')
          .insert({
            inbox_id: params.inbox_id,
            slack_integration_id: integration.id,
            channel_id: params.updates.channel_id || '_placeholder',
            channel_name: params.updates.channel_name || null,
            use_secondary_workspace: params.updates.use_secondary_workspace ?? false,
            digest_channel_id: params.updates.digest_channel_id || null,
            digest_channel_name: params.updates.digest_channel_name || null,
            digest_use_secondary: params.updates.digest_use_secondary ?? false,
            digest_enabled: params.updates.digest_enabled ?? true,
            critical_channel_id: params.updates.critical_channel_id || null,
            critical_channel_name: params.updates.critical_channel_name || null,
            critical_use_secondary: params.updates.critical_use_secondary ?? false,
            critical_enabled: params.updates.critical_enabled ?? true,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-slack-routing'] });
      toast.success('Inbox routing saved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save routing: ${error.message}`);
    },
  });

  const deleteRouting = useMutation({
    mutationFn: async (inbox_id: string) => {
      const { error } = await supabase
        .from('inbox_slack_routing')
        .delete()
        .eq('inbox_id', inbox_id)
        .eq('slack_integration_id', integration.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox-slack-routing'] });
      toast.success('All inbox routing removed — will use defaults');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove routing: ${error.message}`);
    },
  });

  const routingMap = new Map(routingEntries.map(r => [r.inbox_id, r]));
  const isLoading = isLoadingInboxes || isLoadingRouting;

  if (isLoading) {
    return (
      <Card className="bg-gradient-surface border-border/50">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (inboxes.length === 0) return null;

  const getSlotEnabled = (routing: RoutingEntry | undefined, slot: SlotKey): boolean => {
    if (!routing) return true; // default enabled
    if (slot === 'notifications') return true; // always enabled
    if (slot === 'digest') return routing.digest_enabled ?? true;
    if (slot === 'critical') return routing.critical_enabled ?? true;
    return true;
  };

  const handleToggleSlot = (inboxId: string, slot: SlotKey, enabled: boolean) => {
    const updates: Partial<RoutingEntry> = {};
    if (slot === 'digest') updates.digest_enabled = enabled;
    if (slot === 'critical') updates.critical_enabled = enabled;
    upsertRouting.mutate({ inbox_id: inboxId, updates });
  };

  const getSlotValues = (routing: RoutingEntry | undefined, slot: SlotKey) => {
    if (!routing) return { channelId: '', useSecondary: false };
    switch (slot) {
      case 'notifications':
        return {
          channelId: routing.channel_id === '_placeholder' ? '' : routing.channel_id,
          useSecondary: routing.use_secondary_workspace,
        };
      case 'digest':
        return { channelId: routing.digest_channel_id || '', useSecondary: routing.digest_use_secondary };
      case 'critical':
        return { channelId: routing.critical_channel_id || '', useSecondary: routing.critical_use_secondary };
    }
  };

  const handleWorkspaceChange = (inboxId: string, slot: SlotKey, useSecondary: boolean) => {
    const routing = routingMap.get(inboxId);
    const updates: Partial<RoutingEntry> = {};
    switch (slot) {
      case 'notifications':
        updates.use_secondary_workspace = useSecondary;
        // Clear channel when switching workspace
        updates.channel_id = '_placeholder';
        updates.channel_name = null;
        break;
      case 'digest':
        updates.digest_use_secondary = useSecondary;
        updates.digest_channel_id = null;
        updates.digest_channel_name = null;
        break;
      case 'critical':
        updates.critical_use_secondary = useSecondary;
        updates.critical_channel_id = null;
        updates.critical_channel_name = null;
        break;
    }
    upsertRouting.mutate({ inbox_id: inboxId, updates });
  };

  const handleChannelChange = (inboxId: string, slot: SlotKey, channelId: string, useSecondary: boolean) => {
    const availChannels = useSecondary ? secondaryChannels : channels;
    const channel = availChannels.find(c => c.id === channelId);
    const updates: Partial<RoutingEntry> = {};
    switch (slot) {
      case 'notifications':
        updates.channel_id = channelId;
        updates.channel_name = channel?.name || '';
        updates.use_secondary_workspace = useSecondary;
        break;
      case 'digest':
        updates.digest_channel_id = channelId;
        updates.digest_channel_name = channel?.name || '';
        updates.digest_use_secondary = useSecondary;
        break;
      case 'critical':
        updates.critical_channel_id = channelId;
        updates.critical_channel_name = channel?.name || '';
        updates.critical_use_secondary = useSecondary;
        break;
    }
    upsertRouting.mutate({ inbox_id: inboxId, updates });
  };

  const hasAnyRouting = (routing: RoutingEntry | undefined) => {
    if (!routing) return false;
    return (
      (routing.channel_id && routing.channel_id !== '_placeholder') ||
      routing.digest_channel_id ||
      routing.critical_channel_id
    );
  };

  return (
    <Card className="bg-gradient-surface border-border/50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Inbox className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Per-Inbox Channel Routing</CardTitle>
            <CardDescription>
              Route notifications, digests, and critical alerts from specific inboxes to dedicated channels and workspaces. Unrouted inboxes use the organization defaults above.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {inboxes.map((inbox) => {
          const routing = routingMap.get(inbox.id);
          const isConfigured = hasAnyRouting(routing);

          return (
            <div
              key={inbox.id}
              className="flex flex-col gap-3 p-4 rounded-lg bg-muted/50 border border-border/30"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{inbox.name}</span>
                  {isConfigured ? (
                    <Badge variant="secondary" className="text-xs">Configured</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-muted-foreground">Using defaults</Badge>
                  )}
                </div>
                {isConfigured && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteRouting.mutate(inbox.id)}
                    disabled={deleteRouting.isPending}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Remove all
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                {SLOTS.map(({ key, label, icon: Icon, toggleable }) => {
                  const { channelId, useSecondary } = getSlotValues(routing, key);
                  const availableChannels = useSecondary ? secondaryChannels : channels;
                  const isEnabled = getSlotEnabled(routing, key);

                  return (
                    <div key={key} className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5 w-32 shrink-0">
                        {toggleable && (
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={(checked) => handleToggleSlot(inbox.id, key, checked)}
                            disabled={upsertRouting.isPending}
                            className="scale-75"
                          />
                        )}
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <Label className="text-xs font-medium">{label}</Label>
                      </div>

                      {!isEnabled ? (
                        <Badge variant="outline" className="text-xs text-muted-foreground">Disabled</Badge>
                      ) : (
                        <>
                          {hasSecondaryWorkspace && (
                            <Select
                              value={useSecondary ? 'secondary' : 'primary'}
                              onValueChange={(v) => handleWorkspaceChange(inbox.id, key, v === 'secondary')}
                              disabled={upsertRouting.isPending}
                            >
                              <SelectTrigger className="w-36 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="primary">
                                  <div className="flex items-center gap-1.5">
                                    <Building2 className="h-3 w-3" />
                                    {integration.team_name || 'Primary'}
                                  </div>
                                </SelectItem>
                                <SelectItem value="secondary">
                                  <div className="flex items-center gap-1.5">
                                    <Building2 className="h-3 w-3" />
                                    {integration.secondary_team_name || 'Secondary'}
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}

                          <Select
                            value={channelId || ''}
                            onValueChange={(cId) => handleChannelChange(inbox.id, key, cId, useSecondary)}
                            disabled={upsertRouting.isPending}
                          >
                            <SelectTrigger className="flex-1 h-8 text-xs">
                              <SelectValue placeholder="Select channel..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableChannels.map((channel) => (
                                <SelectItem key={channel.id} value={channel.id}>
                                  <div className="flex items-center gap-1.5">
                                    {channel.is_private ? (
                                      <Lock className="h-3 w-3 text-muted-foreground" />
                                    ) : (
                                      <Hash className="h-3 w-3 text-muted-foreground" />
                                    )}
                                    {channel.name}
                                    {!channel.is_member && (
                                      <span className="text-warning text-[10px] ml-1">⚠</span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Warning when selected channel has no bot membership */}
                          {channelId && (() => {
                            const selected = availableChannels.find(c => c.id === channelId);
                            if (selected && !selected.is_member) {
                              return (
                                <div className="flex items-center gap-1 text-warning">
                                  <AlertTriangle className="h-3 w-3 shrink-0" />
                                  <span className="text-[11px]">Bot not in channel — type <code className="font-mono bg-muted px-1 rounded">/invite @YourBot</code> in Slack</span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

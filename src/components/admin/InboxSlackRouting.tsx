import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Hash, Lock, Inbox, ArrowRight, Building2 } from 'lucide-react';
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
}

interface InboxInfo {
  id: string;
  name: string;
}

export const InboxSlackRouting = ({
  integration,
  channels,
  secondaryChannels,
  hasSecondaryWorkspace,
}: InboxSlackRoutingProps) => {
  const queryClient = useQueryClient();
  const { currentOrganizationId } = useOrganizationStore();

  // Fetch inboxes for the org
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

  // Fetch existing routing entries
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

  // Upsert routing
  const upsertRouting = useMutation({
    mutationFn: async (params: {
      inbox_id: string;
      channel_id: string;
      channel_name: string;
      use_secondary_workspace: boolean;
    }) => {
      const existing = routingEntries.find(r => r.inbox_id === params.inbox_id);
      if (existing) {
        const { error } = await supabase
          .from('inbox_slack_routing')
          .update({
            channel_id: params.channel_id,
            channel_name: params.channel_name,
            use_secondary_workspace: params.use_secondary_workspace,
            is_active: true,
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('inbox_slack_routing')
          .insert({
            inbox_id: params.inbox_id,
            slack_integration_id: integration.id,
            channel_id: params.channel_id,
            channel_name: params.channel_name,
            use_secondary_workspace: params.use_secondary_workspace,
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

  // Delete routing
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
      toast.success('Inbox routing removed — will use default channel');
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
              Route notifications from specific inboxes to dedicated Slack channels. Unrouted inboxes use the default channel.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {inboxes.map((inbox) => {
          const routing = routingMap.get(inbox.id);
          const isRouted = !!routing;
          const useSecondary = routing?.use_secondary_workspace ?? false;
          const availableChannels = useSecondary ? secondaryChannels : channels;

          return (
            <div
              key={inbox.id}
              className="flex flex-col gap-3 p-4 rounded-lg bg-muted/50 border border-border/30"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{inbox.name}</span>
                  {isRouted ? (
                    <Badge variant="secondary" className="text-xs">
                      <ArrowRight className="h-3 w-3 mr-1" />
                      {routing.channel_name || routing.channel_id}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      Using default
                    </Badge>
                  )}
                </div>
                {isRouted && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteRouting.mutate(inbox.id)}
                    disabled={deleteRouting.isPending}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {hasSecondaryWorkspace && (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={useSecondary}
                      onCheckedChange={(checked) => {
                        if (routing) {
                          // Update workspace but keep channel (user needs to reselect)
                          upsertRouting.mutate({
                            inbox_id: inbox.id,
                            channel_id: routing.channel_id,
                            channel_name: routing.channel_name || '',
                            use_secondary_workspace: checked,
                          });
                        }
                      }}
                      disabled={!isRouted}
                    />
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {useSecondary ? integration.secondary_team_name : 'Primary'}
                    </Label>
                  </div>
                )}

                <Select
                  value={routing?.channel_id || ''}
                  onValueChange={(channelId) => {
                    const channel = availableChannels.find(c => c.id === channelId);
                    upsertRouting.mutate({
                      inbox_id: inbox.id,
                      channel_id: channelId,
                      channel_name: channel?.name || '',
                      use_secondary_workspace: useSecondary,
                    });
                  }}
                  disabled={upsertRouting.isPending}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select channel..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableChannels.map((channel) => (
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
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

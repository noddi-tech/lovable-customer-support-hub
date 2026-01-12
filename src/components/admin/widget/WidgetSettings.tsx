import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Copy, Plus, Settings, Eye, Code, MessageCircle, Search, Mail, RefreshCw, ExternalLink } from 'lucide-react';
import { WidgetPreview } from './WidgetPreview';
import { WidgetEmbedCode } from './WidgetEmbedCode';
import { Heading } from '@/components/ui/heading';
import { Badge } from '@/components/ui/badge';

interface WidgetConfig {
  id: string;
  widget_key: string;
  inbox_id: string;
  organization_id: string;
  primary_color: string;
  position: string;
  greeting_text: string;
  response_time_text: string;
  enable_chat: boolean;
  enable_contact_form: boolean;
  enable_knowledge_search: boolean;
  logo_url: string | null;
  company_name: string | null;
  is_active: boolean;
  created_at: string;
  inboxes?: { name: string } | null;
}

export const WidgetSettings: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('settings');

  // Fetch organization ID
  const { data: organizationId } = useQuery({
    queryKey: ['user-organization-id'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_organization_id');
      if (error) throw error;
      return data as string;
    },
  });

  // Fetch inboxes for the organization
  const { data: inboxes = [] } = useQuery({
    queryKey: ['inboxes', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('inboxes')
        .select('id, name, is_active')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  // Fetch widget configs
  const { data: widgetConfigs = [], isLoading } = useQuery({
    queryKey: ['widget-configs', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('widget_configs')
        .select(`
          *,
          inboxes (name)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as WidgetConfig[];
    },
    enabled: !!organizationId,
  });

  // Create widget config mutation
  const createWidgetMutation = useMutation({
    mutationFn: async (inboxId: string) => {
      if (!organizationId) throw new Error('No organization');
      
      const widgetKey = crypto.randomUUID().slice(0, 8);
      
      const { data, error } = await supabase
        .from('widget_configs')
        .insert({
          inbox_id: inboxId,
          organization_id: organizationId,
          widget_key: widgetKey,
          greeting_text: 'Hi there! 👋 How can we help you today?',
          response_time_text: 'We usually respond within a few hours',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['widget-configs'] });
      setSelectedWidgetId(data.id);
      toast.success('Widget created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create widget: ${error.message}`);
    },
  });

  // Update widget config mutation
  const updateWidgetMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<WidgetConfig> }) => {
      const { data, error } = await supabase
        .from('widget_configs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['widget-configs'] });
      toast.success('Widget updated');
    },
    onError: (error: any) => {
      toast.error(`Failed to update widget: ${error.message}`);
    },
  });

  const selectedWidget = widgetConfigs.find(w => w.id === selectedWidgetId);

  const handleUpdateWidget = (updates: Partial<WidgetConfig>) => {
    if (!selectedWidgetId) return;
    updateWidgetMutation.mutate({ id: selectedWidgetId, updates });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Heading level={2}>Contact Widget</Heading>
          <p className="text-muted-foreground mt-1">
            Create an embeddable widget for your website to collect customer inquiries
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Widget List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Your Widgets
            </CardTitle>
            <CardDescription>
              Create widgets linked to your inboxes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {widgetConfigs.map((widget) => (
              <button
                key={widget.id}
                onClick={() => setSelectedWidgetId(widget.id)}
                className={`w-full p-3 rounded-lg border text-left transition-colors ${
                  selectedWidgetId === widget.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{widget.inboxes?.name || 'Unknown Inbox'}</span>
                  <Badge variant={widget.is_active ? 'default' : 'secondary'} className="text-xs">
                    {widget.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1 font-mono">
                  {widget.widget_key}
                </div>
              </button>
            ))}

            {inboxes.length > 0 && (
              <Select onValueChange={(inboxId) => createWidgetMutation.mutate(inboxId)}>
                <SelectTrigger className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  <span>Create Widget</span>
                </SelectTrigger>
                <SelectContent>
                  {inboxes
                    .filter(inbox => !widgetConfigs.some(w => w.inbox_id === inbox.id))
                    .map((inbox) => (
                      <SelectItem key={inbox.id} value={inbox.id}>
                        {inbox.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}

            {widgetConfigs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No widgets yet. Create one to get started.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Widget Configuration */}
        <div className="lg:col-span-2">
          {selectedWidget ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Configure Widget
                </CardTitle>
                <CardDescription>
                  Customize appearance and behavior for {selectedWidget.inboxes?.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="settings" className="gap-2">
                      <Settings className="h-4 w-4" />
                      Settings
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="gap-2">
                      <Eye className="h-4 w-4" />
                      Preview
                    </TabsTrigger>
                    <TabsTrigger value="embed" className="gap-2">
                      <Code className="h-4 w-4" />
                      Embed
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="settings" className="space-y-6 mt-6">
                    {/* Appearance */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm">Appearance</h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Primary Color</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={selectedWidget.primary_color}
                              onChange={(e) => handleUpdateWidget({ primary_color: e.target.value })}
                              className="w-12 h-10 p-1 cursor-pointer"
                            />
                            <Input
                              value={selectedWidget.primary_color}
                              onChange={(e) => handleUpdateWidget({ primary_color: e.target.value })}
                              placeholder="#7c3aed"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Position</Label>
                          <Select
                            value={selectedWidget.position}
                            onValueChange={(value) => handleUpdateWidget({ position: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bottom-right">Bottom Right</SelectItem>
                              <SelectItem value="bottom-left">Bottom Left</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Company Name</Label>
                        <Input
                          value={selectedWidget.company_name || ''}
                          onChange={(e) => handleUpdateWidget({ company_name: e.target.value })}
                          placeholder="Your Company"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Logo URL</Label>
                        <Input
                          value={selectedWidget.logo_url || ''}
                          onChange={(e) => handleUpdateWidget({ logo_url: e.target.value })}
                          placeholder="https://..."
                        />
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm">Messages</h4>
                      
                      <div className="space-y-2">
                        <Label>Greeting Text</Label>
                        <Textarea
                          value={selectedWidget.greeting_text}
                          onChange={(e) => handleUpdateWidget({ greeting_text: e.target.value })}
                          placeholder="Hi there! How can we help?"
                          rows={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Response Time Text</Label>
                        <Input
                          value={selectedWidget.response_time_text}
                          onChange={(e) => handleUpdateWidget({ response_time_text: e.target.value })}
                          placeholder="We usually respond within..."
                        />
                      </div>
                    </div>

                    {/* Features */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm">Features</h4>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              Contact Form
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Allow visitors to send messages
                            </p>
                          </div>
                          <Switch
                            checked={selectedWidget.enable_contact_form}
                            onCheckedChange={(checked) => handleUpdateWidget({ enable_contact_form: checked })}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="flex items-center gap-2">
                              <Search className="h-4 w-4" />
                              Knowledge Search
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Let visitors search your FAQ
                            </p>
                          </div>
                          <Switch
                            checked={selectedWidget.enable_knowledge_search}
                            onCheckedChange={(checked) => handleUpdateWidget({ enable_knowledge_search: checked })}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="flex items-center gap-2">
                              <MessageCircle className="h-4 w-4" />
                              Live Chat
                              <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Real-time chat when agents are online
                            </p>
                          </div>
                          <Switch
                            checked={selectedWidget.enable_chat}
                            onCheckedChange={(checked) => handleUpdateWidget({ enable_chat: checked })}
                            disabled
                          />
                        </div>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="space-y-0.5">
                        <Label>Widget Active</Label>
                        <p className="text-xs text-muted-foreground">
                          Enable or disable this widget
                        </p>
                      </div>
                      <Switch
                        checked={selectedWidget.is_active}
                        onCheckedChange={(checked) => handleUpdateWidget({ is_active: checked })}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="preview" className="mt-6">
                    <WidgetPreview config={selectedWidget} />
                  </TabsContent>

                  <TabsContent value="embed" className="mt-6">
                    <WidgetEmbedCode widgetKey={selectedWidget.widget_key} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="font-medium">Select or Create a Widget</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose a widget from the list or create a new one to configure
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

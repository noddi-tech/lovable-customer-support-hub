import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Settings, Eye, Code, MessageCircle, Search, Mail, RefreshCw, BarChart3, TestTube2, Globe, Bot, History, AlertTriangle } from 'lucide-react';
import { WidgetPreview } from './WidgetPreview';
import { WidgetEmbedCode } from './WidgetEmbedCode';
import { WidgetAnalytics } from './WidgetAnalytics';
import { WidgetTestMode } from './WidgetTestMode';
import { WidgetTranslationEditor } from './WidgetTranslationEditor';
import { AiAnalyticsDashboard } from './AiAnalyticsDashboard';
import { AiConversationHistory } from './AiConversationHistory';
import { KnowledgeGapDetection } from './KnowledgeGapDetection';
import { Heading } from '@/components/ui/heading';
import { Badge } from '@/components/ui/badge';
import { SUPPORTED_WIDGET_LANGUAGES } from '@/widget/translations';

interface WidgetConfig {
  id: string;
  widget_key: string;
  inbox_id: string;
  organization_id: string;
  primary_color: string;
  position: string;
  greeting_text: string;
  response_time_text: string;
  dismissal_message_text: string;
  greeting_translations: Record<string, string>;
  response_time_translations: Record<string, string>;
  dismissal_message_translations: Record<string, string>;
  enable_chat: boolean;
  enable_contact_form: boolean;
  enable_knowledge_search: boolean;
  logo_url: string | null;
  company_name: string | null;
  is_active: boolean;
  created_at: string;
  language: string;
  inboxes?: { name: string } | null;
}

export const WidgetSettings: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);

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
      
      const widgetKey = crypto.randomUUID();
      
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

  // Update widget config mutation with optimistic updates
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
    onMutate: async ({ id, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['widget-configs', organizationId] });
      
      // Snapshot previous value
      const previousConfigs = queryClient.getQueryData<WidgetConfig[]>(['widget-configs', organizationId]);
      
      // Optimistically update the cache
      queryClient.setQueryData<WidgetConfig[]>(['widget-configs', organizationId], (old) =>
        old?.map(widget => widget.id === id ? { ...widget, ...updates } : widget)
      );
      
      return { previousConfigs };
    },
    onError: (error: any, _variables, context) => {
      // Rollback on error
      if (context?.previousConfigs) {
        queryClient.setQueryData(['widget-configs', organizationId], context.previousConfigs);
      }
      toast.error(`Failed to update widget: ${error.message}`);
    },
    onSuccess: () => {
      toast.success('Widget updated');
    },
    onSettled: () => {
      // Refetch to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ['widget-configs', organizationId] });
    },
  });

  const selectedWidget = widgetConfigs.find(w => w.id === selectedWidgetId);
  
  // Local state for language to prevent race conditions
  const [selectedLanguage, setSelectedLanguage] = useState(selectedWidget?.language || 'no');
  
  // Sync local language state when selected widget changes
  useEffect(() => {
    if (selectedWidget?.language) {
      setSelectedLanguage(selectedWidget.language);
    }
  }, [selectedWidget?.id, selectedWidget?.language]);
  
  const handleLanguageChange = (value: string) => {
    setSelectedLanguage(value); // Update local state immediately
    handleUpdateWidget({ language: value }); // Send to server
  };

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

      <div className="flex gap-6">
        {/* Widget List Sidebar */}
        <Card className="w-[280px] shrink-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Your Widgets
            </CardTitle>
            <CardDescription>
              Select or create a widget
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {widgetConfigs.map((widget) => (
              <button
                key={widget.id}
                onClick={() => setSelectedWidgetId(widget.id)}
                className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                  selectedWidgetId === widget.id
                    ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm truncate max-w-[140px]">
                    {widget.inboxes?.name || 'Unknown Inbox'}
                  </span>
                  <Badge 
                    variant={widget.is_active ? 'default' : 'secondary'} 
                    className={widget.is_active ? 'bg-green-500 hover:bg-green-500 text-white shrink-0' : 'shrink-0'}
                  >
                    {widget.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-2 font-mono truncate" title={widget.widget_key}>
                  {widget.widget_key.slice(0, 12)}...
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

        {/* Main Content Area with Tabs */}
        {selectedWidget ? (
          <Card className="flex-1">
            <Tabs defaultValue="settings" className="w-full">
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <CardTitle className="text-lg">
                      {selectedWidget.inboxes?.name || 'Widget'} Configuration
                    </CardTitle>
                    <CardDescription>
                      Customize your widget settings and appearance
                    </CardDescription>
                  </div>
                </div>
                <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
                  <TabsTrigger value="settings" className="gap-1.5">
                    <Settings className="h-4 w-4" />
                    <span className="hidden lg:inline">Settings</span>
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="gap-1.5">
                    <Eye className="h-4 w-4" />
                    <span className="hidden lg:inline">Preview</span>
                  </TabsTrigger>
                  <TabsTrigger value="test" className="gap-1.5">
                    <TestTube2 className="h-4 w-4" />
                    <span className="hidden lg:inline">Test</span>
                  </TabsTrigger>
                  <TabsTrigger value="conversations" className="gap-1.5">
                    <History className="h-4 w-4" />
                    <span className="hidden lg:inline">Conversations</span>
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="gap-1.5">
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden lg:inline">Analytics</span>
                  </TabsTrigger>
                  <TabsTrigger value="ai-analytics" className="gap-1.5">
                    <Bot className="h-4 w-4" />
                    <span className="hidden lg:inline">AI</span>
                  </TabsTrigger>
                  <TabsTrigger value="gaps" className="gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="hidden lg:inline">Gaps</span>
                  </TabsTrigger>
                  <TabsTrigger value="embed" className="gap-1.5">
                    <Code className="h-4 w-4" />
                    <span className="hidden lg:inline">Embed</span>
                  </TabsTrigger>
                </TabsList>
              </CardHeader>

              <CardContent className="pt-6">
                {/* Settings Tab */}
                <TabsContent value="settings" className="mt-0 space-y-6">
                  {/* Appearance */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      Appearance
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Language
                        </Label>
                        <Select
                          value={selectedLanguage}
                          onValueChange={handleLanguageChange}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SUPPORTED_WIDGET_LANGUAGES.map((lang) => (
                              <SelectItem key={lang.code} value={lang.code}>
                                {lang.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  </div>

                  {/* Messages */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Default Messages</h4>
                    <p className="text-xs text-muted-foreground">
                      These are used as fallback when no per-language customization exists.
                    </p>
                    
                    <div className="space-y-2">
                      <Label>Default Greeting Text</Label>
                      <Textarea
                        value={selectedWidget.greeting_text}
                        onChange={(e) => handleUpdateWidget({ greeting_text: e.target.value })}
                        placeholder="Hi there! How can we help?"
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Default Response Time Text</Label>
                      <Input
                        value={selectedWidget.response_time_text}
                        onChange={(e) => handleUpdateWidget({ response_time_text: e.target.value })}
                        placeholder="We usually respond within..."
                      />
                    </div>
                  </div>

                  {/* Per-Language Translations */}
                  <WidgetTranslationEditor
                    greetingText={selectedWidget.greeting_text}
                    responseTimeText={selectedWidget.response_time_text}
                    dismissalMessageText={selectedWidget.dismissal_message_text || "Due to high demand, we can't connect you with an agent right now. We'll follow up with you via email shortly."}
                    greetingTranslations={selectedWidget.greeting_translations || {}}
                    responseTimeTranslations={selectedWidget.response_time_translations || {}}
                    dismissalMessageTranslations={selectedWidget.dismissal_message_translations || {}}
                    onUpdate={handleUpdateWidget}
                  />

                  {/* Features */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Features</h4>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                        <div className="space-y-0.5">
                          <Label className="flex items-center gap-2">
                            <MessageCircle className="h-4 w-4" />
                            Live Chat
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Real-time chat when agents are online
                          </p>
                        </div>
                        <Switch
                          checked={selectedWidget.enable_chat}
                          onCheckedChange={(checked) => handleUpdateWidget({ enable_chat: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
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

                      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
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
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-between p-4 rounded-lg border-2 border-dashed">
                    <div className="space-y-0.5">
                      <Label className="text-base font-semibold">Widget Active</Label>
                      <p className="text-xs text-muted-foreground">
                        Enable or disable this widget on your website
                      </p>
                    </div>
                    <Switch
                      checked={selectedWidget.is_active}
                      onCheckedChange={(checked) => handleUpdateWidget({ is_active: checked })}
                    />
                  </div>
                </TabsContent>

                {/* Preview Tab */}
                <TabsContent value="preview" className="mt-0">
                  <WidgetPreview config={selectedWidget} />
                </TabsContent>

                {/* Test Mode Tab */}
                <TabsContent value="test" className="mt-0">
                  <WidgetTestMode config={selectedWidget} />
                </TabsContent>

                {/* Analytics Tab */}
                <TabsContent value="analytics" className="mt-0">
                  <WidgetAnalytics widgetId={selectedWidget.id} />
                </TabsContent>

                {/* AI Analytics Tab */}
                <TabsContent value="ai-analytics" className="mt-0">
                  <AiAnalyticsDashboard organizationId={selectedWidget.organization_id} />
                </TabsContent>

                {/* Conversation History Tab */}
                <TabsContent value="conversations" className="mt-0">
                  <AiConversationHistory organizationId={selectedWidget.organization_id} />
                </TabsContent>

                {/* Knowledge Gaps Tab */}
                <TabsContent value="gaps" className="mt-0">
                  <KnowledgeGapDetection organizationId={selectedWidget.organization_id} />
                </TabsContent>

                {/* Embed Code Tab */}
                <TabsContent value="embed" className="mt-0 overflow-hidden">
                  <WidgetEmbedCode widgetKey={selectedWidget.widget_key} />
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        ) : (
          <Card className="flex-1">
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
  );
};

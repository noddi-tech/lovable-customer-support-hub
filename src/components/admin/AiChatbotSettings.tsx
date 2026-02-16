import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, GitBranch, TestTube2, History, BarChart3, AlertTriangle, Bot, MessageCircle, Puzzle, Zap, Bug } from 'lucide-react';
import { ActionFlowsManager } from '@/components/admin/widget/ActionFlowsManager';
import { WidgetTestMode } from '@/components/admin/widget/WidgetTestMode';
import { AiConversationHistory } from '@/components/admin/widget/AiConversationHistory';
import { AiAnalyticsDashboard } from '@/components/admin/widget/AiAnalyticsDashboard';
import { KnowledgeGapDetection } from '@/components/admin/widget/KnowledgeGapDetection';
import { ComponentLibrary } from '@/components/admin/widget/ComponentLibrary';
import { AiErrorTraces } from '@/components/admin/widget/AiErrorTraces';

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

export const AiChatbotSettings: React.FC = () => {
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);

  const { data: organizationId } = useQuery({
    queryKey: ['user-organization-id'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_organization_id');
      if (error) throw error;
      return data as string;
    },
  });

  const { data: widgetConfigs = [], isLoading } = useQuery({
    queryKey: ['widget-configs', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('widget_configs')
        .select(`*, inboxes (name)`)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as WidgetConfig[];
    },
    enabled: !!organizationId,
  });

  useEffect(() => {
    if (!selectedWidgetId && widgetConfigs.length > 0) {
      setSelectedWidgetId(widgetConfigs[0].id);
    }
  }, [widgetConfigs, selectedWidgetId]);

  const selectedWidget = widgetConfigs.find(w => w.id === selectedWidgetId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="shrink-0">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Bot className="h-6 w-6" />
          AI Chatbot
        </h2>
        <p className="text-muted-foreground mt-1">
          Configure, test, and monitor your AI assistant's conversation flow and performance
        </p>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Widget Selector Sidebar */}
        <Card className="w-[220px] shrink-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Select Widget
            </CardTitle>
            <CardDescription>
              Choose which widget's chatbot to configure
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
              </button>
            ))}

            {widgetConfigs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No widgets configured yet. Create one in Contact Widget settings first.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Main Content */}
        {selectedWidget ? (
          <Card className="flex-1 min-h-0 flex flex-col">
            <Tabs defaultValue="flow" className="w-full flex-1 flex flex-col min-h-0">
              <CardHeader className="pb-0 shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <CardTitle className="text-lg">
                      {selectedWidget.inboxes?.name || 'Widget'} — AI Chatbot
                    </CardTitle>
                    <CardDescription>
                      Configure how your AI assistant handles conversations
                    </CardDescription>
                  </div>
                </div>
                <TabsList className="grid w-full grid-cols-7">
                  <TabsTrigger value="components" className="gap-1.5">
                    <Puzzle className="h-4 w-4" />
                    <span className="hidden lg:inline">Components</span>
                  </TabsTrigger>
                  <TabsTrigger value="flow" className="gap-1.5">
                    <Zap className="h-4 w-4" />
                    <span className="hidden lg:inline">Action Flows</span>
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
                  <TabsTrigger value="gaps" className="gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="hidden lg:inline">Gaps</span>
                  </TabsTrigger>
                  <TabsTrigger value="errors" className="gap-1.5">
                    <Bug className="h-4 w-4" />
                    <span className="hidden lg:inline">Error Traces</span>
                  </TabsTrigger>
                </TabsList>
              </CardHeader>

              <CardContent className="flex-1 min-h-0 overflow-hidden p-4">
                <TabsContent value="components" className="mt-0 h-full">
                  <ComponentLibrary />
                </TabsContent>

                <TabsContent value="flow" className="mt-0 h-full">
                  <ActionFlowsManager widgetId={selectedWidget.id} organizationId={selectedWidget.organization_id} />
                </TabsContent>

                <TabsContent value="test" className="mt-0 h-full">
                  <WidgetTestMode config={selectedWidget} />
                </TabsContent>

                <TabsContent value="conversations" className="mt-0 h-full">
                  <AiConversationHistory organizationId={selectedWidget.organization_id} />
                </TabsContent>

                <TabsContent value="analytics" className="mt-0 h-full">
                  <AiAnalyticsDashboard organizationId={selectedWidget.organization_id} />
                </TabsContent>

                <TabsContent value="gaps" className="mt-0 h-full">
                  <KnowledgeGapDetection organizationId={selectedWidget.organization_id} />
                </TabsContent>

                <TabsContent value="errors" className="mt-0 h-full">
                  <AiErrorTraces organizationId={selectedWidget.organization_id} />
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        ) : (
          <Card className="flex-1">
            <CardContent className="flex flex-col items-center justify-center h-64 text-center">
              <Bot className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-medium">Select a Widget</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Choose a widget from the list to configure its AI chatbot
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

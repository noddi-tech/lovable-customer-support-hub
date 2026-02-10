import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { GitBranch, RotateCcw, Save, ChevronDown, Plus, Trash2 } from 'lucide-react';

// ── Types ──

interface FlowCondition {
  id: string;
  check: string;
  if_true: string;
  if_false: string;
}

interface FlowAction {
  id: string;
  label: string;
  enabled: boolean;
}

interface FlowNode {
  id: string;
  label: string;
  instruction: string;
  conditions?: FlowCondition[];
  actions?: FlowAction[];
}

interface GeneralRules {
  max_initial_lines: number;
  never_dump_history: boolean;
  tone: string;
}

interface FlowConfig {
  nodes: FlowNode[];
  general_rules: GeneralRules;
}

// ── Defaults ──

const DEFAULT_FLOW: FlowConfig = {
  nodes: [
    {
      id: 'post_verification',
      label: 'After Phone Verification',
      instruction: 'Greet customer by name. Look up their account using lookup_customer.',
      conditions: [
        {
          id: 'has_upcoming',
          check: 'Customer has upcoming bookings',
          if_true: 'Mention upcoming bookings briefly (date + service). Ask if they need help with any.',
          if_false: "Skip, don't mention bookings.",
        },
        {
          id: 'multiple_vehicles',
          check: 'Customer has multiple vehicles',
          if_true: 'Ask which car they want help with before proceeding.',
          if_false: 'Continue with their single vehicle.',
        },
      ],
    },
    {
      id: 'action_menu',
      label: 'Present Action Choices',
      instruction: 'After greeting, present these options as a short list:',
      actions: [
        { id: 'book_new', label: 'Bestille ny service', enabled: true },
        { id: 'view_bookings', label: 'Se mine bestillinger', enabled: true },
        { id: 'modify_cancel', label: 'Endre/avbestille', enabled: true },
        { id: 'wheel_storage', label: 'Dekkhotell', enabled: true },
      ],
    },
    {
      id: 'booking_new',
      label: 'When Booking New Service',
      instruction: 'Guide the customer through booking a new service.',
      conditions: [
        {
          id: 'has_previous',
          check: 'Customer has previous completed orders',
          if_true: "Reference most recent order and ask: 'Vil du ha noe lignende?'",
          if_false: 'Guide them through available services.',
        },
      ],
    },
  ],
  general_rules: {
    max_initial_lines: 4,
    never_dump_history: true,
    tone: 'Friendly, concise, action-oriented',
  },
};

// ── Props ──

interface AiFlowBuilderProps {
  widgetId: string;
}

// ── Component ──

export const AiFlowBuilder: React.FC<AiFlowBuilderProps> = ({ widgetId }) => {
  const [flow, setFlow] = useState<FlowConfig>(DEFAULT_FLOW);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load existing config
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('widget_configs')
        .select('ai_flow_config')
        .eq('id', widgetId)
        .single();

      if (data?.ai_flow_config) {
        setFlow(data.ai_flow_config as unknown as FlowConfig);
      }
      setLoaded(true);
    }
    load();
  }, [widgetId]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const { error } = await supabase
      .from('widget_configs')
      .update({ ai_flow_config: flow as any })
      .eq('id', widgetId);

    setSaving(false);
    if (error) {
      toast.error('Failed to save flow config');
    } else {
      toast.success('Flow config saved');
    }
  }, [flow, widgetId]);

  const handleReset = () => {
    setFlow(DEFAULT_FLOW);
    toast.info('Flow reset to defaults (save to apply)');
  };

  // ── Node updaters ──

  const updateNode = (nodeId: string, updates: Partial<FlowNode>) => {
    setFlow(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.id === nodeId ? { ...n, ...updates } : n),
    }));
  };

  const updateCondition = (nodeId: string, condId: string, updates: Partial<FlowCondition>) => {
    setFlow(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => {
        if (n.id !== nodeId) return n;
        return {
          ...n,
          conditions: n.conditions?.map(c => c.id === condId ? { ...c, ...updates } : c),
        };
      }),
    }));
  };

  const addCondition = (nodeId: string) => {
    const newCond: FlowCondition = {
      id: `cond_${Date.now()}`,
      check: 'Describe the condition to check',
      if_true: 'What to do if true',
      if_false: 'What to do if false',
    };
    setFlow(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => {
        if (n.id !== nodeId) return n;
        return { ...n, conditions: [...(n.conditions || []), newCond] };
      }),
    }));
  };

  const removeCondition = (nodeId: string, condId: string) => {
    setFlow(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => {
        if (n.id !== nodeId) return n;
        return { ...n, conditions: n.conditions?.filter(c => c.id !== condId) };
      }),
    }));
  };

  const updateAction = (nodeId: string, actionId: string, updates: Partial<FlowAction>) => {
    setFlow(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => {
        if (n.id !== nodeId) return n;
        return {
          ...n,
          actions: n.actions?.map(a => a.id === actionId ? { ...a, ...updates } : a),
        };
      }),
    }));
  };

  const addAction = (nodeId: string) => {
    const newAction: FlowAction = { id: `action_${Date.now()}`, label: 'New action', enabled: true };
    setFlow(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => {
        if (n.id !== nodeId) return n;
        return { ...n, actions: [...(n.actions || []), newAction] };
      }),
    }));
  };

  const removeAction = (nodeId: string, actionId: string) => {
    setFlow(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => {
        if (n.id !== nodeId) return n;
        return { ...n, actions: n.actions?.filter(a => a.id !== actionId) };
      }),
    }));
  };

  const addNode = () => {
    const newNode: FlowNode = {
      id: `node_${Date.now()}`,
      label: 'New Step',
      instruction: 'Describe what the AI should do at this step.',
      conditions: [],
    };
    setFlow(prev => ({ ...prev, nodes: [...prev.nodes, newNode] }));
  };

  const removeNode = (nodeId: string) => {
    setFlow(prev => ({ ...prev, nodes: prev.nodes.filter(n => n.id !== nodeId) }));
  };

  if (!loaded) return <div className="p-8 text-center text-muted-foreground">Loading flow config…</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-base">AI Conversation Flow</h3>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1" /> Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" /> {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Configure decision points in the AI assistant's conversation. Each node is a step; conditions control branching logic.
      </p>

      {/* Flow nodes */}
      <div className="relative space-y-0">
        {flow.nodes.map((node, idx) => (
          <div key={node.id}>
            {/* Connector line */}
            {idx > 0 && (
              <div className="flex justify-center">
                <div className="w-px h-6 bg-border" />
              </div>
            )}
            {idx > 0 && (
              <div className="flex justify-center mb-1">
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            )}

            <Card className="border-2 border-border hover:border-primary/30 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Input
                    value={node.label}
                    onChange={(e) => updateNode(node.id, { label: e.target.value })}
                    className="font-semibold text-sm border-none p-0 h-auto focus-visible:ring-0 bg-transparent"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => removeNode(node.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                {/* Instruction */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Instruction</Label>
                  <Textarea
                    emojiAutocomplete={false}
                    value={node.instruction}
                    onChange={(e) => updateNode(node.id, { instruction: e.target.value })}
                    className="min-h-[60px] text-sm"
                  />
                </div>

                {/* Conditions */}
                {node.conditions && node.conditions.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-xs text-muted-foreground font-medium">Conditions</Label>
                    {node.conditions.map((cond) => (
                      <div key={cond.id} className="rounded-lg bg-muted/50 border p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-primary shrink-0">IF</span>
                              <Input
                                value={cond.check}
                                onChange={(e) => updateCondition(node.id, cond.id, { check: e.target.value })}
                                className="text-sm h-8"
                                placeholder="Condition to check..."
                              />
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-semibold text-green-600 dark:text-green-400 shrink-0 mt-1.5">YES →</span>
                              <Textarea
                                emojiAutocomplete={false}
                                value={cond.if_true}
                                onChange={(e) => updateCondition(node.id, cond.id, { if_true: e.target.value })}
                                className="text-sm min-h-[40px]"
                              />
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-semibold text-red-600 dark:text-red-400 shrink-0 mt-1.5">NO →</span>
                              <Textarea
                                emojiAutocomplete={false}
                                value={cond.if_false}
                                onChange={(e) => updateCondition(node.id, cond.id, { if_false: e.target.value })}
                                className="text-sm min-h-[40px]"
                              />
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => removeCondition(node.id, cond.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add condition button (for nodes that use conditions) */}
                {(!node.actions || node.actions.length === 0) && (
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => addCondition(node.id)}>
                    <Plus className="h-3 w-3 mr-1" /> Add condition
                  </Button>
                )}

                {/* Actions (for menu nodes) */}
                {node.actions && node.actions.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-medium">Action Menu Items</Label>
                    {node.actions.map((action) => (
                      <div key={action.id} className="flex items-center gap-3 rounded-lg bg-muted/50 border p-2.5">
                        <Switch
                          checked={action.enabled}
                          onCheckedChange={(checked) => updateAction(node.id, action.id, { enabled: checked })}
                        />
                        <Input
                          value={action.label}
                          onChange={(e) => updateAction(node.id, action.id, { label: e.target.value })}
                          className="text-sm h-8 flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => removeAction(node.id, action.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => addAction(node.id)}>
                      <Plus className="h-3 w-3 mr-1" /> Add action
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ))}

        {/* Add node */}
        <div className="flex justify-center pt-2">
          <div className="w-px h-4 bg-border" />
        </div>
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={addNode}>
            <Plus className="h-4 w-4 mr-1" /> Add Step
          </Button>
        </div>
      </div>

      {/* General Rules */}
      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">General Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Tone</Label>
              <Input
                value={flow.general_rules.tone}
                onChange={(e) => setFlow(prev => ({
                  ...prev,
                  general_rules: { ...prev.general_rules, tone: e.target.value },
                }))}
                placeholder="e.g. Friendly, concise, action-oriented"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Max initial response lines</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={flow.general_rules.max_initial_lines}
                onChange={(e) => setFlow(prev => ({
                  ...prev,
                  general_rules: { ...prev.general_rules, max_initial_lines: parseInt(e.target.value) || 4 },
                }))}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={flow.general_rules.never_dump_history}
              onCheckedChange={(checked) => setFlow(prev => ({
                ...prev,
                general_rules: { ...prev.general_rules, never_dump_history: checked },
              }))}
            />
            <Label className="text-sm">Never dump full booking history unprompted</Label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

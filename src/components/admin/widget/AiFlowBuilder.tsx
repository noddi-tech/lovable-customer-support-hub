import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  GitBranch, RotateCcw, Save, ChevronDown, Plus, Trash2, GripVertical,
  MessageSquare, GitFork, ListChecks, FileInput, PhoneForwarded
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ── Types ──

type NodeType = 'message' | 'decision' | 'action_menu' | 'data_collection' | 'escalation';

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

interface DataField {
  id: string;
  label: string;
  field_type: 'phone' | 'email' | 'text' | 'number' | 'date';
  required: boolean;
  validation_hint?: string;
}

interface FlowNode {
  id: string;
  type: NodeType;
  label: string;
  instruction: string;
  conditions?: FlowCondition[];
  actions?: FlowAction[];
  data_fields?: DataField[];
}

interface GeneralRules {
  max_initial_lines: number;
  never_dump_history: boolean;
  tone: string;
  language_behavior?: string;
  escalation_threshold?: number;
}

interface FlowConfig {
  nodes: FlowNode[];
  general_rules: GeneralRules;
}

// ── Node type metadata ──

const NODE_TYPES: { value: NodeType; label: string; icon: React.ElementType; borderColor: string; description: string }[] = [
  { value: 'message', label: 'Message', icon: MessageSquare, borderColor: 'border-l-blue-500', description: 'Bot sends a message or instruction' },
  { value: 'decision', label: 'Decision', icon: GitFork, borderColor: 'border-l-amber-500', description: 'IF/YES/NO branching logic' },
  { value: 'action_menu', label: 'Action Menu', icon: ListChecks, borderColor: 'border-l-green-500', description: 'Present choices to the customer' },
  { value: 'data_collection', label: 'Data Collection', icon: FileInput, borderColor: 'border-l-purple-500', description: 'Ask customer for input (phone, email, etc.)' },
  { value: 'escalation', label: 'Escalation', icon: PhoneForwarded, borderColor: 'border-l-red-500', description: 'Hand off to a human agent' },
];

const getNodeMeta = (type: NodeType) => NODE_TYPES.find(n => n.value === type) || NODE_TYPES[0];

// ── Defaults ──

const DEFAULT_FLOW: FlowConfig = {
  nodes: [
    {
      id: 'node_1',
      type: 'message',
      label: 'Initial Greeting',
      instruction: 'Greet the customer and ask how you can help them today.',
    },
    {
      id: 'node_2',
      type: 'data_collection',
      label: 'Ask for Phone Number',
      instruction: 'Ask the customer for their phone number to look up their account.',
      data_fields: [
        { id: 'phone', label: 'Phone number', field_type: 'phone', required: true },
      ],
    },
    {
      id: 'node_3',
      type: 'decision',
      label: 'Existing Customer?',
      instruction: 'Check if the customer exists in the system.',
      conditions: [
        {
          id: 'cond_1',
          check: 'Customer found in system',
          if_true: 'Verify identity with SMS PIN code, then greet by name and show upcoming bookings.',
          if_false: 'Welcome them as a new customer and ask what service they are interested in.',
        },
      ],
    },
    {
      id: 'node_4',
      type: 'action_menu',
      label: 'Present Action Choices',
      instruction: 'After greeting, present these options:',
      actions: [
        { id: 'a1', label: 'Book new service', enabled: true },
        { id: 'a2', label: 'View my bookings', enabled: true },
        { id: 'a3', label: 'Modify/cancel booking', enabled: true },
        { id: 'a4', label: 'Wheel storage', enabled: true },
      ],
    },
  ],
  general_rules: {
    max_initial_lines: 4,
    never_dump_history: true,
    tone: 'Friendly, concise, action-oriented',
    language_behavior: 'Match customer language',
    escalation_threshold: 3,
  },
};

// ── Sortable Node ──

interface SortableNodeProps {
  node: FlowNode;
  isLast: boolean;
  onUpdate: (id: string, updates: Partial<FlowNode>) => void;
  onRemove: (id: string) => void;
  onUpdateCondition: (nodeId: string, condId: string, updates: Partial<FlowCondition>) => void;
  onAddCondition: (nodeId: string) => void;
  onRemoveCondition: (nodeId: string, condId: string) => void;
  onUpdateAction: (nodeId: string, actionId: string, updates: Partial<FlowAction>) => void;
  onAddAction: (nodeId: string) => void;
  onRemoveAction: (nodeId: string, actionId: string) => void;
  onUpdateDataField: (nodeId: string, fieldId: string, updates: Partial<DataField>) => void;
  onAddDataField: (nodeId: string) => void;
  onRemoveDataField: (nodeId: string, fieldId: string) => void;
}

const SortableNode: React.FC<SortableNodeProps> = ({
  node, isLast, onUpdate, onRemove,
  onUpdateCondition, onAddCondition, onRemoveCondition,
  onUpdateAction, onAddAction, onRemoveAction,
  onUpdateDataField, onAddDataField, onRemoveDataField,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id });
  const meta = getNodeMeta(node.type);
  const Icon = meta.icon;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={`border-2 border-l-4 ${meta.borderColor} border-border hover:border-primary/30 transition-colors`}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground">
              <GripVertical className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted text-xs font-medium shrink-0">
              <Icon className="h-3.5 w-3.5" />
              {meta.label}
            </div>
            <Input
              value={node.label}
              onChange={(e) => onUpdate(node.id, { label: e.target.value })}
              className="font-semibold text-sm border-none p-0 h-auto focus-visible:ring-0 bg-transparent flex-1"
            />
            <Select value={node.type} onValueChange={(val: NodeType) => onUpdate(node.id, { type: val })}>
              <SelectTrigger className="w-[140px] h-8 text-xs shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NODE_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    <span className="flex items-center gap-1.5">
                      <t.icon className="h-3.5 w-3.5" /> {t.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0" onClick={() => onRemove(node.id)}>
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
              onChange={(e) => onUpdate(node.id, { instruction: e.target.value })}
              className="min-h-[60px] text-sm"
            />
          </div>

          {/* Decision: Conditions */}
          {node.type === 'decision' && (
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground font-medium">Conditions</Label>
              {(node.conditions || []).map((cond) => (
                <div key={cond.id} className="rounded-lg bg-muted/50 border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-primary shrink-0">IF</span>
                        <Input value={cond.check} onChange={(e) => onUpdateCondition(node.id, cond.id, { check: e.target.value })} className="text-sm h-8" placeholder="Condition to check..." />
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-semibold text-green-600 dark:text-green-400 shrink-0 mt-1.5">YES →</span>
                        <Textarea emojiAutocomplete={false} value={cond.if_true} onChange={(e) => onUpdateCondition(node.id, cond.id, { if_true: e.target.value })} className="text-sm min-h-[40px]" />
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-xs font-semibold text-red-600 dark:text-red-400 shrink-0 mt-1.5">NO →</span>
                        <Textarea emojiAutocomplete={false} value={cond.if_false} onChange={(e) => onUpdateCondition(node.id, cond.id, { if_false: e.target.value })} className="text-sm min-h-[40px]" />
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0" onClick={() => onRemoveCondition(node.id, cond.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => onAddCondition(node.id)}>
                <Plus className="h-3 w-3 mr-1" /> Add condition
              </Button>
            </div>
          )}

          {/* Action Menu: Actions */}
          {node.type === 'action_menu' && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-medium">Action Menu Items</Label>
              {(node.actions || []).map((action) => (
                <div key={action.id} className="flex items-center gap-3 rounded-lg bg-muted/50 border p-2.5">
                  <Switch checked={action.enabled} onCheckedChange={(checked) => onUpdateAction(node.id, action.id, { enabled: checked })} />
                  <Input value={action.label} onChange={(e) => onUpdateAction(node.id, action.id, { label: e.target.value })} className="text-sm h-8 flex-1" />
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0" onClick={() => onRemoveAction(node.id, action.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => onAddAction(node.id)}>
                <Plus className="h-3 w-3 mr-1" /> Add action
              </Button>
            </div>
          )}

          {/* Data Collection: Fields */}
          {node.type === 'data_collection' && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-medium">Data Fields to Collect</Label>
              {(node.data_fields || []).map((field) => (
                <div key={field.id} className="rounded-lg bg-muted/50 border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input value={field.label} onChange={(e) => onUpdateDataField(node.id, field.id, { label: e.target.value })} className="text-sm h-8 flex-1" placeholder="Field label..." />
                    <Select value={field.field_type} onValueChange={(val: DataField['field_type']) => onUpdateDataField(node.id, field.id, { field_type: val })}>
                      <SelectTrigger className="w-[110px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="phone">Phone</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1.5">
                      <Switch checked={field.required} onCheckedChange={(checked) => onUpdateDataField(node.id, field.id, { required: checked })} />
                      <span className="text-xs text-muted-foreground">Required</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0" onClick={() => onRemoveDataField(node.id, field.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <Input
                    value={field.validation_hint || ''}
                    onChange={(e) => onUpdateDataField(node.id, field.id, { validation_hint: e.target.value })}
                    className="text-xs h-7"
                    placeholder="Validation hint (e.g. 'Must be 8 digits')..."
                  />
                </div>
              ))}
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => onAddDataField(node.id)}>
                <Plus className="h-3 w-3 mr-1" /> Add field
              </Button>
            </div>
          )}

          {/* Escalation: just instruction is enough, but show a hint */}
          {node.type === 'escalation' && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-3">
              <p className="text-xs text-red-700 dark:text-red-400">
                When this step is reached, the conversation will be escalated to a human agent. 
                Use the instruction above to describe the conditions and message shown to the customer.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connector */}
      {!isLast && (
        <div className="flex justify-center">
          <div className="flex flex-col items-center">
            <div className="w-px h-6 bg-border" />
            <ChevronDown className="h-4 w-4 text-muted-foreground -mt-1" />
          </div>
        </div>
      )}
    </div>
  );
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
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Load existing config
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('widget_configs')
        .select('ai_flow_config')
        .eq('id', widgetId)
        .single();

      if (data?.ai_flow_config) {
        const loaded = data.ai_flow_config as unknown as FlowConfig;
        // Migrate old nodes without type field
        if (loaded.nodes) {
          loaded.nodes = loaded.nodes.map(n => ({
            ...n,
            type: n.type || (n.actions && n.actions.length > 0 ? 'action_menu' : n.conditions && n.conditions.length > 0 ? 'decision' : 'message'),
          }));
        }
        setFlow(loaded);
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
    if (error) toast.error('Failed to save flow config');
    else toast.success('Flow config saved');
  }, [flow, widgetId]);

  const handleReset = () => {
    setFlow(DEFAULT_FLOW);
    toast.info('Flow reset to defaults (save to apply)');
  };

  // ── Node CRUD ──

  const updateNode = (nodeId: string, updates: Partial<FlowNode>) => {
    setFlow(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.id === nodeId ? { ...n, ...updates } : n),
    }));
  };

  const removeNode = (nodeId: string) => {
    setFlow(prev => ({ ...prev, nodes: prev.nodes.filter(n => n.id !== nodeId) }));
  };

  const addNode = (type: NodeType) => {
    const meta = getNodeMeta(type);
    const newNode: FlowNode = {
      id: `node_${Date.now()}`,
      type,
      label: `New ${meta.label}`,
      instruction: '',
      conditions: type === 'decision' ? [{ id: `cond_${Date.now()}`, check: '', if_true: '', if_false: '' }] : [],
      actions: type === 'action_menu' ? [{ id: `action_${Date.now()}`, label: 'New option', enabled: true }] : [],
      data_fields: type === 'data_collection' ? [{ id: `field_${Date.now()}`, label: '', field_type: 'text', required: true }] : [],
    };
    setFlow(prev => ({ ...prev, nodes: [...prev.nodes, newNode] }));
    setAddMenuOpen(false);
  };

  // Condition CRUD
  const updateCondition = (nodeId: string, condId: string, updates: Partial<FlowCondition>) => {
    setFlow(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.id !== nodeId ? n : { ...n, conditions: n.conditions?.map(c => c.id === condId ? { ...c, ...updates } : c) }),
    }));
  };
  const addCondition = (nodeId: string) => {
    setFlow(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.id !== nodeId ? n : { ...n, conditions: [...(n.conditions || []), { id: `cond_${Date.now()}`, check: '', if_true: '', if_false: '' }] }),
    }));
  };
  const removeCondition = (nodeId: string, condId: string) => {
    setFlow(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.id !== nodeId ? n : { ...n, conditions: n.conditions?.filter(c => c.id !== condId) }),
    }));
  };

  // Action CRUD
  const updateAction = (nodeId: string, actionId: string, updates: Partial<FlowAction>) => {
    setFlow(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.id !== nodeId ? n : { ...n, actions: n.actions?.map(a => a.id === actionId ? { ...a, ...updates } : a) }),
    }));
  };
  const addAction = (nodeId: string) => {
    setFlow(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.id !== nodeId ? n : { ...n, actions: [...(n.actions || []), { id: `action_${Date.now()}`, label: 'New option', enabled: true }] }),
    }));
  };
  const removeAction = (nodeId: string, actionId: string) => {
    setFlow(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.id !== nodeId ? n : { ...n, actions: n.actions?.filter(a => a.id !== actionId) }),
    }));
  };

  // Data field CRUD
  const updateDataField = (nodeId: string, fieldId: string, updates: Partial<DataField>) => {
    setFlow(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.id !== nodeId ? n : { ...n, data_fields: n.data_fields?.map(f => f.id === fieldId ? { ...f, ...updates } : f) }),
    }));
  };
  const addDataField = (nodeId: string) => {
    setFlow(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.id !== nodeId ? n : { ...n, data_fields: [...(n.data_fields || []), { id: `field_${Date.now()}`, label: '', field_type: 'text' as const, required: true }] }),
    }));
  };
  const removeDataField = (nodeId: string, fieldId: string) => {
    setFlow(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.id !== nodeId ? n : { ...n, data_fields: n.data_fields?.filter(f => f.id !== fieldId) }),
    }));
  };

  // Drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setFlow(prev => {
        const oldIndex = prev.nodes.findIndex(n => n.id === active.id);
        const newIndex = prev.nodes.findIndex(n => n.id === over.id);
        return { ...prev, nodes: arrayMove(prev.nodes, oldIndex, newIndex) };
      });
    }
  };

  if (!loaded) return <div className="p-8 text-center text-muted-foreground">Loading flow config…</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-base">Conversation Flow</h3>
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
        Build your AI assistant's conversation flow. Drag to reorder, click to edit. Each node type controls different behavior.
      </p>

      {/* Node type legend */}
      <div className="flex flex-wrap gap-2">
        {NODE_TYPES.map(t => (
          <div key={t.value} className={`flex items-center gap-1.5 px-2 py-1 rounded border-l-4 ${t.borderColor} bg-muted/50 text-xs`}>
            <t.icon className="h-3 w-3" />
            <span>{t.label}</span>
          </div>
        ))}
      </div>

      {/* Flow nodes */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={flow.nodes.map(n => n.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-0">
            {flow.nodes.map((node, idx) => (
              <SortableNode
                key={node.id}
                node={node}
                isLast={idx === flow.nodes.length - 1}
                onUpdate={updateNode}
                onRemove={removeNode}
                onUpdateCondition={updateCondition}
                onAddCondition={addCondition}
                onRemoveCondition={removeCondition}
                onUpdateAction={updateAction}
                onAddAction={addAction}
                onRemoveAction={removeAction}
                onUpdateDataField={updateDataField}
                onAddDataField={addDataField}
                onRemoveDataField={removeDataField}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add node */}
      <div className="flex justify-center pt-2">
        <div className="w-px h-4 bg-border" />
      </div>
      <div className="flex justify-center">
        <Popover open={addMenuOpen} onOpenChange={setAddMenuOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add Step
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[260px] p-2" align="center">
            <div className="space-y-1">
              {NODE_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => addNode(t.value)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent text-left border-l-4 ${t.borderColor}`}
                >
                  <t.icon className="h-4 w-4 shrink-0" />
                  <div>
                    <div className="font-medium">{t.label}</div>
                    <div className="text-xs text-muted-foreground">{t.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
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
                onChange={(e) => setFlow(prev => ({ ...prev, general_rules: { ...prev.general_rules, tone: e.target.value } }))}
                placeholder="e.g. Friendly, concise, action-oriented"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Max initial response lines</Label>
              <Input
                type="number" min={1} max={20}
                value={flow.general_rules.max_initial_lines}
                onChange={(e) => setFlow(prev => ({ ...prev, general_rules: { ...prev.general_rules, max_initial_lines: parseInt(e.target.value) || 4 } }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Language behavior</Label>
              <Input
                value={flow.general_rules.language_behavior || ''}
                onChange={(e) => setFlow(prev => ({ ...prev, general_rules: { ...prev.general_rules, language_behavior: e.target.value } }))}
                placeholder="e.g. Match customer language"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Escalation threshold (unanswered turns)</Label>
              <Input
                type="number" min={1} max={20}
                value={flow.general_rules.escalation_threshold || 3}
                onChange={(e) => setFlow(prev => ({ ...prev, general_rules: { ...prev.general_rules, escalation_threshold: parseInt(e.target.value) || 3 } }))}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={flow.general_rules.never_dump_history}
              onCheckedChange={(checked) => setFlow(prev => ({ ...prev, general_rules: { ...prev.general_rules, never_dump_history: checked } }))}
            />
            <Label className="text-sm">Never dump full booking history unprompted</Label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

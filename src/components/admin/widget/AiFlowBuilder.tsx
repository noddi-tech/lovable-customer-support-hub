import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  GitBranch, RotateCcw, Save, Plus, Trash2, GripVertical, X,
  MessageSquare, GitFork, ListChecks, FileInput, PhoneForwarded,
  ChevronDown, Settings2
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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

const NODE_TYPES: { value: NodeType; label: string; icon: React.ElementType; color: string; bgColor: string; description: string }[] = [
  { value: 'message', label: 'Message', icon: MessageSquare, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800', description: 'Bot sends a message or instruction' },
  { value: 'decision', label: 'Decision', icon: GitFork, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800', description: 'IF/YES/NO branching logic' },
  { value: 'action_menu', label: 'Action Menu', icon: ListChecks, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800', description: 'Present choices to the customer' },
  { value: 'data_collection', label: 'Data Collection', icon: FileInput, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800', description: 'Ask customer for input (phone, email, etc.)' },
  { value: 'escalation', label: 'Escalation', icon: PhoneForwarded, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800', description: 'Hand off to a human agent' },
];

const getNodeMeta = (type: NodeType) => NODE_TYPES.find(n => n.value === type) || NODE_TYPES[0];

// ── Defaults ──

const DEFAULT_FLOW: FlowConfig = {
  nodes: [
    { id: 'node_1', type: 'message', label: 'Initial Greeting', instruction: 'Greet the customer and ask how you can help them today.' },
    { id: 'node_2', type: 'data_collection', label: 'Ask for Phone Number', instruction: 'Ask the customer for their phone number to look up their account.', data_fields: [{ id: 'phone', label: 'Phone number', field_type: 'phone', required: true }] },
    { id: 'node_3', type: 'decision', label: 'Existing Customer?', instruction: 'Check if the customer exists in the system.', conditions: [{ id: 'cond_1', check: 'Customer found in system', if_true: 'Verify identity with SMS PIN code, then greet by name and show upcoming bookings.', if_false: 'Welcome them as a new customer and ask what service they are interested in.' }] },
    { id: 'node_4', type: 'action_menu', label: 'Present Action Choices', instruction: 'After greeting, present these options:', actions: [{ id: 'a1', label: 'Book new service', enabled: true }, { id: 'a2', label: 'View my bookings', enabled: true }, { id: 'a3', label: 'Modify/cancel booking', enabled: true }, { id: 'a4', label: 'Wheel storage', enabled: true }] },
  ],
  general_rules: { max_initial_lines: 4, never_dump_history: true, tone: 'Friendly, concise, action-oriented', language_behavior: 'Match customer language', escalation_threshold: 3 },
};

// ── Compact Diagram Node (canvas) ──

interface DiagramNodeProps {
  node: FlowNode;
  isSelected: boolean;
  onClick: () => void;
}

const SortableDiagramNode: React.FC<DiagramNodeProps & { id: string }> = ({ node, isSelected, onClick, id }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const meta = getNodeMeta(node.type);
  const Icon = meta.icon;
  const isDecision = node.type === 'decision';

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col items-center">
      <div
        onClick={onClick}
        className={`
          relative cursor-pointer group transition-all duration-150
          ${isDecision ? 'w-[200px]' : 'w-[220px]'}
          ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'hover:ring-1 hover:ring-primary/40 hover:ring-offset-1 hover:ring-offset-background'}
          ${isDecision ? 'rotate-0' : ''}
          rounded-lg border ${meta.bgColor} shadow-sm
        `}
      >
        {/* Decision diamond shape overlay */}
        {isDecision && (
          <div className="absolute -top-1 -left-1 -right-1 -bottom-1 border-2 border-amber-300 dark:border-amber-700 rounded-lg pointer-events-none" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />
        )}

        <div className="flex items-center gap-2 p-3">
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <div className={`shrink-0 ${meta.color}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate leading-tight">{node.label}</div>
            <div className={`text-[10px] ${meta.color} font-medium`}>{meta.label}</div>
          </div>
        </div>

        {/* Preview content */}
        {node.type === 'action_menu' && node.actions && node.actions.length > 0 && (
          <div className="px-3 pb-2 flex flex-wrap gap-1">
            {node.actions.filter(a => a.enabled).slice(0, 3).map(a => (
              <span key={a.id} className="text-[9px] px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 truncate max-w-[80px]">{a.label}</span>
            ))}
            {node.actions.filter(a => a.enabled).length > 3 && (
              <span className="text-[9px] px-1.5 py-0.5 text-muted-foreground">+{node.actions.filter(a => a.enabled).length - 3}</span>
            )}
          </div>
        )}
        {node.type === 'data_collection' && node.data_fields && node.data_fields.length > 0 && (
          <div className="px-3 pb-2 flex flex-wrap gap-1">
            {node.data_fields.map(f => (
              <span key={f.id} className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 truncate max-w-[80px]">{f.label || f.field_type}</span>
            ))}
          </div>
        )}
        {node.type === 'decision' && node.conditions && node.conditions.length > 0 && (
          <div className="px-3 pb-2">
            <div className="text-[9px] text-amber-700 dark:text-amber-300 truncate">IF: {node.conditions[0].check}</div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── SVG Connector ──

const Connector: React.FC<{ isDecision?: boolean; yesLabel?: string; noLabel?: string }> = ({ isDecision, yesLabel, noLabel }) => {
  if (isDecision) {
    return (
      <div className="flex flex-col items-center py-1">
        <svg width="260" height="60" viewBox="0 0 260 60" className="overflow-visible">
          {/* Left branch (YES) */}
          <path d="M 130 0 L 130 15 Q 130 25 120 25 L 60 25 Q 50 25 50 35 L 50 50" stroke="currentColor" className="text-green-500" strokeWidth="1.5" fill="none" />
          <polygon points="46,46 50,54 54,46" className="fill-green-500" />
          <text x="75" y="20" className="fill-green-600 dark:fill-green-400" fontSize="10" fontWeight="600">YES</text>
          {/* Right branch (NO) */}
          <path d="M 130 0 L 130 15 Q 130 25 140 25 L 200 25 Q 210 25 210 35 L 210 50" stroke="currentColor" className="text-red-500" strokeWidth="1.5" fill="none" />
          <polygon points="206,46 210,54 214,46" className="fill-red-500" />
          <text x="170" y="20" className="fill-red-600 dark:fill-red-400" fontSize="10" fontWeight="600">NO</text>
        </svg>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <svg width="2" height="32" viewBox="0 0 2 32" className="overflow-visible">
        <line x1="1" y1="0" x2="1" y2="24" stroke="currentColor" className="text-border" strokeWidth="1.5" />
        <polygon points="-3,22 1,30 5,22" className="fill-muted-foreground" />
      </svg>
    </div>
  );
};

// ── Decision Branch Summary Nodes ──

const BranchSummary: React.FC<{ condition: FlowCondition }> = ({ condition }) => (
  <div className="flex gap-4 justify-center w-[260px]">
    <div className="w-[110px] rounded border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-2 text-[10px] text-green-700 dark:text-green-300 leading-tight">
      <div className="font-semibold mb-0.5">YES</div>
      <div className="line-clamp-2">{condition.if_true || '—'}</div>
    </div>
    <div className="w-[110px] rounded border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-2 text-[10px] text-red-700 dark:text-red-300 leading-tight">
      <div className="font-semibold mb-0.5">NO</div>
      <div className="line-clamp-2">{condition.if_false || '—'}</div>
    </div>
  </div>
);

// ── Merge connector after branch ──

const MergeConnector: React.FC = () => (
  <div className="flex flex-col items-center py-1">
    <svg width="260" height="40" viewBox="0 0 260 40" className="overflow-visible">
      <path d="M 50 0 L 50 10 Q 50 20 60 20 L 120 20 Q 130 20 130 30 L 130 40" stroke="currentColor" className="text-border" strokeWidth="1.5" fill="none" />
      <path d="M 210 0 L 210 10 Q 210 20 200 20 L 140 20 Q 130 20 130 30 L 130 40" stroke="currentColor" className="text-border" strokeWidth="1.5" fill="none" />
      <polygon points="126,36 130,44 134,36" className="fill-muted-foreground" />
    </svg>
  </div>
);

// ── Add Step Button ──

const AddStepButton: React.FC<{ onAdd: (type: NodeType) => void }> = ({ onAdd }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col items-center">
      <Connector />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="h-6 w-6 rounded-full border-2 border-dashed border-muted-foreground/40 hover:border-primary hover:bg-primary/10 flex items-center justify-center transition-colors">
            <Plus className="h-3 w-3 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-2" align="center">
          <div className="space-y-1">
            {NODE_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => { onAdd(t.value); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent text-left`}
              >
                <t.icon className={`h-4 w-4 shrink-0 ${t.color}`} />
                <div>
                  <div className="font-medium text-xs">{t.label}</div>
                  <div className="text-[10px] text-muted-foreground">{t.description}</div>
                </div>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

// ── Node Editor Panel ──

interface NodeEditorProps {
  node: FlowNode;
  onClose: () => void;
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

const NodeEditor: React.FC<NodeEditorProps> = ({
  node, onClose, onUpdate, onRemove,
  onUpdateCondition, onAddCondition, onRemoveCondition,
  onUpdateAction, onAddAction, onRemoveAction,
  onUpdateDataField, onAddDataField, onRemoveDataField,
}) => {
  const meta = getNodeMeta(node.type);
  const Icon = meta.icon;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${meta.bgColor}`}>
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${meta.color}`} />
          <span className="font-semibold text-sm">{meta.label}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onRemove(node.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Label */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Node Label</Label>
          <Input value={node.label} onChange={(e) => onUpdate(node.id, { label: e.target.value })} className="text-sm" />
        </div>

        {/* Type selector */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Node Type</Label>
          <Select value={node.type} onValueChange={(val: NodeType) => onUpdate(node.id, { type: val })}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NODE_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>
                  <span className="flex items-center gap-1.5">
                    <t.icon className={`h-3.5 w-3.5 ${t.color}`} /> {t.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Instruction */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Instruction</Label>
          <Textarea
            emojiAutocomplete={false}
            value={node.instruction}
            onChange={(e) => onUpdate(node.id, { instruction: e.target.value })}
            className="min-h-[80px] text-sm"
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

        {/* Action Menu */}
        {node.type === 'action_menu' && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground font-medium">Menu Items</Label>
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

        {/* Data Collection */}
        {node.type === 'data_collection' && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground font-medium">Fields to Collect</Label>
            {(node.data_fields || []).map((field) => (
              <div key={field.id} className="rounded-lg bg-muted/50 border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Input value={field.label} onChange={(e) => onUpdateDataField(node.id, field.id, { label: e.target.value })} className="text-sm h-8 flex-1" placeholder="Field label..." />
                  <Select value={field.field_type} onValueChange={(val: DataField['field_type']) => onUpdateDataField(node.id, field.id, { field_type: val })}>
                    <SelectTrigger className="w-[100px] h-8 text-xs">
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
                  <div className="flex items-center gap-1">
                    <Switch checked={field.required} onCheckedChange={(checked) => onUpdateDataField(node.id, field.id, { required: checked })} />
                    <span className="text-[10px] text-muted-foreground">Req</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0" onClick={() => onRemoveDataField(node.id, field.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <Input
                  value={field.validation_hint || ''}
                  onChange={(e) => onUpdateDataField(node.id, field.id, { validation_hint: e.target.value })}
                  className="text-xs h-7" placeholder="Validation hint..."
                />
              </div>
            ))}
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => onAddDataField(node.id)}>
              <Plus className="h-3 w-3 mr-1" /> Add field
            </Button>
          </div>
        )}

        {/* Escalation hint */}
        {node.type === 'escalation' && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-3">
            <p className="text-xs text-red-700 dark:text-red-400">
              When this step is reached, the conversation will be escalated to a human agent.
              Use the instruction above to describe the conditions and message shown to the customer.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Props ──

interface AiFlowBuilderProps {
  widgetId: string;
}

// ── Main Component ──

export const AiFlowBuilder: React.FC<AiFlowBuilderProps> = ({ widgetId }) => {
  const [flow, setFlow] = useState<FlowConfig>(DEFAULT_FLOW);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const selectedNode = useMemo(() => flow.nodes.find(n => n.id === selectedNodeId) || null, [flow.nodes, selectedNodeId]);

  // Load
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('widget_configs')
        .select('ai_flow_config')
        .eq('id', widgetId)
        .single();
      if (data?.ai_flow_config) {
        const loaded = data.ai_flow_config as unknown as FlowConfig;
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
    const { error } = await supabase.from('widget_configs').update({ ai_flow_config: flow as any }).eq('id', widgetId);
    setSaving(false);
    if (error) toast.error('Failed to save flow config');
    else toast.success('Flow config saved');
  }, [flow, widgetId]);

  const handleReset = () => { setFlow(DEFAULT_FLOW); setSelectedNodeId(null); toast.info('Flow reset to defaults (save to apply)'); };

  // ── CRUD helpers ──
  const updateNode = (nodeId: string, updates: Partial<FlowNode>) => {
    setFlow(prev => ({ ...prev, nodes: prev.nodes.map(n => n.id === nodeId ? { ...n, ...updates } : n) }));
  };
  const removeNode = (nodeId: string) => {
    setFlow(prev => ({ ...prev, nodes: prev.nodes.filter(n => n.id !== nodeId) }));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };
  const addNodeAt = (type: NodeType, afterIndex: number) => {
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
    setFlow(prev => {
      const nodes = [...prev.nodes];
      nodes.splice(afterIndex + 1, 0, newNode);
      return { ...prev, nodes };
    });
    setSelectedNodeId(newNode.id);
  };
  const addNodeEnd = (type: NodeType) => { addNodeAt(type, flow.nodes.length - 1); };

  // Condition CRUD
  const updateCondition = (nodeId: string, condId: string, updates: Partial<FlowCondition>) => {
    setFlow(prev => ({ ...prev, nodes: prev.nodes.map(n => n.id !== nodeId ? n : { ...n, conditions: n.conditions?.map(c => c.id === condId ? { ...c, ...updates } : c) }) }));
  };
  const addCondition = (nodeId: string) => {
    setFlow(prev => ({ ...prev, nodes: prev.nodes.map(n => n.id !== nodeId ? n : { ...n, conditions: [...(n.conditions || []), { id: `cond_${Date.now()}`, check: '', if_true: '', if_false: '' }] }) }));
  };
  const removeCondition = (nodeId: string, condId: string) => {
    setFlow(prev => ({ ...prev, nodes: prev.nodes.map(n => n.id !== nodeId ? n : { ...n, conditions: n.conditions?.filter(c => c.id !== condId) }) }));
  };

  // Action CRUD
  const updateAction = (nodeId: string, actionId: string, updates: Partial<FlowAction>) => {
    setFlow(prev => ({ ...prev, nodes: prev.nodes.map(n => n.id !== nodeId ? n : { ...n, actions: n.actions?.map(a => a.id === actionId ? { ...a, ...updates } : a) }) }));
  };
  const addAction = (nodeId: string) => {
    setFlow(prev => ({ ...prev, nodes: prev.nodes.map(n => n.id !== nodeId ? n : { ...n, actions: [...(n.actions || []), { id: `action_${Date.now()}`, label: 'New option', enabled: true }] }) }));
  };
  const removeAction = (nodeId: string, actionId: string) => {
    setFlow(prev => ({ ...prev, nodes: prev.nodes.map(n => n.id !== nodeId ? n : { ...n, actions: n.actions?.filter(a => a.id !== actionId) }) }));
  };

  // Data field CRUD
  const updateDataField = (nodeId: string, fieldId: string, updates: Partial<DataField>) => {
    setFlow(prev => ({ ...prev, nodes: prev.nodes.map(n => n.id !== nodeId ? n : { ...n, data_fields: n.data_fields?.map(f => f.id === fieldId ? { ...f, ...updates } : f) }) }));
  };
  const addDataField = (nodeId: string) => {
    setFlow(prev => ({ ...prev, nodes: prev.nodes.map(n => n.id !== nodeId ? n : { ...n, data_fields: [...(n.data_fields || []), { id: `field_${Date.now()}`, label: '', field_type: 'text' as const, required: true }] }) }));
  };
  const removeDataField = (nodeId: string, fieldId: string) => {
    setFlow(prev => ({ ...prev, nodes: prev.nodes.map(n => n.id !== nodeId ? n : { ...n, data_fields: n.data_fields?.filter(f => f.id !== fieldId) }) }));
  };

  // Drag
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

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {NODE_TYPES.map(t => (
          <div key={t.value} className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs ${t.bgColor}`}>
            <t.icon className={`h-3 w-3 ${t.color}`} />
            <span>{t.label}</span>
          </div>
        ))}
      </div>

      {/* Two-panel layout */}
      <div className="flex gap-0 border rounded-lg bg-background overflow-hidden" style={{ height: 'calc(100vh - 340px)', minHeight: '500px' }}>
        {/* Left: Flow Canvas */}
        <div className="flex-1 overflow-auto bg-muted/30 relative">
          <div className="flex flex-col items-center py-8 px-4 min-h-full">
            {/* Start marker */}
            <div className="flex items-center gap-2 mb-1">
              <div className="h-3 w-3 rounded-full bg-green-500 border-2 border-green-600" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Start</span>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={flow.nodes.map(n => n.id)} strategy={verticalListSortingStrategy}>
                {flow.nodes.map((node, idx) => (
                  <React.Fragment key={node.id}>
                    {/* Connector or Add Step between nodes */}
                    {idx === 0 ? (
                      <Connector />
                    ) : null}

                    <SortableDiagramNode
                      id={node.id}
                      node={node}
                      isSelected={selectedNodeId === node.id}
                      onClick={() => setSelectedNodeId(selectedNodeId === node.id ? null : node.id)}
                    />

                    {/* Decision branches */}
                    {node.type === 'decision' && node.conditions && node.conditions.length > 0 && (
                      <>
                        <Connector isDecision />
                        <BranchSummary condition={node.conditions[0]} />
                        <MergeConnector />
                      </>
                    )}

                    {/* Add step between nodes (not after decision branches - those already have merge) */}
                    {idx < flow.nodes.length - 1 && (
                      node.type !== 'decision' ? (
                        <AddStepButton onAdd={(type) => addNodeAt(type, idx)} />
                      ) : (
                        <div /> /* merge connector already shows */
                      )
                    )}
                  </React.Fragment>
                ))}
              </SortableContext>
            </DndContext>

            {/* End add button */}
            <AddStepButton onAdd={addNodeEnd} />

            {/* End marker */}
            <div className="flex items-center gap-2 mt-2">
              <div className="h-3 w-3 rounded-full bg-red-500 border-2 border-red-600" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">End</span>
            </div>
          </div>
        </div>

        {/* Right: Node Editor or General Rules */}
        <div className={`border-l bg-background transition-all duration-200 ${selectedNode ? 'w-[380px]' : 'w-[280px]'} shrink-0 flex flex-col`}>
          {selectedNode ? (
            <NodeEditor
              node={selectedNode}
              onClose={() => setSelectedNodeId(null)}
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
          ) : (
            <div className="flex-1 overflow-y-auto">
              {/* General Rules */}
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Settings2 className="h-4 w-4" />
                  General Rules
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tone</Label>
                    <Input
                      value={flow.general_rules.tone}
                      onChange={(e) => setFlow(prev => ({ ...prev, general_rules: { ...prev.general_rules, tone: e.target.value } }))}
                      placeholder="e.g. Friendly, concise"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Max initial lines</Label>
                    <Input
                      type="number" min={1} max={20}
                      value={flow.general_rules.max_initial_lines}
                      onChange={(e) => setFlow(prev => ({ ...prev, general_rules: { ...prev.general_rules, max_initial_lines: parseInt(e.target.value) || 4 } }))}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Language behavior</Label>
                    <Input
                      value={flow.general_rules.language_behavior || ''}
                      onChange={(e) => setFlow(prev => ({ ...prev, general_rules: { ...prev.general_rules, language_behavior: e.target.value } }))}
                      placeholder="e.g. Match customer language"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Escalation threshold</Label>
                    <Input
                      type="number" min={1} max={20}
                      value={flow.general_rules.escalation_threshold || 3}
                      onChange={(e) => setFlow(prev => ({ ...prev, general_rules: { ...prev.general_rules, escalation_threshold: parseInt(e.target.value) || 3 } }))}
                      className="text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={flow.general_rules.never_dump_history}
                      onCheckedChange={(checked) => setFlow(prev => ({ ...prev, general_rules: { ...prev.general_rules, never_dump_history: checked } }))}
                    />
                    <Label className="text-xs">Never dump full history unprompted</Label>
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <p className="text-xs text-muted-foreground">
                    Click any node in the flowchart to edit its details. Drag nodes to reorder. Use the <Plus className="h-3 w-3 inline" /> buttons to add steps.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

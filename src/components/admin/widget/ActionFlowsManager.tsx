import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, GripVertical, Trash2, ChevronDown, ChevronUp, Shield, Zap, Pencil } from 'lucide-react';
import { toast } from 'sonner';

interface FlowStep {
  id: string;
  type: 'collect' | 'confirm' | 'lookup' | 'display';
  field?: string;
  marker?: string;
  instruction: string;
}

interface ActionFlow {
  id: string;
  organization_id: string;
  widget_config_id: string;
  intent_key: string;
  label: string;
  description: string | null;
  trigger_phrases: string[];
  requires_verification: boolean;
  flow_steps: FlowStep[];
  is_active: boolean;
  sort_order: number;
}

const AVAILABLE_MARKERS = [
  'ADDRESS_SEARCH', 'LICENSE_PLATE', 'SERVICE_SELECT', 'TIME_SLOT',
  'BOOKING_SUMMARY', 'BOOKING_EDIT', 'PHONE_VERIFY', 'EMAIL_INPUT',
  'TEXT_INPUT', 'YES_NO', 'ACTION_MENU', 'RATING', 'CONFIRM',
];

const STEP_TYPES = [
  { value: 'collect', label: 'Collect Data' },
  { value: 'confirm', label: 'Confirm Action' },
  { value: 'lookup', label: 'Lookup Data' },
  { value: 'display', label: 'Display Info' },
];

interface ActionFlowsManagerProps {
  widgetId: string;
  organizationId: string;
}

export const ActionFlowsManager: React.FC<ActionFlowsManagerProps> = ({ widgetId, organizationId }) => {
  const queryClient = useQueryClient();
  const [expandedFlowId, setExpandedFlowId] = useState<string | null>(null);
  const [editingFlow, setEditingFlow] = useState<ActionFlow | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newFlow, setNewFlow] = useState({ intent_key: '', label: '', description: '', trigger_phrases: '', requires_verification: true });

  const { data: flows = [], isLoading } = useQuery({
    queryKey: ['action-flows', widgetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_action_flows')
        .select('*')
        .eq('widget_config_id', widgetId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ActionFlow[];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('ai_action_flows').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['action-flows', widgetId] }),
  });

  const createFlow = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('ai_action_flows').insert({
        organization_id: organizationId,
        widget_config_id: widgetId,
        intent_key: newFlow.intent_key,
        label: newFlow.label,
        description: newFlow.description || null,
        trigger_phrases: newFlow.trigger_phrases.split(',').map(p => p.trim()).filter(Boolean),
        requires_verification: newFlow.requires_verification,
        flow_steps: [],
        sort_order: flows.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-flows', widgetId] });
      setShowCreateDialog(false);
      setNewFlow({ intent_key: '', label: '', description: '', trigger_phrases: '', requires_verification: true });
      toast.success('Action flow created');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateFlow = useMutation({
    mutationFn: async (flow: ActionFlow) => {
      const { error } = await supabase.from('ai_action_flows').update({
        label: flow.label,
        description: flow.description,
        trigger_phrases: flow.trigger_phrases,
        requires_verification: flow.requires_verification,
        flow_steps: flow.flow_steps as any,
      }).eq('id', flow.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-flows', widgetId] });
      toast.success('Flow updated');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteFlow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ai_action_flows').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-flows', widgetId] });
      setExpandedFlowId(null);
      toast.success('Flow deleted');
    },
  });

  const addStep = (flow: ActionFlow) => {
    const updated = { ...flow, flow_steps: [...flow.flow_steps, { id: `step_${Date.now()}`, type: 'collect' as const, field: '', marker: '', instruction: '' }] };
    updateFlow.mutate(updated);
    setEditingFlow(updated);
  };

  const updateStep = (flow: ActionFlow, stepIndex: number, updates: Partial<FlowStep>) => {
    const newSteps = [...flow.flow_steps];
    newSteps[stepIndex] = { ...newSteps[stepIndex], ...updates };
    const updated = { ...flow, flow_steps: newSteps };
    setEditingFlow(updated);
  };

  const removeStep = (flow: ActionFlow, stepIndex: number) => {
    const updated = { ...flow, flow_steps: flow.flow_steps.filter((_, i) => i !== stepIndex) };
    updateFlow.mutate(updated);
    setEditingFlow(updated);
  };

  const saveEditingFlow = () => {
    if (editingFlow) {
      updateFlow.mutate(editingFlow);
      setEditingFlow(null);
    }
  };

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Loading flows...</div>;

  const currentFlows = editingFlow ? flows.map(f => f.id === editingFlow.id ? editingFlow : f) : flows;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Action Flows</h3>
          <p className="text-sm text-muted-foreground">
            Define step-by-step flows for specific customer intents. The AI activates these when it detects matching intent.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add Flow
        </Button>
      </div>

      {currentFlows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Zap className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <h4 className="font-medium">No action flows yet</h4>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Create action flows to guide the AI through specific tasks like booking, cancellation, or rescheduling.
              Without flows, the AI will answer questions from the knowledge base only.
            </p>
            <Button className="mt-4" onClick={() => setShowCreateDialog(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Create First Flow
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {currentFlows.map((flow) => {
            const isExpanded = expandedFlowId === flow.id;
            const isEditing = editingFlow?.id === flow.id;
            const displayFlow = isEditing ? editingFlow! : flow;

            return (
              <Card key={flow.id} className={isExpanded ? 'ring-2 ring-primary/20' : ''}>
                <CardHeader className="pb-3 cursor-pointer" onClick={() => {
                  if (isEditing) return;
                  setExpandedFlowId(isExpanded ? null : flow.id);
                }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {flow.label}
                          <Badge variant="outline" className="font-mono text-xs">{flow.intent_key}</Badge>
                          {flow.requires_verification && (
                            <Badge variant="secondary" className="gap-1"><Shield className="h-3 w-3" /> Verified</Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-0.5">
                          {flow.description || 'No description'} · {flow.flow_steps.length} step{flow.flow_steps.length !== 1 ? 's' : ''}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <Switch
                        checked={displayFlow.is_active}
                        onCheckedChange={(checked) => toggleActive.mutate({ id: flow.id, is_active: checked })}
                      />
                      <Button variant="ghost" size="icon" onClick={() => {
                        setExpandedFlowId(flow.id);
                        setEditingFlow({ ...flow });
                      }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteFlow.mutate(flow.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 space-y-4">
                    {isEditing && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Label</Label>
                          <Input value={editingFlow!.label} onChange={e => setEditingFlow({ ...editingFlow!, label: e.target.value })} />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Input value={editingFlow!.description || ''} onChange={e => setEditingFlow({ ...editingFlow!, description: e.target.value })} />
                        </div>
                        <div>
                          <Label>Trigger Phrases (comma-separated)</Label>
                          <Input value={editingFlow!.trigger_phrases.join(', ')} onChange={e => setEditingFlow({ ...editingFlow!, trigger_phrases: e.target.value.split(',').map(p => p.trim()).filter(Boolean) })} />
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                          <Switch checked={editingFlow!.requires_verification} onCheckedChange={checked => setEditingFlow({ ...editingFlow!, requires_verification: checked })} />
                          <Label>Requires Phone Verification</Label>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Steps</Label>
                        {isEditing && (
                          <Button variant="outline" size="sm" onClick={() => addStep(editingFlow!)}>
                            <Plus className="h-3 w-3 mr-1" /> Add Step
                          </Button>
                        )}
                      </div>

                      {displayFlow.flow_steps.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          No steps defined. {isEditing ? 'Add steps to define the flow.' : 'Edit to add steps.'}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {displayFlow.flow_steps.map((step, idx) => (
                            <div key={step.id} className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30">
                              <span className="text-xs font-mono text-muted-foreground mt-2 w-6 shrink-0">{idx + 1}.</span>
                              {isEditing ? (
                                <div className="flex-1 grid grid-cols-4 gap-2">
                                  <Select value={step.type} onValueChange={v => updateStep(editingFlow!, idx, { type: v as FlowStep['type'] })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {STEP_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                  <Input placeholder="Field name" value={step.field || ''} onChange={e => updateStep(editingFlow!, idx, { field: e.target.value })} />
                                  <Select value={step.marker || 'none'} onValueChange={v => updateStep(editingFlow!, idx, { marker: v === 'none' ? '' : v })}>
                                    <SelectTrigger><SelectValue placeholder="Marker" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">No marker</SelectItem>
                                      {AVAILABLE_MARKERS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                  <div className="flex gap-1">
                                    <Input placeholder="Instruction" value={step.instruction} onChange={e => updateStep(editingFlow!, idx, { instruction: e.target.value })} className="flex-1" />
                                    <Button variant="ghost" size="icon" onClick={() => removeStep(editingFlow!, idx)}>
                                      <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">{step.type}</Badge>
                                    {step.marker && <Badge className="text-xs font-mono">{step.marker}</Badge>}
                                    {step.field && <span className="text-xs text-muted-foreground">({step.field})</span>}
                                  </div>
                                  <p className="text-sm mt-1">{step.instruction}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {isEditing && (
                      <div className="flex gap-2 justify-end pt-2">
                        <Button variant="outline" size="sm" onClick={() => { setEditingFlow(null); }}>Cancel</Button>
                        <Button size="sm" onClick={saveEditingFlow}>Save Changes</Button>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Flow Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Action Flow</DialogTitle>
            <DialogDescription>Define a new action flow that the AI will activate when it detects matching customer intent.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Intent Key</Label>
              <Input placeholder="e.g., new_booking, cancel_booking" value={newFlow.intent_key} onChange={e => setNewFlow({ ...newFlow, intent_key: e.target.value })} />
              <p className="text-xs text-muted-foreground mt-1">Unique identifier, lowercase with underscores</p>
            </div>
            <div>
              <Label>Display Label</Label>
              <Input placeholder="e.g., Book New Service" value={newFlow.label} onChange={e => setNewFlow({ ...newFlow, label: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea placeholder="When should this flow activate?" value={newFlow.description} onChange={e => setNewFlow({ ...newFlow, description: e.target.value })} rows={2} />
            </div>
            <div>
              <Label>Trigger Phrases (comma-separated)</Label>
              <Input placeholder="book a service, I want to order, bestille" value={newFlow.trigger_phrases} onChange={e => setNewFlow({ ...newFlow, trigger_phrases: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={newFlow.requires_verification} onCheckedChange={checked => setNewFlow({ ...newFlow, requires_verification: checked })} />
              <Label>Requires Phone Verification</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={() => createFlow.mutate()} disabled={!newFlow.intent_key || !newFlow.label}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

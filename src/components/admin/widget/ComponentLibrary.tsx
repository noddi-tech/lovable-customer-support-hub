import React, { useState } from 'react';
import { EmojiPicker } from '@/components/ui/emoji-picker';
import { getAllBlocks, type BlockDefinition, type ApiEndpointConfig } from '@/widget/components/blocks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Settings2,
  Play,
  ChevronDown,
  ChevronUp,
  Zap,
  Check,
  X,
  Copy,
  Plus,
  ArrowRight,
  ArrowLeft,
  Globe,
  Server,
  FileJson,
  Trash2,
  Loader2,
} from 'lucide-react';

// ── UI Component options ──

const UI_COMPONENT_OPTIONS = [
  { value: 'text_input', label: 'Text Input', description: 'Standard text field' },
  { value: 'email_input', label: 'Email Input', description: 'Email-formatted input' },
  { value: 'calendar', label: 'Calendar / Date Picker', description: 'Date selection' },
  { value: 'select', label: 'Dropdown Select', description: 'Single-choice dropdown' },
  { value: 'checkbox', label: 'Checkbox', description: 'Toggle yes/no' },
  { value: 'radio', label: 'Radio Group', description: 'Multiple choice, single selection' },
  { value: 'slider', label: 'Slider', description: 'Numeric range' },
  { value: 'textarea', label: 'Text Area', description: 'Multi-line text input' },
  { value: 'custom', label: 'Custom (code only)', description: 'Placeholder for code-defined blocks' },
];

// ── Preview renderer for custom blocks ──

function renderCustomBlockPreview(uiComponent: string) {
  switch (uiComponent) {
    case 'calendar':
      return <Calendar mode="single" className="rounded-md border pointer-events-none scale-[0.85] origin-top-left" />;
    case 'text_input':
      return <Input placeholder="Sample text..." readOnly className="pointer-events-none" />;
    case 'email_input':
      return <Input type="email" placeholder="you@example.com" readOnly className="pointer-events-none" />;
    case 'select':
      return (
        <Select>
          <SelectTrigger className="pointer-events-none"><SelectValue placeholder="Choose option..." /></SelectTrigger>
        </Select>
      );
    case 'checkbox':
      return (
        <div className="flex items-center gap-2 pointer-events-none">
          <Checkbox checked />
          <Label className="text-xs">Sample option</Label>
        </div>
      );
    case 'radio':
      return (
        <RadioGroup defaultValue="a" className="pointer-events-none space-y-1">
          <div className="flex items-center gap-2"><RadioGroupItem value="a" id="ra" /><Label htmlFor="ra" className="text-xs">Option A</Label></div>
          <div className="flex items-center gap-2"><RadioGroupItem value="b" id="rb" /><Label htmlFor="rb" className="text-xs">Option B</Label></div>
        </RadioGroup>
      );
    case 'slider':
      return <Slider defaultValue={[50]} max={100} step={1} className="pointer-events-none" />;
    case 'textarea':
      return <Textarea placeholder="Multi-line text..." readOnly rows={2} className="pointer-events-none" />;
    default:
      return <p className="text-xs text-muted-foreground italic">Custom component</p>;
  }
}

// ── Types for custom DB blocks ──

interface CustomBlockRow {
  id: string;
  organization_id: string;
  type_key: string;
  label: string;
  icon: string;
  description: string | null;
  marker: string;
  closing_marker: string | null;
  field_type: string | null;
  requires_api: boolean;
  api_endpoints: any;
  ui_component: string | null;
  created_at: string;
}

// ── Sample data for interactive sandbox ──

function getSampleData(type: string): Record<string, any> {
  switch (type) {
    case 'action_menu':
      return { options: ['Check order status', 'Talk to an agent', 'Cancel my order'] };
    case 'yes_no':
      return { question: 'Was this helpful?' };
    case 'confirm':
      return { summary: 'Cancel your booking for March 15?' };
    case 'text_input':
      return { placeholder: 'Enter your name…' };
    case 'email_input':
      return { placeholder: 'you@example.com' };
    case 'phone_verify':
      return {};
    case 'rating':
      return { maxStars: 5 };
    default:
      return {};
  }
}

// ── Library card ──

const BlockCard: React.FC<{ block: BlockDefinition }> = ({ block }) => {
  const [expanded, setExpanded] = useState(false);
  const PreviewComp = block.flowMeta.previewComponent;

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl" role="img" aria-label={block.flowMeta.label}>
              {block.flowMeta.icon}
            </span>
            <CardTitle className="text-base">{block.flowMeta.label}</CardTitle>
          </div>
          <div className="flex gap-1.5">
            {block.requiresApi && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <Zap className="h-3 w-3" /> API
              </Badge>
            )}
          </div>
        </div>
        <CardDescription className="text-xs mt-1">
          {block.flowMeta.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 pt-0">
        <div className="flex flex-wrap gap-1">
          {block.flowMeta.applicableFieldTypes?.map((ft) => (
            <Badge key={ft} variant="secondary" className="text-[10px]">
              field: {ft}
            </Badge>
          ))}
          {block.flowMeta.applicableNodeTypes?.map((nt) => (
            <Badge key={nt} variant="secondary" className="text-[10px]">
              node: {nt}
            </Badge>
          ))}
        </div>

        {PreviewComp && (
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">
              Preview
            </p>
            <PreviewComp primaryColor="hsl(var(--primary))" />
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {expanded ? 'Close sandbox' : 'Try it'}
        </Button>

        {expanded && (
          <div className="rounded-lg border-2 border-dashed border-primary/30 bg-background p-4">
            <p className="text-[10px] font-medium text-primary mb-3 uppercase tracking-wider">
              Interactive Sandbox
            </p>
            <block.component
              primaryColor="hsl(var(--primary))"
              messageId="sandbox-preview"
              blockIndex={0}
              usedBlocks={new Set()}
              onAction={(val, key) => {
                toast({
                  title: 'Action triggered',
                  description: `Value: "${val}" — Block key: ${key}`,
                });
              }}
              data={getSampleData(block.type)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ── Custom block card (from DB) ──

const CustomBlockCard: React.FC<{ block: CustomBlockRow; onDelete: (id: string) => void }> = ({ block, onDelete }) => {
  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl" role="img" aria-label={block.label}>
              {block.icon}
            </span>
            <CardTitle className="text-base">{block.label}</CardTitle>
          </div>
          <div className="flex gap-1.5">
            <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">Custom</Badge>
            {block.requires_api && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <Zap className="h-3 w-3" /> API
              </Badge>
            )}
          </div>
        </div>
        <CardDescription className="text-xs mt-1">
          {block.description || 'No description'}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 pt-0">
        <div className="flex flex-wrap gap-1">
          {block.field_type && (
            <Badge variant="secondary" className="text-[10px]">
              field: {block.field_type}
            </Badge>
          )}
          {block.ui_component && block.ui_component !== 'custom' && (
            <Badge variant="secondary" className="text-[10px]">
              ui: {UI_COMPONENT_OPTIONS.find(o => o.value === block.ui_component)?.label || block.ui_component}
            </Badge>
          )}
        </div>

        {/* Live preview of the chosen shadcn component */}
        <div className="rounded-lg border bg-muted/30 p-3 overflow-hidden">
          <p className="text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">
            Preview
          </p>
          {renderCustomBlockPreview(block.ui_component || 'custom')}
        </div>

        <div className="flex gap-2">
          <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">{block.marker}</code>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => onDelete(block.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// ── API Endpoint detail card ──

const EndpointDetail: React.FC<{ endpoint: ApiEndpointConfig; index: number }> = ({ endpoint, index }) => (
  <div className="rounded-md border bg-muted/20 p-3 space-y-2">
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold text-muted-foreground">{index + 1}.</span>
      <span className="text-sm font-medium">{endpoint.name}</span>
      <Badge variant="outline" className="text-[10px] ml-auto">
        {endpoint.method}
      </Badge>
    </div>
    <p className="text-xs text-muted-foreground">{endpoint.description}</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
      <div className="flex items-start gap-1.5">
        <Server className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
        <div>
          <p className="font-medium text-muted-foreground">Edge Function</p>
          <code className="text-[11px] bg-muted px-1 py-0.5 rounded font-mono">{endpoint.edgeFunction}</code>
        </div>
      </div>
      {endpoint.externalApi && (
        <div className="flex items-start gap-1.5">
          <Globe className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-muted-foreground">External API</p>
            <code className="text-[11px] bg-muted px-1 py-0.5 rounded font-mono">{endpoint.externalApi}</code>
          </div>
        </div>
      )}
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
      {endpoint.requestBody && (
        <div className="flex items-start gap-1.5">
          <FileJson className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-muted-foreground">Request</p>
            <pre className="text-[10px] bg-muted px-1.5 py-1 rounded font-mono whitespace-pre-wrap">
              {JSON.stringify(endpoint.requestBody, null, 2)}
            </pre>
          </div>
        </div>
      )}
      {endpoint.responseShape && (
        <div className="flex items-start gap-1.5">
          <FileJson className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-muted-foreground">Response</p>
            <pre className="text-[10px] bg-muted px-1.5 py-1 rounded font-mono whitespace-pre-wrap">
              {JSON.stringify(endpoint.responseShape, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  </div>
);

// ── Expandable manage row ──

const ManageRow: React.FC<{ block: BlockDefinition }> = ({ block }) => {
  const [open, setOpen] = useState(false);
  const PreviewComp = block.flowMeta.previewComponent;

  const copyMarker = () => {
    const text = block.closingMarker
      ? `${block.marker}…${block.closingMarker}`
      : block.marker;
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: text });
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer rounded-lg border mb-1 transition-colors">
          <span className="text-lg">{block.flowMeta.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{block.flowMeta.label}</p>
            <p className="text-xs text-muted-foreground truncate">{block.flowMeta.description}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {block.requiresApi && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <Zap className="h-3 w-3" /> API
              </Badge>
            )}
            {block.flowMeta.applicableFieldTypes?.map((ft) => (
              <Badge key={ft} variant="secondary" className="text-[10px]">{ft}</Badge>
            ))}
            {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="ml-4 mr-1 mb-3 p-4 rounded-lg border bg-card space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Marker Syntax</p>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                {block.marker}{block.closingMarker ? `…${block.closingMarker}` : ''}
              </code>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={copyMarker}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {block.apiConfig && block.apiConfig.endpoints.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">API Endpoints</p>
              <div className="space-y-2">
                {block.apiConfig.endpoints.map((ep, i) => (
                  <EndpointDetail key={i} endpoint={ep} index={i} />
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-6">
            {block.flowMeta.applicableFieldTypes && block.flowMeta.applicableFieldTypes.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Field Types</p>
                <div className="flex gap-1">
                  {block.flowMeta.applicableFieldTypes.map((ft) => (
                    <Badge key={ft} variant="secondary" className="text-[10px]">{ft}</Badge>
                  ))}
                </div>
              </div>
            )}
            {block.flowMeta.applicableNodeTypes && block.flowMeta.applicableNodeTypes.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Node Types</p>
                <div className="flex gap-1">
                  {block.flowMeta.applicableNodeTypes.map((nt) => (
                    <Badge key={nt} variant="secondary" className="text-[10px]">{nt}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {PreviewComp && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Preview</p>
              <div className="rounded-md border bg-muted/20 p-3 max-w-xs">
                <PreviewComp primaryColor="hsl(var(--primary))" />
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

// ── Custom block manage row ──

const CustomManageRow: React.FC<{ block: CustomBlockRow; onDelete: (id: string) => void }> = ({ block, onDelete }) => {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer rounded-lg border mb-1 transition-colors">
          <span className="text-lg">{block.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{block.label}</p>
            <p className="text-xs text-muted-foreground truncate">{block.description || 'No description'}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">Custom</Badge>
            {block.requires_api && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <Zap className="h-3 w-3" /> API
              </Badge>
            )}
            {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="ml-4 mr-1 mb-3 p-4 rounded-lg border bg-card space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Marker Syntax</p>
            <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{block.marker}</code>
          </div>
          {block.ui_component && block.ui_component !== 'custom' && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">UI Component Preview</p>
              <div className="rounded-md border bg-muted/20 p-3 max-w-xs overflow-hidden">
                {renderCustomBlockPreview(block.ui_component)}
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => onDelete(block.id)}>
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

// ── Create Component Dialog ──

interface NewBlockForm {
  name: string;
  icon: string;
  description: string;
  fieldType: string;
  uiComponent: string;
  requiresApi: boolean;
  endpoints: Array<{
    name: string;
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    bodyFields: Array<{ key: string; type: string }>;
    responseField: string;
  }>;
}

const emptyEndpoint = () => ({
  name: '',
  url: '',
  method: 'POST' as const,
  bodyFields: [{ key: '', type: 'string' }],
  responseField: '',
});

const CreateComponentDialog: React.FC<{ onSaved: () => void }> = ({ onSaved }) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<NewBlockForm>({
    name: '',
    icon: '🔧',
    description: '',
    fieldType: 'custom',
    uiComponent: 'text_input',
    requiresApi: false,
    endpoints: [emptyEndpoint()],
  });

  const currentOrganizationId = useOrganizationStore(s => s.currentOrganizationId);
  const typeKey = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const marker = `[${typeKey.toUpperCase()}]`;

  const totalSteps = form.requiresApi ? 3 : 2;

  const reset = () => {
    setStep(1);
    setForm({ name: '', icon: '🔧', description: '', fieldType: 'custom', uiComponent: 'text_input', requiresApi: false, endpoints: [emptyEndpoint()] });
  };

  const handleSave = async () => {
    if (!currentOrganizationId) {
      toast({ title: 'Error', description: 'No organization selected.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const apiEndpoints = form.requiresApi
        ? form.endpoints.filter(e => e.name).map(ep => ({
            name: ep.name,
            edgeFunction: '',
            externalApi: ep.url,
            method: ep.method,
            requestBody: Object.fromEntries(ep.bodyFields.filter(f => f.key).map(f => [f.key, f.type])),
            responseShape: ep.responseField ? { displayField: ep.responseField } : {},
            description: ep.name,
          }))
        : [];

      const { error } = await supabase.from('widget_block_configs').insert({
        organization_id: currentOrganizationId,
        type_key: typeKey,
        label: form.name,
        icon: form.icon,
        description: form.description,
        marker: marker,
        closing_marker: `[/${typeKey.toUpperCase()}]`,
        field_type: form.fieldType,
        requires_api: form.requiresApi,
        ui_component: form.uiComponent,
        api_endpoints: apiEndpoints,
      } as any);

      if (error) throw error;

      toast({ title: 'Component saved', description: `"${form.name}" has been created.` });
      setOpen(false);
      reset();
      onSaved();
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const updateEndpoint = (idx: number, field: string, value: any) => {
    setForm(prev => {
      const eps = [...prev.endpoints];
      eps[idx] = { ...eps[idx], [field]: value };
      return { ...prev, endpoints: eps };
    });
  };

  const addBodyField = (epIdx: number) => {
    setForm(prev => {
      const eps = [...prev.endpoints];
      eps[epIdx] = { ...eps[epIdx], bodyFields: [...eps[epIdx].bodyFields, { key: '', type: 'string' }] };
      return { ...prev, endpoints: eps };
    });
  };

  const removeBodyField = (epIdx: number, fieldIdx: number) => {
    setForm(prev => {
      const eps = [...prev.endpoints];
      eps[epIdx] = { ...eps[epIdx], bodyFields: eps[epIdx].bodyFields.filter((_, i) => i !== fieldIdx) };
      return { ...prev, endpoints: eps };
    });
  };

  const updateBodyField = (epIdx: number, fieldIdx: number, key: string, value: string) => {
    setForm(prev => {
      const eps = [...prev.endpoints];
      const fields = [...eps[epIdx].bodyFields];
      fields[fieldIdx] = { ...fields[fieldIdx], [key]: value };
      eps[epIdx] = { ...eps[epIdx], bodyFields: fields };
      return { ...prev, endpoints: eps };
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> New Component
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Component — Step {step}/{totalSteps}</DialogTitle>
          <DialogDescription>
            {step === 1 && 'Define the basic metadata for your new interactive block.'}
            {step === 2 && form.requiresApi && 'Configure the API endpoints this component will call.'}
            {step === (form.requiresApi ? 3 : 2) && 'Review and save your new component.'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Basic info */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-[60px_1fr] gap-3">
              <div>
                <Label className="text-xs">Icon</Label>
                <EmojiPicker
                  onEmojiSelect={(emoji) => setForm(f => ({ ...f, icon: emoji }))}
                  trigger={
                    <Button variant="outline" className="h-10 w-10 text-xl p-0">
                      {form.icon}
                    </Button>
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Name</Label>
                <Input placeholder="e.g. Date Picker" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
            </div>
            {form.name && (
              <p className="text-xs text-muted-foreground">
                Type: <code className="bg-muted px-1 rounded font-mono">{typeKey}</code> · Marker: <code className="bg-muted px-1 rounded font-mono">{marker}</code>
              </p>
            )}
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea placeholder="What does this component do for the customer?" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
            <div>
              <Label className="text-xs">Field Type</Label>
              <Select value={form.fieldType} onValueChange={(v) => setForm(f => ({ ...f, fieldType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">UI Component</Label>
              <Select value={form.uiComponent} onValueChange={(v) => setForm(f => ({ ...f, uiComponent: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UI_COMPONENT_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {UI_COMPONENT_OPTIONS.find(o => o.value === form.uiComponent)?.description}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.requiresApi} onCheckedChange={(v) => setForm(f => ({ ...f, requiresApi: v }))} id="needs-api" />
              <Label htmlFor="needs-api" className="text-sm">Requires API</Label>
            </div>
          </div>
        )}

        {/* Step 2: API Config */}
        {step === 2 && form.requiresApi && (
          <div className="space-y-4 py-2">
            {form.endpoints.map((ep, epIdx) => (
              <div key={epIdx} className="rounded-md border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">Endpoint {epIdx + 1}</p>
                  {form.endpoints.length > 1 && (
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setForm(f => ({ ...f, endpoints: f.endpoints.filter((_, i) => i !== epIdx) }))}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input placeholder="e.g. Fetch Booking" value={ep.name} onChange={(e) => updateEndpoint(epIdx, 'name', e.target.value)} />
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <div>
                    <Label className="text-xs">Method</Label>
                    <Select value={ep.method} onValueChange={(v) => updateEndpoint(epIdx, 'method', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="DELETE">DELETE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Endpoint URL</Label>
                    <Input placeholder="https://api.noddi.co/v1/..." value={ep.url} onChange={(e) => updateEndpoint(epIdx, 'url', e.target.value)} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs">Request Body Fields</Label>
                    <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => addBodyField(epIdx)}>
                      <Plus className="h-3 w-3" /> Add
                    </Button>
                  </div>
                  {ep.bodyFields.map((bf, bfIdx) => (
                    <div key={bfIdx} className="flex items-center gap-2 mb-1.5">
                      <Input placeholder="key" className="text-xs" value={bf.key} onChange={(e) => updateBodyField(epIdx, bfIdx, 'key', e.target.value)} />
                      <Select value={bf.type} onValueChange={(v) => updateBodyField(epIdx, bfIdx, 'type', v)}>
                        <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="string">string</SelectItem>
                          <SelectItem value="number">number</SelectItem>
                          <SelectItem value="boolean">boolean</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => removeBodyField(epIdx, bfIdx)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div>
                  <Label className="text-xs">Response Display Field</Label>
                  <Input placeholder="e.g. data.booking.status" className="text-xs" value={ep.responseField} onChange={(e) => updateEndpoint(epIdx, 'responseField', e.target.value)} />
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={() => setForm(f => ({ ...f, endpoints: [...f.endpoints, emptyEndpoint()] }))}>
              <Plus className="h-3.5 w-3.5" /> Add Endpoint
            </Button>
          </div>
        )}

        {/* Review step */}
        {step === totalSteps && (
          <div className="space-y-3 py-2">
            <div className="rounded-md border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{form.icon}</span>
                <span className="font-medium">{form.name || 'Untitled'}</span>
                {form.requiresApi && <Badge variant="outline" className="text-[10px] gap-1"><Zap className="h-3 w-3" /> API</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">{form.description || 'No description'}</p>
              <div className="flex gap-2 text-xs">
                <code className="bg-muted px-1.5 py-0.5 rounded font-mono">{marker}</code>
                <Badge variant="secondary" className="text-[10px]">field: {form.fieldType}</Badge>
                <Badge variant="secondary" className="text-[10px]">ui: {UI_COMPONENT_OPTIONS.find(o => o.value === form.uiComponent)?.label}</Badge>
              </div>
              {/* Preview of chosen UI component */}
              <div className="rounded-md border bg-muted/20 p-3 mt-2 overflow-hidden">
                <p className="text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">Component Preview</p>
                {renderCustomBlockPreview(form.uiComponent)}
              </div>
              {form.requiresApi && form.endpoints.filter(e => e.name).length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Endpoints:</p>
                  {form.endpoints.filter(e => e.name).map((ep, i) => (
                    <div key={i} className="text-xs flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px]">{ep.method}</Badge>
                      <span>{ep.name}</span>
                      {ep.url && <code className="text-[10px] bg-muted px-1 rounded font-mono truncate max-w-[200px]">{ep.url}</code>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between gap-2">
          {step > 1 && (
            <Button variant="outline" size="sm" onClick={() => setStep(s => s - 1)} className="gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
          )}
          <div className="flex-1" />
          {step < totalSteps ? (
            <Button size="sm" onClick={() => setStep(s => s + 1)} disabled={!form.name.trim()} className="gap-1">
              Next <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleSave} disabled={!form.name.trim() || saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Save Component
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ── Manage view with expandable rows ──

const ManageView: React.FC<{ blocks: BlockDefinition[]; customBlocks: CustomBlockRow[]; onDeleteCustom: (id: string) => void }> = ({ blocks, customBlocks, onDeleteCustom }) => (
  <div className="space-y-1">
    {customBlocks.length > 0 && (
      <>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Custom Components</p>
        {customBlocks.map((block) => (
          <CustomManageRow key={block.id} block={block} onDelete={onDeleteCustom} />
        ))}
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-4 mb-2">Built-in Components</p>
      </>
    )}
    {blocks.map((block) => (
      <ManageRow key={block.type} block={block} />
    ))}
    {blocks.length === 0 && customBlocks.length === 0 && (
      <p className="text-sm text-muted-foreground text-center py-8">No components registered.</p>
    )}
  </div>
);

// ── Main export ──

export const ComponentLibrary: React.FC = () => {
  const blocks = getAllBlocks();
  const currentOrganizationId = useOrganizationStore(s => s.currentOrganizationId);
  const queryClient = useQueryClient();

  const { data: customBlocks = [], isLoading } = useQuery({
    queryKey: ['widget-block-configs', currentOrganizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('widget_block_configs')
        .select('*')
        .eq('organization_id', currentOrganizationId!);
      if (error) throw error;
      return (data || []) as unknown as CustomBlockRow[];
    },
    enabled: !!currentOrganizationId,
  });

  const handleDeleteCustom = async (id: string) => {
    const { error } = await supabase.from('widget_block_configs').delete().eq('id', id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted' });
      queryClient.invalidateQueries({ queryKey: ['widget-block-configs', currentOrganizationId] });
    }
  };

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['widget-block-configs', currentOrganizationId] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Interactive Block Components</h3>
          <p className="text-sm text-muted-foreground">
            {blocks.length + customBlocks.length} components — browse, inspect, and test interactive UI blocks.
          </p>
        </div>
        <CreateComponentDialog onSaved={handleSaved} />
      </div>

      <Tabs defaultValue="library">
        <TabsList>
          <TabsTrigger value="library" className="gap-1.5">
            <BookOpen className="h-4 w-4" />
            Library
          </TabsTrigger>
          <TabsTrigger value="manage" className="gap-1.5">
            <Settings2 className="h-4 w-4" />
            Manage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-2">
            {customBlocks.map((block) => (
              <CustomBlockCard key={block.id} block={block} onDelete={handleDeleteCustom} />
            ))}
            {blocks.map((block) => (
              <BlockCard key={block.type} block={block} />
            ))}
          </div>
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </TabsContent>

        <TabsContent value="manage">
          <div className="mt-2">
            <ManageView blocks={blocks} customBlocks={customBlocks} onDeleteCustom={handleDeleteCustom} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

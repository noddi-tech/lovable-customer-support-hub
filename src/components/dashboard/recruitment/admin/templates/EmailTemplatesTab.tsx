import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Mail } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { useEmailTemplates, useFilteredTemplates } from './useEmailTemplates';
import { useEmailTemplate } from './useEmailTemplate';
import { useDefaultPipeline } from '../pipeline/usePipelineAdmin';
import { EmailTemplateList } from './EmailTemplateList';
import { EmailTemplateEditor } from './EmailTemplateEditor';
import { TEMPLATE_FILTER_LABELS, type TemplateFilter } from './types';
import type { Stage } from '../pipeline/types';

export function EmailTemplatesTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const templateIdParam = searchParams.get('templateId');
  const isCreating = templateIdParam === 'new';
  const selectedId = isCreating ? null : templateIdParam;

  const [filter, setFilter] = useState<TemplateFilter>('active');
  const [search, setSearch] = useState('');

  const { data: templates, isLoading } = useEmailTemplates();
  const filtered = useFilteredTemplates(templates, filter, search);
  const { data: selectedTemplate } = useEmailTemplate(selectedId);
  const { data: pipeline } = useDefaultPipeline();
  const stages = useMemo(
    () => (pipeline?.stages as unknown as Stage[]) ?? [],
    [pipeline?.stages],
  );

  const setTemplateId = (id: string | null) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'templates');
    if (id) next.set('templateId', id);
    else next.delete('templateId');
    setSearchParams(next, { replace: true });
  };

  const hasAny = (templates?.length ?? 0) > 0;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Søk etter navn eller emne..."
            className="pl-8"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as TemplateFilter)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(TEMPLATE_FILTER_LABELS) as TemplateFilter[]).map((k) => (
              <SelectItem key={k} value={k}>
                {TEMPLATE_FILTER_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <Button type="button" size="sm" onClick={() => setTemplateId('new')}>
            <Plus />
            Ny mal
          </Button>
        </div>
      </div>

      {/* Split view */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3">
        <Card className="p-3 max-h-[calc(100vh-220px)] overflow-y-auto">
          <EmailTemplateList
            templates={filtered}
            selectedId={selectedId}
            hasAnyTemplates={hasAny}
            stages={stages}
            isLoading={isLoading}
            onSelect={(id) => setTemplateId(id)}
          />
        </Card>
        <Card className="p-4 max-h-[calc(100vh-220px)] overflow-y-auto relative">
          {isCreating ? (
            <EmailTemplateEditor
              mode="create"
              template={null}
              onCreated={(id) => setTemplateId(id)}
              onCancelCreate={() => setTemplateId(null)}
              onDeleted={() => setTemplateId(null)}
            />
          ) : selectedTemplate ? (
            <EmailTemplateEditor
              key={selectedTemplate.id}
              mode="edit"
              template={selectedTemplate}
              onCreated={() => undefined}
              onCancelCreate={() => undefined}
              onDeleted={() => setTemplateId(null)}
            />
          ) : (
            <EmptyEditor />
          )}
        </Card>
      </div>
    </div>
  );
}

function EmptyEditor() {
  return (
    <div className="flex flex-col items-center justify-center text-center min-h-[300px] gap-3 text-muted-foreground">
      <Mail className="h-12 w-12 opacity-40" />
      <p className="text-sm">Velg en mal fra listen, eller opprett en ny.</p>
    </div>
  );
}

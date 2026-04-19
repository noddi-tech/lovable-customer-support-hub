import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import type { EmailTemplate } from './types';
import type { Stage } from '../pipeline/types';
import { EmailTemplatePreview } from './EmailTemplatePreview';
import { EmailTemplateUsageStats } from './EmailTemplateUsageStats';

interface Props {
  template: EmailTemplate;
  stages: Stage[] | undefined;
  previewValues: Record<string, string>;
  onRestore: () => void;
  onHardDelete: () => void;
  isRestorePending: boolean;
}

export function EmailTemplateDeletedView({
  template,
  stages,
  previewValues,
  onRestore,
  onHardDelete,
  isRestorePending,
}: Props) {
  const stage = template.stage_trigger
    ? stages?.find((s) => s.id === template.stage_trigger)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            {template.name}
            <Badge
              variant="outline"
              className="text-[10px] h-5 border-destructive/50 text-destructive bg-destructive/5"
            >
              Slettet {format(new Date(template.soft_deleted_at!), 'dd.MM.yyyy HH:mm')}
            </Badge>
          </h2>
          <p className="text-xs text-muted-foreground">
            Denne malen er slettet og kan ikke redigeres. Du kan gjenopprette den
            eller slette den permanent.
          </p>
        </div>
      </div>

      <EmailTemplateUsageStats templateId={template.id} />

      <Card className="p-4 space-y-3 bg-muted/20">
        <ReadOnlyField label="Navn" value={template.name} />
        <ReadOnlyField label="Beskrivelse" value={template.description || '—'} />
        <ReadOnlyField label="Emne" value={template.subject} />
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">Innhold</div>
          <div
            className="prose prose-sm max-w-none rounded-md border border-input bg-background px-3 py-2 text-sm opacity-70"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: template.body }}
          />
        </div>
        <ReadOnlyField
          label="Stadium-utløser"
          value={
            template.stage_trigger
              ? stage
                ? stage.name
                : `${template.stage_trigger} (ukjent)`
              : 'Manuell'
          }
        />
        <ReadOnlyField label="Aktiv" value={template.is_active ? 'Ja' : 'Nei'} />
      </Card>

      <EmailTemplatePreview
        subject={template.subject}
        body={template.body}
        values={previewValues}
      />

      <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-background/95 backdrop-blur border-t border-input flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onHardDelete}
        >
          <Trash2 />
          Slett permanent
        </Button>
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={onRestore}
          disabled={isRestorePending}
        >
          <RotateCcw />
          {isRestorePending ? 'Gjenoppretter...' : 'Gjenopprett'}
        </Button>
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="rounded-md border border-input bg-background px-3 py-1.5 text-sm opacity-70">
        {value}
      </div>
    </div>
  );
}

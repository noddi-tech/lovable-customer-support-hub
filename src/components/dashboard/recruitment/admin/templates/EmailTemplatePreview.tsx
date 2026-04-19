import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { substituteMergeFields, highlightUnknownTokens } from './mergeFields';
import { cn } from '@/lib/utils';

interface Props {
  subject: string;
  body: string;
  values: Record<string, string>;
  recipientLabel?: string;
  fromLabel?: string;
}

export function EmailTemplatePreview({
  subject,
  body,
  values,
  recipientLabel = 'Ola Nordmann <ola@example.no>',
  fromLabel = 'Din organisasjon <no-reply@...>',
}: Props) {
  const [open, setOpen] = useState(false);

  const renderedSubject = highlightUnknownTokens(substituteMergeFields(subject, values));
  const renderedBody = highlightUnknownTokens(substituteMergeFields(body, values));

  return (
    <div className="rounded-md border border-input bg-background overflow-hidden">
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen((o) => !o)}
        className="w-full justify-start rounded-none h-10 px-3"
      >
        {open ? <ChevronDown /> : <ChevronRight />}
        <span className="text-sm font-medium">Forhåndsvisning</span>
        <span className="ml-2 text-xs text-muted-foreground">
          (med eksempeldata)
        </span>
      </Button>
      <div className={cn('border-t border-input', !open && 'hidden')}>
        <div className="grid grid-cols-[64px_1fr] gap-x-3 gap-y-1.5 p-3 text-xs border-b border-input bg-muted/30">
          <span className="text-muted-foreground">FRA:</span>
          <span className="font-mono">{fromLabel}</span>
          <span className="text-muted-foreground">TIL:</span>
          <span className="font-mono">{recipientLabel}</span>
          <span className="text-muted-foreground">EMNE:</span>
          <span
            className="font-medium"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: renderedSubject }}
          />
        </div>
        <div
          className="prose prose-sm max-w-none p-4"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: renderedBody }}
        />
      </div>
    </div>
  );
}

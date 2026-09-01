import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useDateFormatting } from '@/hooks/useDateFormatting';
import { useCustomerTimeline, type TimelineChannel, type TimelineItem } from '@/hooks/useCustomerTimeline';
import { TimelineItemPreviewDialog } from '@/components/cases/TimelineItemPreviewDialog';
import { History, Mail, MessageSquare, Phone, StickyNote, Briefcase, ChevronDown } from 'lucide-react';

const CHANNEL_ICONS: Record<TimelineChannel, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  chat: MessageSquare,
  phone: Phone,
  note: StickyNote,
  case: Briefcase,
};

const FILTERS: Array<{ id: 'all' | TimelineChannel; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'email', label: 'Email' },
  { id: 'chat', label: 'Chat' },
  { id: 'phone', label: 'Phone' },
  { id: 'note', label: 'Notes' },
  { id: 'case', label: 'Cases' },
];

interface CustomerTimelineProps {
  customerId?: string | null;
  currentConversationId?: string | null;
  /** Show the "View full customer record" footer link. */
  showFooterLink?: boolean;
  limit?: number;
  className?: string;
}

export function CustomerTimeline({
  customerId,
  currentConversationId,
  showFooterLink = true,
  limit = 8,
  className,
}: CustomerTimelineProps) {
  const navigate = useNavigate();
  const { dateTime } = useDateFormatting();
  const [filter, setFilter] = useState<'all' | TimelineChannel>('all');
  const [expanded, setExpanded] = useState(false);
  const [previewItem, setPreviewItem] = useState<TimelineItem | null>(null);
  // Collapsed by default in every side panel — history is reference material, not the main task.
  const [sectionOpen, setSectionOpen] = useState(false);

  const { items, isLoading } = useCustomerTimeline(customerId, {
    excludeConversationId: currentConversationId,
  });

  const filtered = useMemo(
    () => (filter === 'all' ? items : items.filter((i) => i.channel === filter)),
    [items, filter],
  );

  if (!customerId) return null;

  const visible = expanded ? filtered : filtered.slice(0, limit);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">
          <button
            type="button"
            onClick={() => setSectionOpen((v) => !v)}
            aria-expanded={sectionOpen}
            className="flex w-full items-center gap-2 text-left"
          >
            <History className="h-4 w-4" /> Customer history
            {items.length > 0 && (
              <Badge variant="outline" className="ml-auto text-[10px]">
                {items.length}
              </Badge>
            )}
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                items.length > 0 ? '' : 'ml-auto',
                sectionOpen && 'rotate-180',
              )}
            />
          </button>
        </CardTitle>
      </CardHeader>
      {sectionOpen && (
      <CardContent className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                'rounded-full border px-2 py-0.5 text-[11px] transition-colors',
                filter === f.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading history…</p>
        ) : visible.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {items.length === 0
              ? 'First time this customer contacts us.'
              : 'Nothing on this channel yet.'}
          </p>
        ) : (
          <ol className="relative space-y-2 border-l pl-3">
            {visible.map((item) => {
              const Icon = CHANNEL_ICONS[item.channel];
              return (
                <li key={item.id} className="relative">
                  <span className="absolute -left-[19px] top-2 flex h-3 w-3 items-center justify-center rounded-full border bg-background" />
                  <button
                    type="button"
                    onClick={() => setPreviewItem(item)}
                    title="Quick preview"
                    className={cn(
                      'w-full rounded-md border p-2 text-left transition-colors hover:bg-accent/50',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-xs font-medium">
                        {item.title}
                      </span>
                      {item.caseId && item.channel !== 'case' && (
                        <Briefcase className="h-3 w-3 shrink-0 text-muted-foreground" />
                      )}
                    </div>
                    {item.subtitle && (
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                        {item.subtitle}
                      </p>
                    )}
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {dateTime(item.at)}
                      {item.status ? ` · ${item.status.replace(/_/g, ' ')}` : ''}
                    </p>
                  </button>
                </li>
              );
            })}
          </ol>
        )}

        {filtered.length > limit && (
          <Button variant="ghost" size="sm" className="w-full" onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Show less' : `Show all ${filtered.length}`}
          </Button>
        )}

        {showFooterLink && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => navigate(`/customers/${customerId}`)}
          >
            View full customer record
          </Button>
        )}
      </CardContent>
      )}

      <TimelineItemPreviewDialog
        item={previewItem}
        open={!!previewItem}
        onOpenChange={(o) => !o && setPreviewItem(null)}
      />
    </Card>
  );
}

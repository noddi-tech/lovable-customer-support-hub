import { useTemplateUsageStats } from './useTemplateUsageStats';
import { Card } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { nb } from 'date-fns/locale';

interface Props {
  templateId: string | null;
}

export function EmailTemplateUsageStats({ templateId }: Props) {
  const { data, isLoading } = useTemplateUsageStats(templateId);

  const fallback = !templateId || isLoading || data === null;

  const sentLabel = fallback ? '—' : String(data?.sentCount ?? 0);
  const openedCount = fallback ? '—' : String(data?.openedCount ?? 0);
  const openedPct =
    fallback || data?.openRatePercent == null ? '' : ` (${data.openRatePercent}%)`;
  const lastUsedLabel = fallback
    ? '—'
    : data?.lastUsedAt
      ? formatDistanceToNow(new Date(data.lastUsedAt), { addSuffix: true, locale: nb })
      : 'Aldri';

  return (
    <Card className="px-3 py-2.5 bg-muted/30">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
        <Stat label="Sendt" value={sentLabel} />
        <Stat label="Åpnet" value={`${openedCount}${openedPct}`} />
        <Stat label="Sist brukt" value={lastUsedLabel} />
        {fallback && (
          <span className="ml-auto text-[10px] text-muted-foreground italic">
            Sporing kobles til senere
          </span>
        )}
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

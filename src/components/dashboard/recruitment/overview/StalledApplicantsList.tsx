import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import type { OversiktMetrics } from '@/hooks/recruitment/useOversiktMetrics';

interface Props {
  items: OversiktMetrics['needs_attention']['stage_stalled'];
}

function formatOver(hours: number): string {
  if (hours >= 48) return `${Math.floor(hours / 24)} dager over SLA`;
  return `${hours} timer over SLA`;
}

export default function StalledApplicantsList({ items }: Props) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Fastlåst i steget
          <Badge variant="secondary" className="ml-auto">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">Ingen fastlåste søkere 🎉</p>
        ) : (
          <ul className="divide-y">
            {items.slice(0, 8).map((it) => (
              <li
                key={it.application_id}
                onClick={() => navigate(`/operations/recruitment/applicants/${it.applicant_id}`)}
                className="px-4 py-2.5 hover:bg-accent cursor-pointer flex items-center gap-3"
              >
                <span
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: it.stage_color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{it.applicant_name}</div>
                  <div className="text-xs text-muted-foreground">{it.stage_name}</div>
                </div>
                <Badge variant="outline" className="text-xs whitespace-nowrap">
                  {formatOver(it.hours_over_sla)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

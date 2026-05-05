import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import type { OversiktMetrics } from '@/hooks/recruitment/useOversiktMetrics';

interface Props {
  items: OversiktMetrics['needs_attention']['assigned_no_activity'];
}

export default function AssignedNoActivityList({ items }: Props) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-500" />
          Tildelt uten aktivitet
          <Badge variant="secondary" className="ml-auto">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">Alt er oppdatert 🎉</p>
        ) : (
          <ul className="divide-y">
            {items.slice(0, 8).map((it) => (
              <li
                key={it.application_id}
                onClick={() => navigate(`/operations/recruitment/applicants/${it.applicant_id}`)}
                className="px-4 py-2.5 hover:bg-accent cursor-pointer"
              >
                <div className="text-sm font-medium truncate">{it.applicant_name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>{it.stage_name}</span>
                  <span>·</span>
                  <span>Sist hendelse: {it.days_since_last_event} {it.days_since_last_event === 1 ? 'dag' : 'dager'} siden</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

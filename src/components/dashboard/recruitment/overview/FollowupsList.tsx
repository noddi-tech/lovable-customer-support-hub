import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Check, Clock } from 'lucide-react';
import { useCompleteFollowup } from '@/hooks/recruitment/useFollowups';
import SnoozeFollowupDialog from '../applicants/SnoozeFollowupDialog';
import { useDateFormatting } from '@/hooks/useDateFormatting';
import type { FollowupItem } from '@/hooks/recruitment/useOversiktMetrics';

interface Props {
  today: FollowupItem[];
  overdue: FollowupItem[];
}

export default function FollowupsList({ today, overdue }: Props) {
  const navigate = useNavigate();
  const complete = useCompleteFollowup();
  const { time } = useDateFormatting();
  const [snoozeId, setSnoozeId] = useState<string | null>(null);

  const total = today.length + overdue.length;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bell className="h-4 w-4 text-violet-500" />
            Påminnelser
            <Badge variant="secondary" className="ml-auto">{total}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {total === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">Ingen påminnelser i dag</p>
          ) : (
            <ul className="divide-y">
              {today.slice(0, 4).map((it) => (
                <FollowupRow
                  key={it.followup_id}
                  it={it}
                  badge={<Badge variant="outline" className="text-xs">I dag · {time(it.scheduled_for)}</Badge>}
                  onOpen={() => navigate(`/operations/recruitment/applicants/${it.applicant_id}`)}
                  onComplete={() => complete.mutate(it.followup_id)}
                  onSnooze={() => setSnoozeId(it.followup_id)}
                />
              ))}
              {overdue.slice(0, 4).map((it) => (
                <FollowupRow
                  key={it.followup_id}
                  it={it}
                  badge={
                    <Badge variant="destructive" className="text-xs">
                      Forsinket {it.days_overdue} {it.days_overdue === 1 ? 'dag' : 'dager'}
                    </Badge>
                  }
                  onOpen={() => navigate(`/operations/recruitment/applicants/${it.applicant_id}`)}
                  onComplete={() => complete.mutate(it.followup_id)}
                  onSnooze={() => setSnoozeId(it.followup_id)}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {snoozeId && (
        <SnoozeFollowupDialog
          followupId={snoozeId}
          open={!!snoozeId}
          onOpenChange={(o) => !o && setSnoozeId(null)}
        />
      )}
    </>
  );
}

function FollowupRow({
  it,
  badge,
  onOpen,
  onComplete,
  onSnooze,
}: {
  it: FollowupItem;
  badge: React.ReactNode;
  onOpen: () => void;
  onComplete: () => void;
  onSnooze: () => void;
}) {
  return (
    <li className="px-4 py-2.5 hover:bg-accent group flex items-center gap-3">
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpen}>
        <div className="text-sm font-medium truncate flex items-center gap-2">
          {it.applicant_name}
          {badge}
        </div>
        {it.note && <div className="text-xs text-muted-foreground truncate">{it.note}</div>}
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <Button size="icon" variant="ghost" onClick={onComplete} title="Fullført">
          <Check />
        </Button>
        <Button size="icon" variant="ghost" onClick={onSnooze} title="Utsett">
          <Clock />
        </Button>
      </div>
    </li>
  );
}

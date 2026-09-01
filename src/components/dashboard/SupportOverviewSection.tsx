import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Loader2,
  Mail,
  MessageSquare,
  Briefcase,
  Trophy,
  Zap,
  Timer,
  Medal,
  Phone,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatMetricsDialog } from '@/components/dashboard/ChatMetricsDialog';
import { formatMinutes } from '@/hooks/useInboxSupportMetrics';
import {
  CHANNEL_LABELS,
  useAgentLeaderboard,
  useChannelOverview,
  type ChannelRow,
  type LeaderboardRow,
} from '@/hooks/useSupportKpis';

const CHANNEL_ICONS: Record<string, typeof Mail> = {
  email: Mail,
  widget: MessageSquare,
  cases: Briefcase,
  voice: Phone,
};

const CHANNEL_DESCRIPTIONS: Record<string, string> = {
  email:
    'Email tickets received in the last 30 days. "Waiting" counts open threads where the customer sent the last message, so the ball is in our court.',
  widget:
    'Live chat conversations started in the last 30 days. "Waiting" counts open chats where the visitor sent the last message — in chat these should be answered within minutes.',
  cases:
    'Cases opened in the last 30 days. "Open" counts every case that is not resolved or closed; "waiting" counts the ones that sit with us (open, in progress or waiting internally).',
  voice:
    'Phone calls in the last 30 days. "Open" counts calls ringing or on hold right now; "waiting" counts missed calls and voicemails in the window that may need a call back.',
};

const MEDALS = ['🥇', '🥈', '🥉'];

/**
 * Arrow + percentage change against the equally long preceding window.
 * Green means "better" — for times, lower is better.
 */
function Trend({
  current,
  previous,
  higherIsBetter,
  label,
}: {
  current: number | null | undefined;
  previous: number | null | undefined;
  higherIsBetter: boolean;
  label: string;
}) {
  if (current == null || previous == null || previous === 0) return null;
  const diff = current - previous;
  const pct = Math.round((diff / Math.abs(previous)) * 100);
  if (pct === 0) return null;

  const up = diff > 0;
  const good = higherIsBetter ? up : !up;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      title={`${label}: ${up ? '+' : ''}${pct}% vs the previous period (${previous})`}
      className={cn(
        'inline-flex items-center gap-0.5 text-[10px] font-medium tabular-nums',
        good ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
      )}
    >
      <Arrow className="h-3 w-3" />
      {Math.abs(pct)}%
    </span>
  );
}


function ChannelStat({ row }: { row: ChannelRow }) {
  const Icon = CHANNEL_ICONS[row.channel] ?? MessageSquare;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="rounded-md border p-3 cursor-help">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
              <Icon className="h-3.5 w-3.5" />
              {CHANNEL_LABELS[row.channel] ?? row.channel}
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-semibold tabular-nums">{row.received}</span>
              <Trend
                current={row.received}
                previous={row.prev_received}
                higherIsBetter
                label="volume"
              />
              <span className="text-[11px] text-muted-foreground">last 30 days</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
              <Badge variant="outline" className="text-[10px]">
                {row.open} open
              </Badge>
              <Badge
                variant={row.awaiting_us > 0 ? 'destructive' : 'secondary'}
                className="text-[10px]"
              >
                {row.awaiting_us} waiting
              </Badge>
              {row.median_first_response_minutes != null && (
                <Badge variant="secondary" className="gap-1 text-[10px]">
                  {formatMinutes(row.median_first_response_minutes)} 1st reply
                  <Trend
                    current={row.median_first_response_minutes}
                    previous={row.prev_median_first_response_minutes}
                    higherIsBetter={false}
                    label="median first reply"
                  />
                </Badge>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" align="start" className="max-w-[280px] text-xs leading-relaxed">
          {CHANNEL_DESCRIPTIONS[row.channel] ?? 'Conversation volume for this channel.'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function LeaderRow({ row, rank }: { row: LeaderboardRow; rank: number }) {
  const name = row.full_name || row.email || 'Teammate';
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-md border p-2',
        rank === 0 && 'border-amber-400/60 bg-amber-50/60 dark:bg-amber-950/20',
      )}
    >
      <span className="w-6 text-center text-sm">{MEDALS[rank] ?? rank + 1}</span>
      <Avatar className="h-7 w-7">
        {row.avatar_url && <AvatarImage src={row.avatar_url} alt="" />}
        <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{name}</div>
        <TooltipProvider delayDuration={150}>
          <div className="flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex cursor-help items-center gap-1">
                  <Trophy className="h-3 w-3" /> {row.resolved} resolved
                  <Trend
                    current={row.resolved}
                    previous={row.prev_resolved}
                    higherIsBetter
                    label="resolved"
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[280px] text-xs leading-relaxed">
                <p className="font-medium">Resolved conversations</p>
                <p className="text-muted-foreground">
                  {METRIC_DESCRIPTIONS.resolved}
                </p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex cursor-help items-center gap-1">
                  <Zap className="h-3 w-3" /> {formatMinutes(row.median_first_response_minutes)} first
                  reply
                  <Trend
                    current={row.median_first_response_minutes}
                    previous={row.prev_median_first_response_minutes}
                    higherIsBetter={false}
                    label="median first reply"
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[280px] text-xs leading-relaxed">
                <p className="font-medium">Median first reply time</p>
                <p className="text-muted-foreground">{METRIC_DESCRIPTIONS.firstReply}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex cursor-help items-center gap-1">
                  <Timer className="h-3 w-3" /> {formatMinutes(row.median_resolve_minutes)} to resolve
                  <Trend
                    current={row.median_resolve_minutes}
                    previous={row.prev_median_resolve_minutes}
                    higherIsBetter={false}
                    label="median time to resolve"
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[280px] text-xs leading-relaxed">
                <p className="font-medium">Median time to resolve</p>
                <p className="text-muted-foreground">{METRIC_DESCRIPTIONS.resolveTime}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

      </div>

      <Badge variant={rank === 0 ? 'default' : 'secondary'} className="tabular-nums">
        {row.score} pts
      </Badge>
    </div>
  );
}

/**
 * Home screen summary: how many conversations arrived per channel, plus a
 * gamified leaderboard of the teammates resolving the most tickets fastest.
 */
export function SupportOverviewSection() {
  const [chatOpen, setChatOpen] = useState(false);
  const { data: overview, isLoading: overviewLoading } = useChannelOverview(30);
  const { data: board, isLoading: boardLoading } = useAgentLeaderboard(30, 5);

  const leaders = board?.leaders ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Trophy className="h-4 w-4" /> Support overview
        </h2>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setChatOpen(true)}>
          <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Live chat KPIs
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <Card>
          <CardContent className="p-3 space-y-2">
            {overviewLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading overview…
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(overview?.channels ?? []).map((row) => (
                    <ChannelStat key={row.channel} row={row} />
                  ))}
                </div>
                {overview && (
                  <p className="text-[11px] text-muted-foreground">
                    {overview.totals.received} conversations in the last 30 days ·{' '}
                    {overview.totals.open} still open · {overview.totals.awaiting_us} waiting on us.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
              <Medal className="h-3.5 w-3.5" /> Top performers · rolling last 30 days
            </div>
            {boardLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Counting points…
              </div>
            ) : leaders.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">
                No resolved conversations yet in this period.
              </p>
            ) : (
              <div className="space-y-1.5">
                {leaders.map((row, i) => (
                  <LeaderRow key={row.profile_id} row={row} rank={i} />
                ))}
              </div>
            )}
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-[11px] text-muted-foreground cursor-help">
                    Rolling window: only work from the last 30 days counts, so the board moves every
                    day. Points = 10 per resolved ticket + 3 per first reply + a speed bonus for fast
                    first replies.
                  </p>
                </TooltipTrigger>
                <TooltipContent side="top" align="start" className="max-w-[280px] text-xs leading-relaxed">
                  The leaderboard always recalculates over the trailing 30 days from right now — a
                  single big day drops out of the window after 30 days, so nobody stays on top without
                  keeping it up. Resolved counts conversations assigned to the teammate that were closed in the period.
                  Time to resolve is measured from the customer's first message to the close. The speed
                  bonus rewards median first replies under an hour.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardContent>
        </Card>
      </div>

      <ChatMetricsDialog open={chatOpen} onOpenChange={setChatOpen} />
    </div>
  );
}

export default SupportOverviewSection;

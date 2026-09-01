import { Gauge, Settings2, Star, Tag, UserCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getInboxHealth } from '@/lib/inboxHealth';
import { InboxSlaAlert } from '@/components/dashboard/InboxSlaAlert';
import type { InboxSlaRisk } from '@/hooks/useSlaRisk';

export interface HomeInbox {
  id: string;
  name: string;
  color?: string | null;
  open_count: number;
  unread_count: number;
}

export interface InboxCardDefaults {
  brand?: string | null;
  assigneeName?: string | null;
}

interface InboxCardProps {
  inbox: HomeInbox;
  email?: string;
  isDefault: boolean;
  defaults?: InboxCardDefaults;
  slaRisk?: InboxSlaRisk;
  onOpen: () => void;
  onFixSla: () => void;
  onToggleDefault: () => void;
  onOpenMetrics: () => void;
  onConfigure: () => void;
}

interface IconAction {
  key: string;
  icon: typeof Star;
  label: string;
  title: string;
  description: string;
  onClick: () => void;
  className?: string;
  iconClassName?: string;
}

function stop(e: React.MouseEvent, run: () => void) {
  e.stopPropagation();
  run();
}

export function InboxCard({
  inbox,
  email,
  isDefault,
  defaults,
  slaRisk,
  onOpen,
  onFixSla,
  onToggleDefault,
  onOpenMetrics,
  onConfigure,
}: InboxCardProps) {
  const isConfigured = Boolean(email);
  const health = isConfigured
    ? getInboxHealth({
        open: inbox.open_count ?? 0,
        unread: inbox.unread_count ?? 0,
        breached: slaRisk?.breached ?? 0,
        atRisk: slaRisk?.atRisk ?? 0,
      })
    : null;

  const actions: IconAction[] = [
    {
      key: 'default',
      icon: Star,
      label: isDefault ? 'Clear default inbox' : `Set ${inbox.name} as default inbox`,
      title: isDefault ? 'Default inbox' : 'Set as default',
      description: isDefault
        ? 'Conversations open in this inbox first. Click to clear it and go back to All inboxes.'
        : 'Star it and Conversations will open straight into this inbox instead of All inboxes.',
      onClick: onToggleDefault,
      className: isDefault ? 'text-primary' : undefined,
      iconClassName: isDefault ? 'fill-current' : undefined,
    },
    {
      key: 'metrics',
      icon: Gauge,
      label: `Support KPIs for ${inbox.name}`,
      title: 'SLA & support KPIs',
      description: 'Response and resolution times, SLA attainment and current backlog for this inbox.',
      onClick: onOpenMetrics,
    },
    {
      key: 'settings',
      icon: Settings2,
      label: `Configure ${inbox.name}`,
      title: 'Inbox settings',
      description:
        'Email address, signature, default brand and assignee, SLA targets and automation for this inbox.',
      onClick: onConfigure,
    },
  ];

  return (
    <Card
      aria-disabled={!isConfigured}
      className={cn(
        'transition-shadow',
        isConfigured ? 'cursor-pointer hover:shadow-md' : 'cursor-not-allowed opacity-60 bg-muted/30',
        isDefault && 'ring-1 ring-primary/50',
        slaRisk?.breached && 'ring-2 ring-red-500 border-red-400',
        !slaRisk?.breached && slaRisk?.atRisk && 'ring-2 ring-amber-400 border-amber-300',
      )}
      onClick={isConfigured ? onOpen : undefined}
    >
      <CardContent className="flex min-h-[64px] flex-col gap-2 p-3.5 sm:p-3">
        <div className="flex items-start gap-3 min-w-0">
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0 mt-1.5"
            style={{
              backgroundColor: isConfigured
                ? inbox.color || 'hsl(var(--primary))'
                : 'hsl(var(--muted-foreground) / 0.4)',
            }}
          />
          <div className="min-w-0 flex flex-col leading-tight">
            <span
              className={cn(
                'flex flex-wrap items-center gap-1.5 text-[15px] font-medium sm:text-sm',
                isConfigured ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {health && (
                <span
                  role="img"
                  aria-label={`Inbox health: ${health.label}`}
                  title={`${health.label} — ${health.description}`}
                  className="text-base leading-none"
                >
                  {health.emoji}
                </span>
              )}
              <span className="break-words">{inbox.name}</span>
              {isDefault && (
                <Badge variant="outline" className="h-4 px-1.5 text-[9px] border-primary/40 text-primary">
                  Default
                </Badge>
              )}
            </span>
            <span className="text-xs text-muted-foreground break-all sm:text-[11px]">
              {isConfigured ? email : 'Not configured'}
            </span>
            {(defaults?.brand || defaults?.assigneeName) && (
              <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                {defaults.brand && (
                  <span className="flex items-center gap-1" title="Default brand for new conversations">
                    <Tag className="h-3 w-3 shrink-0" />
                    <span className="truncate">{defaults.brand}</span>
                  </span>
                )}
                {defaults.assigneeName && (
                  <span
                    className="flex items-center gap-1"
                    title="New conversations are assigned to this person"
                  >
                    <UserCheck className="h-3 w-3 shrink-0" />
                    <span className="truncate">{defaults.assigneeName}</span>
                  </span>
                )}
              </span>
            )}
          </div>
        </div>

        {isConfigured && slaRisk && <InboxSlaAlert risk={slaRisk} onFix={onFixSla} />}

        <div className="mt-auto flex items-center gap-2 pl-[22px] pt-1">
          {isConfigured ? (
            <>
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                {inbox.unread_count > 0 && (
                  <Badge
                    variant="destructive"
                    className="h-5 shrink-0 px-1.5 text-[10px] font-medium"
                    title="Conversations nobody has read yet"
                  >
                    {inbox.unread_count} unread
                  </Badge>
                )}
                <Badge
                  variant="secondary"
                  className="h-5 shrink-0 px-1.5 text-[10px] font-medium"
                  title="Conversations still open in this inbox"
                >
                  {inbox.open_count} open
                </Badge>
              </div>

              <TooltipProvider delayDuration={200}>
                <div className="flex shrink-0 items-center gap-0.5 rounded-md border border-border/60 bg-muted/40 p-0.5">
                  {actions.map(action => (
                    <Tooltip key={action.key}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={action.label}
                          className={cn(
                            'h-8 w-8 rounded-[5px] sm:h-7 sm:w-7 text-muted-foreground hover:text-foreground',
                            action.className,
                          )}
                          onClick={e => stop(e, action.onClick)}
                        >
                          <action.icon className={cn('h-4 w-4', action.iconClassName)} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[240px] text-xs leading-relaxed">
                        <p className="font-medium">{action.title}</p>
                        <p className="text-muted-foreground">{action.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </TooltipProvider>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs sm:h-7 sm:px-2 sm:text-[11px]"
              onClick={e => stop(e, onConfigure)}
            >
              <Settings2 className="h-3.5 w-3.5 mr-1.5" />
              Configure
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

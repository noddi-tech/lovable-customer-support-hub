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
      <CardContent className="relative flex min-h-[64px] flex-col gap-1.5 p-3 pt-6">
        {/* health emoji / colour dot pinned to the very top-left corner */}
        <span className="absolute left-2 top-1.5 leading-none">
          {health ? (
            <span
              role="img"
              aria-label={`Inbox health: ${health.label}`}
              title={`${health.label} — ${health.description}`}
              className="text-sm leading-none"
            >
              {health.emoji}
            </span>
          ) : (
            <span
              className="block h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: isConfigured
                  ? inbox.color || 'hsl(var(--primary))'
                  : 'hsl(var(--muted-foreground) / 0.4)',
              }}
            />
          )}
        </span>

        {/* SLA chip pinned to the very top-right corner */}
        {isConfigured && slaRisk && (
          <span className="absolute right-2 top-1.5">
            <InboxSlaAlert risk={slaRisk} onFix={onFixSla} compact />
          </span>
        )}

        <div className="flex min-w-0 flex-col leading-tight">
          <span
            className={cn(
              'flex min-w-0 flex-nowrap items-center gap-1.5 text-[15px] font-medium sm:text-sm',
              isConfigured ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {health && (
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: inbox.color || 'hsl(var(--primary))' }}
              />
            )}
            <span className="truncate" title={inbox.name}>
              {inbox.name}
            </span>
            {isDefault && (
              <Badge
                variant="outline"
                className="h-4 shrink-0 px-1.5 text-[9px] border-primary/40 text-primary"
              >
                Default
              </Badge>
            )}
          </span>

          <span className="block truncate text-xs text-muted-foreground sm:text-[11px]" title={email}>
            {isConfigured ? email : 'Not configured'}
          </span>

          {(defaults?.brand || defaults?.assigneeName) && (
            <span className="mt-0.5 flex min-w-0 flex-nowrap items-center gap-x-3 overflow-hidden text-[11px] text-muted-foreground">
              {defaults.brand && (
                <span
                  className="flex min-w-0 flex-nowrap items-center gap-1"
                  title="Default brand for new conversations"
                >
                  <Tag className="h-3 w-3 shrink-0" />
                  <span className="truncate">{defaults.brand}</span>
                </span>
              )}
              {defaults.assigneeName && (
                <span
                  className="flex min-w-0 flex-nowrap items-center gap-1"
                  title="New conversations are assigned to this person"
                >
                  <UserCheck className="h-3 w-3 shrink-0" />
                  <span className="truncate">{defaults.assigneeName}</span>
                </span>
              )}
            </span>
          )}
        </div>

        {isConfigured ? (
          <div className="mt-auto flex flex-col gap-1.5 pt-1">
            <div className="flex min-w-0 flex-nowrap items-center gap-1.5 overflow-hidden">
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

            {/* action icons on their own line */}
            <TooltipProvider delayDuration={200}>
              <div className="flex items-center gap-0.5">
                {actions.map(action => (
                  <Tooltip key={action.key}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={action.label}
                        className={cn(
                          'h-6 w-6 rounded-[5px] text-muted-foreground hover:text-foreground',
                          action.className,
                        )}
                        onClick={e => stop(e, action.onClick)}
                      >
                        <action.icon className={cn('h-3.5 w-3.5', action.iconClassName)} />
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
          </div>
        ) : (
          <div className="mt-auto pt-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={e => stop(e, onConfigure)}
            >
              <Settings2 className="h-3.5 w-3.5 mr-1.5" />
              Configure
            </Button>
          </div>
        )}
      </CardContent>

      </CardContent>
    </Card>
  );
}

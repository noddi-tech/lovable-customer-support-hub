import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOptimizedCounts } from '@/hooks/useOptimizedCounts';
import { useInboxEmailAddresses } from '@/hooks/useInboxEmailAddresses';
import { useInboxDefaults } from '@/hooks/useInboxDefaults';
import { useDefaultInbox } from '@/hooks/useDefaultInbox';
import { useDateFormatting } from '@/hooks/useDateFormatting';
import { UnifiedAppLayout } from '@/components/layout/UnifiedAppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { NAV_ITEMS } from '@/navigation/nav-config';
import { cn } from '@/lib/utils';
import { groupInboxesByDomain } from '@/utils/inboxGrouping';
import { useMemo, useState } from 'react';
import { InboxMetricsDialog } from '@/components/dashboard/InboxMetricsDialog';
import { SupportOverviewSection } from '@/components/dashboard/SupportOverviewSection';
import { InboxSlaAlert } from '@/components/dashboard/InboxSlaAlert';
import { useSlaRiskByInbox } from '@/hooks/useSlaRisk';
import { getInboxHealth } from '@/lib/inboxHealth';

import {
  Inbox,
  MessageSquare,
  Megaphone,
  Cog,
  Briefcase,
  ArrowRight,
  MailOpen,
  Mail,
  UserCheck,
  Clock,
  Settings2,
  Star,
  Tag,
  Gauge,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SidebarTrigger } from '@/components/ui/sidebar';

const sectionIcons: Record<string, typeof MessageSquare> = {
  interactions: MessageSquare,
  marketing: Megaphone,
  operations: Briefcase,
  settings: Cog,
};

const sectionLabels: Record<string, string> = {
  interactions: 'Interactions',
  marketing: 'Marketing',
  operations: 'Operations',
  settings: 'Settings',
};

export default function HomePage() {
  const navigate = useNavigate();
  const { profile, user, isAdmin, isSuperAdmin } = useAuth();
  const { conversations, inboxes } = useOptimizedCounts();
  const { byInbox: slaRiskByInbox } = useSlaRiskByInbox();
  const { data: inboxEmails = {} } = useInboxEmailAddresses();
  const { data: inboxDefaults = {} } = useInboxDefaults();
  const { defaultInboxId, setDefaultInbox } = useDefaultInbox();

  const { dateTime } = useDateFormatting();
  const [metricsInbox, setMetricsInbox] = useState<{ id: string; name: string } | null>(null);

  const firstName = (profile?.full_name || user?.user_metadata?.full_name || 'there').split(' ')[0];

  const visibleItems = NAV_ITEMS.filter(item => {
    if (!item.requiredRole) return true;
    if (item.requiredRole === 'admin' && (isAdmin || isSuperAdmin)) return true;
    if (item.requiredRole === 'super_admin' && isSuperAdmin) return true;
    return false;
  });

  const sections = ['interactions', 'marketing', 'operations', 'settings'] as const;

  const inboxGroups = useMemo(
    () => groupInboxesByDomain(inboxes.filter(i => i.is_active), inboxEmails),
    [inboxes, inboxEmails],
  );


  const stats = [
    { label: 'Open', filter: 'open', value: conversations.open, icon: MailOpen },
    { label: 'Unread', filter: 'unread', value: conversations.unread, icon: Mail },
    { label: 'Assigned to me', filter: 'assigned', value: conversations.assigned, icon: UserCheck },
    { label: 'Pending', filter: 'pending', value: conversations.pending, icon: Clock },
  ];

  return (
    <UnifiedAppLayout>
      {/* Mobile top bar with menu button */}
      <header className="md:hidden sticky top-0 z-20 flex items-center gap-2 h-14 px-2 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <SidebarTrigger className="h-10 w-10" aria-label="Open navigation menu" />
        <span className="text-base font-semibold text-foreground">Home</span>
      </header>

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">
            Welcome back, {firstName} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {dateTime(new Date())}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {stats.map(s => (
            <Card
              key={s.label}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/interactions/text/${s.filter}?inbox=all`)}
            >
              <CardContent className="p-3 relative">
                <s.icon className="h-4 w-4 text-muted-foreground/50 absolute top-3 right-3" />
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator />

        {/* Channel overview + gamified leaderboard */}
        <SupportOverviewSection />

        <Separator />

        {/* Inboxes */}

        {inboxes.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Inbox className="h-4 w-4" /> Inboxes
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[11px]"
                onClick={() => navigate('/admin/inboxes')}
              >
                <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                Manage inboxes
              </Button>
            </div>
            <div className="space-y-4">
              {inboxGroups.map(group => (
                <div key={group.label}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.label}
                    </span>
                    <span className="h-px flex-1 bg-border" />
                    <span className="text-[10px] text-muted-foreground">
                      {group.inboxes.length} {group.inboxes.length === 1 ? 'inbox' : 'inboxes'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {group.inboxes.map(inbox => {

                const email = inboxEmails[inbox.id];
                const isConfigured = Boolean(email);
                 const isDefault = defaultInboxId === inbox.id;
                const defaults = inboxDefaults[inbox.id];
                const slaRisk = slaRiskByInbox.get(inbox.id);
                const health = isConfigured
                  ? getInboxHealth({
                      open: inbox.open_count ?? 0,
                      unread: inbox.unread_count ?? 0,
                      breached: slaRisk?.breached ?? 0,
                      atRisk: slaRisk?.atRisk ?? 0,
                    })
                  : null;


                return (
                  <Card
                    key={inbox.id}
                    aria-disabled={!isConfigured}
                    className={cn(
                      'transition-shadow',
                      isConfigured
                        ? 'cursor-pointer hover:shadow-md'
                        : 'cursor-not-allowed opacity-60 bg-muted/30',
                      isDefault && 'ring-1 ring-primary/50',
                      slaRisk?.breached && 'ring-2 ring-red-500 border-red-400',
                      !slaRisk?.breached && slaRisk?.atRisk && 'ring-2 ring-amber-400 border-amber-300'
                    )}
                    onClick={isConfigured ? () => navigate(`/interactions/text/open?inbox=${inbox.id}`) : undefined}
                  >
                    <CardContent className="flex min-h-[64px] flex-col gap-2 p-3.5 sm:p-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0 mt-1.5"
                          style={{ backgroundColor: isConfigured ? (inbox.color || 'hsl(var(--primary))') : 'hsl(var(--muted-foreground) / 0.4)' }}
                        />
                        <div className="min-w-0 flex flex-col leading-tight">
                          <span className={cn('flex flex-wrap items-center gap-1.5 text-[15px] font-medium sm:text-sm', isConfigured ? 'text-foreground' : 'text-muted-foreground')}>
                            {isConfigured && health && (
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
                                <span className="flex items-center gap-1" title="New conversations are assigned to this person">
                                  <UserCheck className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{defaults.assigneeName}</span>
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {isConfigured && slaRisk && (
                        <InboxSlaAlert
                          risk={slaRisk}
                          onFix={() =>
                            navigate(
                              `/interactions/text/open?inbox=${inbox.id}` +
                                (slaRisk.nextConversationId ? `&m=${slaRisk.nextConversationId}` : ''),
                            )
                          }
                        />
                      )}

                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pl-[22px]">


                        {isConfigured ? (
                          <>
                            {inbox.unread_count > 0 && (
                              <Badge
                                variant="destructive"
                                className="text-[10px] px-1.5 py-0"
                                title="Unread conversations"
                              >
                                {inbox.unread_count} unread
                              </Badge>
                            )}
                            <Badge variant="secondary" title="Open conversations">
                              {inbox.open_count} open
                            </Badge>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 px-3 text-xs sm:h-7 sm:px-2 sm:text-[11px]"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/inboxes/${inbox.id}`);
                            }}
                          >
                            <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                            Configure
                          </Button>
                        )}

                        {isConfigured && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={isDefault ? `Clear default inbox` : `Set ${inbox.name} as default inbox`}
                                  className={cn(
                                    'h-9 w-9 sm:h-7 sm:w-7',
                                    isDefault ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDefaultInbox(isDefault ? null : inbox.id);
                                  }}
                                >
                                  <Star className={cn('h-4 w-4', isDefault && 'fill-current')} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {isDefault ? 'This is your default inbox' : 'Set as my default inbox'}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}

                        {isConfigured && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Support KPIs for ${inbox.name}`}
                                  className="h-9 w-9 sm:h-7 sm:w-7 text-muted-foreground hover:text-foreground"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMetricsInbox({ id: inbox.id, name: inbox.name });
                                  }}
                                >
                                  <Gauge className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>SLA & support KPIs</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}

                        {isConfigured && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Configure ${inbox.name}`}
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/admin/inboxes/${inbox.id}`);
                                  }}
                                >
                                  <Settings2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Configure this inbox</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}

                      </div>
                    </CardContent>
                  </Card>
                );
              })}
                  </div>
                </div>
              ))}
            </div>

            <Separator className="mt-4" />
          </div>
        )}

        {/* Section link cards */}
        {sections.map(sectionKey => {
          const items = visibleItems.filter(i => i.group === sectionKey);
          if (items.length === 0) return null;
          const SectionIcon = sectionIcons[sectionKey];

          return (
            <div key={sectionKey}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                <SectionIcon className="h-4 w-4" /> {sectionLabels[sectionKey]}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {items.map(item => {
                  const Icon = item.icon;
                  return (
                    <Card
                      key={item.id}
                      className="cursor-pointer hover:shadow-md transition-shadow group relative"
                      onClick={() => navigate(item.to)}
                    >
                      <CardContent className="p-3 flex flex-col items-center justify-center text-center">
                        <ArrowRight className="h-3 w-3 text-muted-foreground absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Icon className="h-5 w-5 text-muted-foreground mb-1.5" />
                        <span className="text-sm font-medium text-foreground">{item.label}</span>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <InboxMetricsDialog
        open={Boolean(metricsInbox)}
        onOpenChange={(open) => { if (!open) setMetricsInbox(null); }}
        inboxId={metricsInbox?.id ?? null}
        inboxName={metricsInbox?.name ?? ''}
      />
    </UnifiedAppLayout>
  );
}

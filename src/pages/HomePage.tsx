import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOptimizedCounts } from '@/hooks/useOptimizedCounts';
import { useInboxEmailAddresses } from '@/hooks/useInboxEmailAddresses';
import { useDefaultInbox } from '@/hooks/useDefaultInbox';
import { useDateFormatting } from '@/hooks/useDateFormatting';
import { UnifiedAppLayout } from '@/components/layout/UnifiedAppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { NAV_ITEMS } from '@/navigation/nav-config';
import { cn } from '@/lib/utils';
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
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  const { data: inboxEmails = {} } = useInboxEmailAddresses();
  const { defaultInboxId, setDefaultInbox } = useDefaultInbox();

  const { dateTime } = useDateFormatting();

  const firstName = (profile?.full_name || user?.user_metadata?.full_name || 'there').split(' ')[0];

  const visibleItems = NAV_ITEMS.filter(item => {
    if (!item.requiredRole) return true;
    if (item.requiredRole === 'admin' && (isAdmin || isSuperAdmin)) return true;
    if (item.requiredRole === 'super_admin' && isSuperAdmin) return true;
    return false;
  });

  const sections = ['interactions', 'marketing', 'operations', 'settings'] as const;

  const stats = [
    { label: 'Open', value: conversations.open, icon: MailOpen },
    { label: 'Unread', value: conversations.unread, icon: Mail },
    { label: 'Assigned to me', value: conversations.assigned, icon: UserCheck },
    { label: 'Pending', value: conversations.pending, icon: Clock },
  ];

  return (
    <UnifiedAppLayout>
      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {firstName} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {dateTime(new Date())}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => (
            <Card
              key={s.label}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate('/interactions/text/' + s.label.toLowerCase().replace(/ /g, ''))}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {inboxes.filter(i => i.is_active).map(inbox => {
                const email = inboxEmails[inbox.id];
                const isConfigured = Boolean(email);
                const isDefault = defaultInboxId === inbox.id;

                return (
                  <Card
                    key={inbox.id}
                    aria-disabled={!isConfigured}
                    className={cn(
                      'transition-shadow',
                      isConfigured
                        ? 'cursor-pointer hover:shadow-md'
                        : 'cursor-not-allowed opacity-60 bg-muted/30',
                      isDefault && 'ring-1 ring-primary/50'
                    )}
                    onClick={isConfigured ? () => navigate(`/interactions/text/open?inbox=${inbox.id}`) : undefined}
                  >
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-start gap-3 min-w-0">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0 mt-1.5"
                          style={{ backgroundColor: isConfigured ? (inbox.color || 'hsl(var(--primary))') : 'hsl(var(--muted-foreground) / 0.4)' }}
                        />
                        <div className="min-w-0 flex flex-col leading-tight">
                          <span className={cn('text-sm font-medium truncate flex items-center gap-1.5', isConfigured ? 'text-foreground' : 'text-muted-foreground')}>
                            {inbox.name}
                            {isDefault && (
                              <Badge variant="outline" className="h-4 px-1.5 text-[9px] border-primary/40 text-primary">
                                Default
                              </Badge>
                            )}
                          </span>
                          <span className="text-[11px] text-muted-foreground truncate">
                            {isConfigured ? email : 'Not configured'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-3 shrink-0">
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
                            className="h-7 px-2 text-[11px]"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/inboxes?inbox=${inbox.id}`);
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
                                    'h-7 w-7',
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
                                  aria-label={`Configure ${inbox.name}`}
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/admin/inboxes?inbox=${inbox.id}`);
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
    </UnifiedAppLayout>
  );
}

import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOptimizedCounts } from '@/hooks/useOptimizedCounts';
import { useDateFormatting } from '@/hooks/useDateFormatting';
import { UnifiedAppLayout } from '@/components/layout/UnifiedAppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { NAV_ITEMS } from '@/navigation/nav-config';
import { cn } from '@/lib/utils';
import {
  Inbox,
  MessageSquare,
  Megaphone,
  Cog,
  Briefcase,
  ArrowRight,
  Mail,
  MailOpen,
  UserCheck,
  Clock,
} from 'lucide-react';

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

const sectionColors: Record<string, { border: string; icon: string; bg: string }> = {
  interactions: { border: 'border-l-blue-500', icon: 'text-blue-500', bg: 'bg-blue-500/5' },
  marketing: { border: 'border-l-purple-500', icon: 'text-purple-500', bg: 'bg-purple-500/5' },
  operations: { border: 'border-l-amber-500', icon: 'text-amber-500', bg: 'bg-amber-500/5' },
  settings: { border: 'border-l-slate-500', icon: 'text-slate-500', bg: 'bg-slate-500/5' },
};

export default function HomePage() {
  const navigate = useNavigate();
  const { profile, user, isAdmin, isSuperAdmin } = useAuth();
  const { conversations, inboxes } = useOptimizedCounts();
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
    { label: 'Open', value: conversations.open, icon: MailOpen, color: 'text-blue-500' },
    { label: 'Unread', value: conversations.unread, icon: Mail, color: 'text-destructive' },
    { label: 'Assigned to me', value: conversations.assigned, icon: UserCheck, color: 'text-green-500' },
    { label: 'Pending', value: conversations.pending, icon: Clock, color: 'text-yellow-500' },
  ];

  return (
    <UnifiedAppLayout>
      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">
            Welcome back, {firstName} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {dateTime(new Date())}
          </p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map(s => (
            <Card key={s.label} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/interactions/text/' + s.label.toLowerCase().replace(/ /g, ''))}>
              <CardContent className="p-3 flex items-center gap-2.5">
                <s.icon className={cn('h-6 w-6', s.color)} />
                <div>
                  <p className="text-xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Inbox overview */}
        {inboxes.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <Inbox className="h-4 w-4" /> Inboxes
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {inboxes.filter(i => i.is_active).map(inbox => (
                <Card
                  key={inbox.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/interactions/text/open?inbox=${inbox.id}`)}
                >
                  <CardContent className="p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: inbox.color || 'hsl(var(--primary))' }}
                      />
                      <span className="text-sm font-medium truncate text-foreground">{inbox.name}</span>
                    </div>
                    <div className="text-right ml-2 shrink-0">
                      <span className="text-base font-bold text-foreground">{inbox.conversation_count}</span>
                      <p className="text-[10px] text-muted-foreground leading-tight">conversations</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Section link cards */}
        <div className="space-y-4">
          {sections.map(sectionKey => {
            const items = visibleItems.filter(i => i.group === sectionKey);
            if (items.length === 0) return null;
            const SectionIcon = sectionIcons[sectionKey];
            const colors = sectionColors[sectionKey];

            return (
              <div key={sectionKey}>
                <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <SectionIcon className={cn('h-4 w-4', colors.icon)} /> {sectionLabels[sectionKey]}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                  {items.map(item => {
                    const Icon = item.icon;
                    return (
                      <Card
                        key={item.id}
                        className={cn(
                          'cursor-pointer hover:shadow-md transition-shadow group border-l-2',
                          colors.border,
                          colors.bg
                        )}
                        onClick={() => navigate(item.to)}
                      >
                        <CardContent className="p-2.5 flex items-center gap-2">
                          <Icon className={cn('h-4 w-4 shrink-0', colors.icon)} />
                          <span className="text-sm font-medium text-foreground truncate flex-1">{item.label}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </UnifiedAppLayout>
  );
}

import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOptimizedCounts } from '@/hooks/useOptimizedCounts';
import { useDateFormatting } from '@/hooks/useDateFormatting';
import { UnifiedAppLayout } from '@/components/layout/UnifiedAppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
    { label: 'Open', value: conversations.open, icon: MailOpen },
    { label: 'Unread', value: conversations.unread, icon: Mail },
    { label: 'Assigned to me', value: conversations.assigned, icon: UserCheck },
    { label: 'Pending', value: conversations.pending, icon: Clock },
  ];

  return (
    <UnifiedAppLayout>
      <div className="flex-1 overflow-auto p-6 md:p-8 space-y-8">
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
              <CardContent className="p-5 relative">
                <s.icon className="h-5 w-5 text-muted-foreground/50 absolute top-4 right-4" />
                <p className="text-3xl font-bold text-foreground">{s.value}</p>
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
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {inboxes.filter(i => i.is_active).map(inbox => (
                <Card
                  key={inbox.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/interactions/text/open?inbox=${inbox.id}`)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: inbox.color || 'hsl(var(--primary))' }}
                      />
                      <span className="text-sm font-medium truncate text-foreground">{inbox.name}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      {inbox.unread_count > 0 && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          {inbox.unread_count}
                        </Badge>
                      )}
                      <Badge variant="secondary">
                        {inbox.open_count} open
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Separator className="mt-8" />
          </div>
        )}

        {/* Section link cards */}
        {sections.map(sectionKey => {
          const items = visibleItems.filter(i => i.group === sectionKey);
          if (items.length === 0) return null;
          const SectionIcon = sectionIcons[sectionKey];

          return (
            <div key={sectionKey}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <SectionIcon className="h-4 w-4" /> {sectionLabels[sectionKey]}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {items.map(item => {
                  const Icon = item.icon;
                  return (
                    <Card
                      key={item.id}
                      className="cursor-pointer hover:shadow-md transition-shadow group relative"
                      onClick={() => navigate(item.to)}
                    >
                      <CardContent className="p-5 flex flex-col items-center justify-center text-center min-h-[100px]">
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Icon className="h-6 w-6 text-muted-foreground mb-2" />
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

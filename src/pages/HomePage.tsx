import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useOptimizedCounts } from '@/hooks/useOptimizedCounts';
import { useDateFormatting } from '@/hooks/useDateFormatting';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

const sectionDescriptions: Record<string, string> = {
  text: 'Email and text conversations',
  chat: 'Live chat with visitors',
  voice: 'Phone call management',
  campaigns: 'Marketing campaigns',
  newsletters: 'Email newsletters',
  'service-tickets': 'Support ticket tracking',
  doorman: 'Visitor management',
  recruitment: 'Hiring pipeline',
  'ops-analytics': 'Operational insights',
  'bulk-outreach': 'Mass messaging',
  'ops-settings': 'Operations configuration',
  'settings-general': 'App preferences',
  'settings-profile': 'Your profile',
  'settings-notifications': 'Notification preferences',
  'admin-portal': 'Organization admin',
};

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
  const { t } = useTranslation();
  const { profile, user, isAdmin, isSuperAdmin } = useAuth();
  const { conversations, notifications, inboxes } = useOptimizedCounts();
  const { dateTime } = useDateFormatting();

  const firstName = (profile?.full_name || user?.user_metadata?.full_name || 'there').split(' ')[0];

  // Filter nav items by role
  const visibleItems = NAV_ITEMS.filter(item => {
    if (!item.requiredRole) return true;
    if (item.requiredRole === 'admin' && (isAdmin || isSuperAdmin)) return true;
    if (item.requiredRole === 'super_admin' && isSuperAdmin) return true;
    return false;
  });

  // Group by section (exclude notifications group — those are top-level)
  const sections = ['interactions', 'marketing', 'operations', 'settings'] as const;

  const stats = [
    { label: 'Open', value: conversations.open, icon: MailOpen, color: 'text-blue-500' },
    { label: 'Unread', value: conversations.unread, icon: Mail, color: 'text-destructive' },
    { label: 'Assigned to me', value: conversations.assigned, icon: UserCheck, color: 'text-green-500' },
    { label: 'Pending', value: conversations.pending, icon: Clock, color: 'text-yellow-500' },
  ];

  return (
    <div className="flex-1 overflow-auto p-4 md:p-8 space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Welcome back, {firstName} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          {dateTime(new Date())}
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/interactions/text/' + s.label.toLowerCase().replace(/ /g, ''))}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={cn('h-8 w-8', s.color)} />
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Inbox overview */}
      {inboxes.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Inbox className="h-5 w-5" /> Inboxes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {inboxes.filter(i => i.is_active).map(inbox => (
              <Card
                key={inbox.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/interactions/text/open?inbox=${inbox.id}`)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: inbox.color || 'hsl(var(--primary))' }}
                    />
                    <span className="font-medium truncate text-foreground">{inbox.name}</span>
                  </div>
                  <span className="text-lg font-bold text-foreground ml-2">
                    {inbox.conversation_count}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Section link cards */}
      <div className="space-y-6">
        {sections.map(sectionKey => {
          const items = visibleItems.filter(i => i.group === sectionKey);
          if (items.length === 0) return null;
          const SectionIcon = sectionIcons[sectionKey];

          return (
            <div key={sectionKey}>
              <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <SectionIcon className="h-5 w-5" /> {sectionLabels[sectionKey]}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {items.map(item => {
                  const Icon = item.icon;
                  return (
                    <Card
                      key={item.id}
                      className="cursor-pointer hover:shadow-md transition-shadow group"
                      onClick={() => navigate(item.to)}
                    >
                      <CardContent className="p-4 flex items-center gap-3">
                        <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">{item.label}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {sectionDescriptions[item.id] || ''}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
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
  );
}

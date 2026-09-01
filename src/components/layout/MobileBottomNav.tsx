import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, MessageSquare, MessageCircle, Briefcase, Menu } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import { useSidebarNavCounts } from '@/hooks/useSidebarNavCounts';
import { cn } from '@/lib/utils';

type Tab = {
  id: string;
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
};

const TABS: Tab[] = [
  { id: 'home', label: 'Home', to: '/home', icon: Home },
  { id: 'text', label: 'Inbox', to: '/interactions/text', icon: MessageSquare },
  { id: 'chat', label: 'Chat', to: '/interactions/chat', icon: MessageCircle },
  { id: 'cases', label: 'Cases', to: '/operations/cases', icon: Briefcase },
];

/**
 * Native-app style bottom tab bar shown on phones only.
 * Rendered as a flex sibling of <main> so it never overlaps content
 * (important for the chat reply composer and virtual keyboards).
 */
export const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const { setOpenMobile } = useSidebar();
  const counts = useSidebarNavCounts();

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const badgeFor = (id: string) => {
    if (id === 'text') return counts.text ?? 0;
    if (id === 'chat') return counts.chat ?? 0;
    if (id === 'cases') return counts.cases ?? 0;
    return 0;
  };

  return (
    <nav
      aria-label="Primary"
      className="md:hidden shrink-0 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.to);
          const badge = badgeFor(tab.id);
          return (
            <li key={tab.id}>
              <NavLink
                to={tab.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {badge > 0 && (
                    <span className="absolute -right-2.5 -top-1.5 min-w-[16px] rounded-full bg-primary px-1 text-[10px] leading-4 text-primary-foreground">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </span>
                <span className="truncate">{tab.label}</span>
              </NavLink>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={() => setOpenMobile(true)}
            aria-label="Open navigation menu"
            className="flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground"
          >
            <Menu className="h-5 w-5" />
            <span>More</span>
          </button>
        </li>
      </ul>
    </nav>
  );
};

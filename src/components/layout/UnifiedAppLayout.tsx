import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare, 
  Megaphone, 
  Cog, 
  Settings,
  Search,
  Bell,
  User,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UnifiedAppLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
}

export const UnifiedAppLayout: React.FC<UnifiedAppLayoutProps> = ({
  children,
  sidebar
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const getCurrentSection = () => {
    const path = location.pathname;
    if (path.startsWith('/settings') || path.startsWith('/admin/')) return 'settings';
    if (path.includes('marketing')) return 'marketing';
    if (path.includes('operations')) return 'operations';
    return 'interactions';
  };

  const currentSection = getCurrentSection();

  const navigationItems = [
    {
      id: 'interactions',
      label: t('navigation.interactions', 'Interactions'),
      icon: MessageSquare,
      path: '/'
    },
    {
      id: 'marketing',
      label: t('navigation.marketing', 'Marketing'),
      icon: Megaphone,
      path: '/marketing'
    },
    {
      id: 'operations', 
      label: t('navigation.operations', 'Operations'),
      icon: Cog,
      path: '/operations'
    },
    {
      id: 'settings',
      label: t('navigation.settings', 'Settings'),
      icon: Settings,
      path: '/settings'
    }
  ];

  return (
    <SidebarProvider>
      <div className="h-svh grid grid-rows-[56px_1fr] bg-background">
        {/* Top Header */}
        <header className="bg-muted border-b border-border">
          <div className="flex h-full items-center px-4 shadow-sm">
            <div className="flex items-center gap-4 w-full h-full">
              {/* Logo */}
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-semibold text-sm">CS</span>
                </div>
                <span className="font-semibold text-foreground hidden sm:block">Customer Support Hub</span>
              </div>
              
              {/* Centered Main Navigation */}
              <div className="flex-1 flex justify-center h-full">
                <nav className="flex items-center justify-center gap-1 flex-wrap">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentSection === item.id;
                    
                    return (
                      <Button
                        key={item.id}
                        variant={isActive ? "default" : "ghost"}
                        size="sm"
                        className={cn(
                          "gap-2 min-w-0 flex-shrink-0",
                          isActive && "bg-primary text-primary-foreground"
                        )}
                        onClick={() => navigate(item.path)}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="hidden sm:inline">{item.label}</span>
                      </Button>
                    );
                  })}
                </nav>
              </div>

              {/* Right side actions */}
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <Search className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Bell className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <User className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Full-width content area. No max-width, no mx-auto */}
        <main className="grid grid-cols-[240px_minmax(0,1fr)] md:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)] min-h-0">
          <aside className="min-h-0 border-r border-border bg-muted">
            {sidebar}
          </aside>
          <section className="min-h-0 overflow-y-auto w-full max-w-none px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12">
            {children}
          </section>
        </main>
      </div>
    </SidebarProvider>
  );
};
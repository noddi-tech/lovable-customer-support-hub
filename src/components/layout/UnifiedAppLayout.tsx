import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { ResponsiveContainer, ResponsiveFlex } from '@/components/admin/design/components/layouts';
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
      <div className="flex h-screen flex-col overflow-hidden bg-background">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-background px-4 shadow-sm">
          <ResponsiveFlex gap="4" alignment="center" className="flex-1">
            {/* Logo & Navigation */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-semibold text-sm">CS</span>
                </div>
                <span className="font-semibold text-foreground hidden sm:block">Customer Support Hub</span>
              </div>
              
              {/* Main Navigation */}
              <nav className="hidden md:flex items-center gap-1">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentSection === item.id;
                  
                  return (
                    <Button
                      key={item.id}
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      className={cn(
                        "gap-2",
                        isActive && "bg-primary text-primary-foreground"
                      )}
                      onClick={() => navigate(item.path)}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  );
                })}
              </nav>
            </div>

            {/* Right side actions */}
            <ResponsiveFlex gap="2" alignment="center" className="ml-auto">
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
              
              {/* Mobile sidebar trigger */}
              {sidebar && <SidebarTrigger className="md:hidden" />}
            </ResponsiveFlex>
          </ResponsiveFlex>
        </header>

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {sidebar}
          
          <SidebarInset className="flex flex-col flex-1 min-w-0">
            <main className="flex-1 overflow-hidden">
              <ResponsiveContainer 
                className="h-full overflow-y-auto" 
                maxWidth="full"
                padding="4"
              >
                {children}
              </ResponsiveContainer>
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
};
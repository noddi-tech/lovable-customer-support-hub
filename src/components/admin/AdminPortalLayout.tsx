import React from 'react';
import { useLocation, NavLink } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { ResponsiveContainer } from '@/components/admin/design/components/layouts';
import { 
  Users, 
  Settings, 
  Plug, 
  Palette, 
  Phone, 
  Inbox, 
  Building,
  Shield,
  Mail,
  Route
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Heading } from '@/components/ui/heading';

interface AdminPortalLayoutProps {
  children: React.ReactNode;
}

const AdminSidebar = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { state } = useSidebar();

  const mainNavItems = [
    {
      title: t('admin.userManagement'),
      url: '/settings?tab=users',
      icon: Users,
      description: 'Manage users, roles, and permissions'
    },
    {
      title: t('admin.inboxes'),
      url: '/settings?tab=inboxes',
      icon: Inbox,
      description: 'Configure email inboxes and routing'
    },
    {
      title: t('admin.integrations'),
      url: '/settings?tab=integrations',
      icon: Plug,
      description: 'Connect external services and APIs'
    },
    {
      title: t('admin.voice'),
      url: '/settings?tab=voice',
      icon: Phone,
      description: 'Voice integrations and call routing'
    },
    {
      title: t('admin.design'),
      url: '/settings?tab=design',
      icon: Palette,
      description: 'Design system and component library'
    },
    {
      title: t('admin.general'),
      url: '/settings?tab=general',
      icon: Settings,
      description: 'General application settings'
    }
  ];

  const isActive = (url: string) => {
    const urlParams = new URLSearchParams(url.split('?')[1]);
    const currentParams = new URLSearchParams(location.search);
    return urlParams.get('tab') === currentParams.get('tab');
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent className="bg-sidebar">
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-sidebar-primary" />
            {state === 'expanded' && (
              <div>
                <Heading level={3} className="text-lg text-sidebar-foreground font-semibold">
                  {t('admin.title')}
                </Heading>
                <p className="text-xs text-sidebar-foreground/70 mt-1">
                  {t('admin.description')}
                </p>
              </div>
            )}
          </div>
        </div>
        
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70">
            Administration
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    className="w-full"
                  >
                    <NavLink 
                      to={item.url}
                      className={({ isActive }) => 
                        `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                          isActive 
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                            : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                        }`
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {state === 'expanded' && (
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium">{item.title}</div>
                          <div className="text-xs text-sidebar-foreground/60">
                            {item.description}
                          </div>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export const AdminPortalLayout: React.FC<AdminPortalLayoutProps> = ({ children }) => {
  return (
    <SidebarProvider defaultOpen>
      <div className="flex h-screen w-full bg-background">
        <AdminSidebar />
        
        <main className="flex-1 flex flex-col min-w-0">
          {/* Header with mobile trigger */}
          <header className="flex items-center gap-4 p-4 border-b border-border bg-card/50 backdrop-blur-sm">
            <SidebarTrigger className="lg:hidden" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="lg:hidden">
                  <Heading level={2} className="text-lg">Admin Portal</Heading>
                </div>
              </div>
            </div>
          </header>

          {/* Content area with responsive container and scrolling */}
          <ResponsiveContainer 
            className="flex-1 overflow-y-auto"
            padding={{ sm: '4', md: '6' }}
            maxWidth="full"
          >
            <div className="h-full">
              {children}
            </div>
          </ResponsiveContainer>
        </main>
      </div>
    </SidebarProvider>
  );
};
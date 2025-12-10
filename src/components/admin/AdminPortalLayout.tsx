import React from 'react';
import { useLocation, Link } from 'react-router-dom';
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
import { PaneColumn, PaneScroll } from '@/components/layout';
import { 
  Users, 
  Settings, 
  Plug2, 
  Palette, 
  Phone, 
  Inbox, 
  Building,
  Shield,
  Mail,
  Route,
  Brain,
  Crown,
  Download,
  Activity
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { Heading } from '@/components/ui/heading';

interface AdminPortalLayoutProps {
  children: React.ReactNode;
}

const AdminSidebar = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { state } = useSidebar();
  const { isSuperAdmin } = useAuth();

  const organizationItems = [
    {
      title: t('admin.userManagement'),
      url: '/admin/users',
      icon: Users,
      group: 'organization'
    },
    {
      title: t('admin.inboxes'),
      url: '/admin/inboxes',
      icon: Inbox,
      group: 'organization'
    },
    {
      title: t('admin.general'),
      url: '/admin/general',
      icon: Settings,
      group: 'organization'
    },
    {
      title: 'System Health',
      url: '/admin/health',
      icon: Activity,
      group: 'organization'
    }
  ];

  const integrationItems = [
    {
      title: 'Integrations & Routing',
      url: '/admin/integrations',
      icon: Plug2,
      group: 'integrations'
    }
  ];

  const customizationItems = [
    {
      title: t('admin.design'),
      url: '/admin/design',
      icon: Palette,
      group: 'customization'
    }
  ];

  const intelligenceItems = [
    {
      title: 'Knowledge Management',
      url: '/admin/knowledge',
      icon: Brain,
      group: 'intelligence'
    }
  ];

  const superAdminItems = [
    {
      title: 'Super Admin Dashboard',
      url: '/super-admin/dashboard',
      icon: Crown,
      group: 'super-admin'
    },
    {
      title: 'Manage Organizations',
      url: '/super-admin/organizations',
      icon: Building,
      group: 'super-admin'
    },
    {
      title: 'All Users',
      url: '/super-admin/users',
      icon: Users,
      group: 'super-admin'
    },
    {
      title: 'Import Data',
      url: '/super-admin/import',
      icon: Download,
      group: 'super-admin'
    }
  ];

  const isActive = (url: string) => {
    return location.pathname === url || location.pathname.startsWith(url + '/');
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
            Organization
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {organizationItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70">
            Integrations & Routing
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {integrationItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70">
            Customization
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {customizationItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70">
            AI & Intelligence
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {intelligenceItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-yellow-600 dark:text-yellow-500 font-semibold">
              <Crown className="h-4 w-4 inline mr-2" />
              Super Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {superAdminItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link to={item.url} className="text-yellow-700 dark:text-yellow-400">
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
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

          {/* Content area with proper pane scrolling */}
          <PaneColumn className="flex-1 min-h-0">
            <PaneScroll className="h-full">
              <div className="p-6 max-w-7xl mx-auto">
                {children}
              </div>
            </PaneScroll>
          </PaneColumn>
        </main>
      </div>
    </SidebarProvider>
  );
};
import React from 'react';
import { useLocation } from 'react-router-dom';
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
  Brain
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
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
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
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
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
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
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
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
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
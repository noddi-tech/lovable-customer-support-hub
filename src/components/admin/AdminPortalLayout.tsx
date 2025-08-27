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
      url: '/admin/users',
      icon: Users
    },
    {
      title: t('admin.inboxes'),
      url: '/admin/inboxes',
      icon: Inbox
    },
    {
      title: t('admin.integrations'),
      url: '/admin/integrations',
      icon: Plug
    },
    {
      title: t('admin.voice'),
      url: '/admin/voice',
      icon: Phone
    },
    {
      title: t('admin.design'),
      url: '/admin/design',
      icon: Palette
    },
    {
      title: t('admin.general'),
      url: '/admin/general',
      icon: Settings
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
            Administration
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
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

          {/* Content area with responsive container and scrolling */}
          <ResponsiveContainer 
            className="flex-1 overflow-y-auto"
            padding={{ sm: '4', md: '6' }}
            maxWidth="full"
            center={true}
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
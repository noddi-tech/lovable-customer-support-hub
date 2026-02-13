import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
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
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { PaneColumn, PaneScroll } from '@/components/layout';
import { 
  Users, 
  Settings, 
  Plug2, 
  Palette, 
  Inbox, 
  Building,
  Shield,
  Brain,
  Bot,
  Crown,
  Download,
  Activity,
  LayoutDashboard,
  ArrowLeft,
  ScrollText,
  MessageCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { Heading } from '@/components/ui/heading';
import { cn } from '@/lib/utils';

interface AdminPortalLayoutProps {
  children: React.ReactNode;
}

const AdminSidebar = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const { isSuperAdmin } = useAuth();

  const organizationItems = [
    {
      title: 'Overview',
      url: '/admin',
      icon: LayoutDashboard,
      exact: true
    },
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
      title: t('admin.general'),
      url: '/admin/general',
      icon: Settings
    },
    {
      title: 'System Health',
      url: '/admin/health',
      icon: Activity
    }
  ];

  const integrationItems = [
    {
      title: 'Integrations & Routing',
      url: '/admin/integrations',
      icon: Plug2
    }
  ];

  const customizationItems = [
    {
      title: t('admin.design'),
      url: '/admin/design',
      icon: Palette
    }
  ];

  const intelligenceItems = [
    {
      title: 'Knowledge Management',
      url: '/admin/knowledge',
      icon: Brain
    },
    {
      title: 'AI Chatbot',
      url: '/admin/ai-chatbot',
      icon: Bot
    },
    {
      title: 'Contact Widget',
      url: '/admin/widget',
      icon: MessageCircle
    }
  ];

  const superAdminItems = [
    {
      title: 'Dashboard',
      url: '/super-admin/dashboard',
      icon: Crown
    },
    {
      title: 'Organizations',
      url: '/super-admin/organizations',
      icon: Building
    },
    {
      title: 'All Users',
      url: '/super-admin/users',
      icon: Users
    },
    {
      title: 'Import Data',
      url: '/super-admin/import',
      icon: Download
    },
    {
      title: 'Audit Logs',
      url: '/super-admin/audit-logs',
      icon: ScrollText
    }
  ];

  const isActive = (url: string, exact?: boolean) => {
    if (exact) return location.pathname === url;
    return location.pathname === url || location.pathname.startsWith(url + '/');
  };

  const handleBackToApp = () => {
    navigate('/interactions/text');
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent className="bg-sidebar">
        {/* Header with Back to App button */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-sidebar-primary shrink-0" />
            {state === 'expanded' && (
              <div className="flex-1 min-w-0">
                <Heading level={3} className="text-lg text-sidebar-foreground font-semibold">
                  {t('admin.title')}
                </Heading>
                <p className="text-xs text-sidebar-foreground/70 mt-1">
                  {t('admin.description')}
                </p>
              </div>
            )}
          </div>
          {state === 'expanded' && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBackToApp}
              className="w-full mt-3 gap-2 justify-start text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to App
            </Button>
          )}
        </div>
        
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70">
            Organization
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {organizationItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url, item.exact)}>
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

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <Button 
          variant="outline" 
          onClick={handleBackToApp}
          className="w-full gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {state === 'expanded' && <span>Back to App</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};

const LayoutContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isFullHeight = location.pathname === '/admin/ai-chatbot';
  return (
    <div className={cn("py-6", isFullHeight ? "px-4 h-full flex flex-col" : "px-8 max-w-7xl mx-auto")}>
      {children}
    </div>
  );
};

export const AdminPortalLayout: React.FC<AdminPortalLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <SidebarProvider defaultOpen>
      <div className="flex h-screen w-full bg-background">
        <AdminSidebar />
        
        <main className="flex-1 flex flex-col min-w-0">
          {/* Header with mobile trigger and back button */}
          <header className="flex items-center gap-4 p-4 border-b border-border bg-primary/5 backdrop-blur-sm">
            <SidebarTrigger className="lg:hidden" />
            
            {/* Back to App button - visible on mobile/tablet */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/interactions/text')}
              className="gap-2 lg:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to App</span>
            </Button>
            
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
            {location.pathname === '/admin/ai-chatbot' ? (
              <div className="h-full overflow-hidden">
                <LayoutContent>{children}</LayoutContent>
              </div>
            ) : (
              <PaneScroll className="h-full">
                <LayoutContent>{children}</LayoutContent>
              </PaneScroll>
            )}
          </PaneColumn>
        </main>
      </div>
    </SidebarProvider>
  );
};

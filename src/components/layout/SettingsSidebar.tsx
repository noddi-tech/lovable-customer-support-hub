import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { 
  User,
  Mail, 
  Settings,
  Palette,
  Building,
  LinkIcon,
  Phone,
  Layout,
  Shield,
  Bell,
  Home,
  Activity,
  LayoutDashboard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { Crown } from 'lucide-react';

export const SettingsSidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const { isSuperAdmin } = useAuth();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const generalSettingsItems = [
    {
      title: t('settings.tabs.general', 'General'),
      icon: Settings,
      path: '/settings',
      exact: true
    },
    {
      title: t('settings.tabs.profile', 'Profile'),
      icon: User,
      path: '/settings/profile'
    },
    {
      title: t('settings.tabs.notifications', 'Notifications'),
      icon: Bell,
      path: '/settings/notifications'
    }
  ];

  const adminItems = [
    {
      title: 'Overview',
      icon: LayoutDashboard,
      path: '/admin',
      permission: 'manage_settings' as const,
      exact: true
    },
    {
      title: t('settings.tabs.users', 'User Management'),
      icon: User,
      path: '/admin/users',
      permission: 'manage_users' as const
    },
    {
      title: 'Inboxes',
      icon: Mail,
      path: '/admin/inboxes',
      permission: 'manage_settings' as const
    },
    {
      title: 'Integrations & Routing',
      icon: LinkIcon,
      path: '/admin/integrations',
      permission: 'manage_settings' as const
    },
    {
      title: 'Design',
      icon: Layout,
      path: '/admin/design',
      permission: 'manage_settings' as const
    },
    {
      title: 'General',
      icon: Shield,
      path: '/admin/general',
      permission: 'manage_settings' as const
    },
    {
      title: 'System Health',
      icon: Activity,
      path: '/admin/health',
      permission: 'manage_settings' as const
    }
  ];

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <h2 className="text-lg font-semibold text-sidebar-foreground">
          {t('settings.title', 'Settings')}
        </h2>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Personal Settings</SidebarGroupLabel>
          <SidebarMenu>
            {generalSettingsItems.map((item) => {
              const Icon = item.icon;
              const itemIsActive = item.exact 
                ? location.pathname === item.path
                : isActive(item.path);
              
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton 
                    asChild
                    isActive={itemIsActive}
                  >
                    <button
                      onClick={() => navigate(item.path)}
                      className={cn(
                        "w-full justify-start gap-2",
                        itemIsActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.title}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarMenu>
            {adminItems.map((item) => {
              if (item.permission && !hasPermission(item.permission)) {
                return null;
              }
              
              const Icon = item.icon;
              const itemIsActive = item.exact 
                ? location.pathname === item.path
                : isActive(item.path);
              
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton 
                    asChild
                    isActive={itemIsActive}
                  >
                    <button
                      onClick={() => navigate(item.path)}
                      className={cn(
                        "w-full justify-start gap-2",
                        itemIsActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.title}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-yellow-600 dark:text-yellow-500 font-semibold flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Super Admin
            </SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild
                  isActive={isActive('/super-admin')}
                >
                  <button
                    onClick={() => navigate('/super-admin/dashboard')}
                    className={cn(
                      "w-full justify-start gap-2 text-yellow-700 dark:text-yellow-400",
                      isActive('/super-admin') && "bg-yellow-100 dark:bg-yellow-950/30"
                    )}
                  >
                    <Crown className="h-4 w-4" />
                    Super Admin Portal
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>
      
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <Button 
          variant="outline" 
          onClick={() => navigate('/')}
          className="w-full gap-2"
        >
          <Home className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};
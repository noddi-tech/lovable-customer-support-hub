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
  Home
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';

export const SettingsSidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();

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
    },
    {
      title: t('settings.tabs.emailDesign', 'Email Templates'),
      icon: Palette,
      path: '/settings/email-templates'
    },
    {
      title: t('settings.tabs.departments', 'Departments'),
      icon: Building,
      path: '/settings/departments'
    }
  ];

  const adminItems = [
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
      title: 'Integrations',
      icon: LinkIcon,
      path: '/admin/integrations',
      permission: 'manage_settings' as const
    },
    {
      title: 'Voice',
      icon: Phone,
      path: '/admin/voice',
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
              const itemIsActive = isActive(item.path);
              
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
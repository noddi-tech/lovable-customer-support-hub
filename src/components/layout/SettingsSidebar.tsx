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
  Settings,
  Shield,
  Bell,
  Home
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';

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

  // Show admin portal link if user has admin permissions
  const showAdminLink = hasPermission('manage_users') || hasPermission('manage_settings') || isSuperAdmin;

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

        {showAdminLink && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild
                  isActive={location.pathname.startsWith('/admin') || location.pathname.startsWith('/super-admin')}
                >
                  <button
                    onClick={() => navigate('/admin')}
                    className={cn(
                      "w-full justify-start gap-2",
                      (location.pathname.startsWith('/admin') || location.pathname.startsWith('/super-admin')) && 
                        "bg-sidebar-accent text-sidebar-accent-foreground"
                    )}
                  >
                    <Shield className="h-4 w-4" />
                    Admin Portal
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

import { useEffect, useState } from 'react';
import { useLocation, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { SidebarCounter } from '@/components/ui/sidebar-counter';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { useOptimizedCounts } from '@/hooks/useOptimizedCounts';
import { useDateFormatting } from '@/hooks/useDateFormatting';
import { getGroupedNavItems, logNavMatch } from '@/navigation/nav-config';
import { cn } from '@/lib/utils';
import { Crown, ChevronRight, ChevronLeft, LogOut, Settings, Palette, Home, UserCircle, User, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AgentAvailabilityPanel } from './AgentAvailabilityPanel';

import { MyAccountDialog } from './MyAccountDialog';
import { PreferencesDialog } from './PreferencesDialog';


export const AppMainNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { state, toggleSidebar, isMobile, setOpenMobile, setOpen } = useSidebar();
  const { isAdmin: checkIsAdmin, isLoading: permissionsLoading } = usePermissions();
  const { user, profile, signOut, isSuperAdmin } = useAuth();
  const { notifications: unreadNotifications } = useOptimizedCounts();
  const { dateTime, timezone } = useDateFormatting();
  const [accountOpen, setAccountOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  
  const isCollapsed = state === 'collapsed' && !isMobile;
  const isAdmin = checkIsAdmin();
  const groupedItems = getGroupedNavItems(isAdmin, isSuperAdmin);
  
  // Log nav matches in dev mode
  useEffect(() => {
    logNavMatch(location.pathname);
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (path === '/interactions/text') {
      return location.pathname === '/interactions/text' || location.pathname.startsWith('/interactions/text/');
    }
    if (path === '/interactions/voice') {
      return location.pathname === '/interactions/voice' || location.pathname.startsWith('/interactions/voice/');
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const getNavClassName = (isItemActive: boolean) => 
    cn(isItemActive ? "bg-muted text-primary font-medium" : "hover:bg-muted/50");

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    } else {
      setOpen(false);
    }
  };

  const groupLabels: Record<string, string> = {
    notifications: t('navigation.notifications', 'Notifications'),
    support: t('navigation.support', 'Support'),
    interactions: t('navigation.interactions', 'Interactions'),
    marketing: t('navigation.marketing', 'Marketing'), 
    operations: t('navigation.operations', 'Operations'),
    settings: t('navigation.settings', 'Settings'),
    admin: t('navigation.admin', 'Admin'),
    super_admin: t('navigation.superAdmin', 'Super Admin')
  };

  const groupOrder = ['notifications', 'support', 'interactions', 'marketing', 'operations', 'settings', 'admin', 'super_admin'];

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (permissionsLoading) {
    return (
      <Sidebar collapsible="offcanvas">
        <SidebarContent>
          <div className="p-4 text-sm text-muted-foreground">Loading...</div>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-2 py-3 space-y-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Home">
              <NavLink to="/home" onClick={handleNavClick} className="hover:bg-muted/50">
                <Home className="mr-2 h-4 w-4" />
                {!isCollapsed && <span className="font-semibold">Home</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {!isCollapsed && (
          <h2 className="px-2 text-lg font-semibold text-foreground">
            Customer Platform
          </h2>
        )}

      </SidebarHeader>

      <SidebarContent>
        {groupOrder.map(groupKey => {
          const items = groupedItems[groupKey as keyof typeof groupedItems];
          if (!items || items.length === 0) return null;
          if (groupKey === 'admin' && !isAdmin) return null;
          if (groupKey === 'super_admin' && !isSuperAdmin) return null;

          return (
            <SidebarGroup key={groupKey}>
              {groupKey !== 'notifications' && (
                <SidebarGroupLabel className={cn(
                  groupKey === 'super_admin' && "text-yellow-600 dark:text-yellow-500 font-semibold"
                )}>
                  {groupKey === 'super_admin' && <Crown className="inline h-4 w-4 mr-1" />}
                  {groupLabels[groupKey as keyof typeof groupLabels]}
                </SidebarGroupLabel>
              )}
              
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => {
                    const Icon = item.icon;
                    const itemIsActive = isActive(item.to);
                    const showBadge = item.showBadge && item.id === 'notifications' && unreadNotifications > 0;
                    
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton asChild tooltip={item.label}>
                          <NavLink 
                            to={item.to} 
                            end={item.to === '/'}
                            onClick={handleNavClick}
                            className={cn(
                              getNavClassName(itemIsActive),
                              groupKey === 'super_admin' && itemIsActive && "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 font-medium"
                            )}
                            {...(itemIsActive && { "aria-current": "page" })}
                          >
                            <Icon className={cn("mr-2 h-4 w-4", showBadge && "text-destructive")} />
                            {!isCollapsed && (
                              <span className="flex-1 flex items-center justify-between">
                                <span>{item.label}</span>
                                {showBadge && (
                                  <SidebarCounter count={unreadNotifications} variant="unread" />
                                )}
                              </span>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="mt-auto border-t border-sidebar-border py-2 space-y-1">
        {/* Chat / phone availability */}
        <AgentAvailabilityPanel collapsed={isCollapsed} />

        {/* Timezone row */}
        {!isCollapsed && (
          <div className="flex items-center justify-end px-3 py-1">
            <span className="text-[11px] text-muted-foreground truncate">
              {timezone} · {dateTime(new Date()).split(' ')[1] || ''}
            </span>
          </div>
        )}

        {/* User profile + dropdown */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "flex items-center gap-2 w-full rounded-md px-3 py-2 hover:bg-muted/50 transition-colors text-left",
              isCollapsed && "justify-center px-0"
            )}>
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={profile?.avatar_url || user?.user_metadata?.avatar_url} />
                <AvatarFallback className="text-xs">
                  {profile?.full_name?.[0] || user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight truncate">
                    {profile?.full_name || user?.user_metadata?.full_name || 'User'}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <div className="flex flex-col space-y-1 p-2">
              <p className="text-sm font-medium leading-none">
                {profile?.full_name || user?.user_metadata?.full_name || 'User'}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user?.email}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setTimeout(() => setAccountOpen(true), 0)}>
              <UserCircle className="mr-2 h-4 w-4" />
              <span>{t('header.myAccount', 'My account')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings/profile')}>
              <User className="mr-2 h-4 w-4" />
              <span>{t('header.profile', 'Profile')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings/notifications')}>
              <Bell className="mr-2 h-4 w-4" />
              <span>{t('header.notificationSettings', 'Notification settings')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setTimeout(() => setPreferencesOpen(true), 0)}>
              <Settings className="mr-2 h-4 w-4" />
              <span>{t('header.settings', 'Settings')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/admin/design-library')}>
              <Palette className="mr-2 h-4 w-4" />
              <span>{t('header.designLibrary', 'Design Library')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>{t('header.signOut', 'Sign out')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <MyAccountDialog open={accountOpen} onOpenChange={setAccountOpen} />
        <PreferencesDialog open={preferencesOpen} onOpenChange={setPreferencesOpen} />



        {/* Collapse toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-2"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};

import { useEffect } from 'react';
import { useLocation, NavLink } from 'react-router-dom';
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
import { getGroupedNavItems, logNavMatch } from '@/navigation/nav-config';
import { cn } from '@/lib/utils';
import { Crown, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AgentAvailabilityPanel } from './AgentAvailabilityPanel';

export const AppMainNav = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const { state, toggleSidebar } = useSidebar();
  const { isAdmin: checkIsAdmin, isLoading: permissionsLoading } = usePermissions();
  const { isSuperAdmin } = useAuth();
  const { notifications: unreadNotifications } = useOptimizedCounts();
  
  const isCollapsed = state === 'collapsed';
  const isAdmin = checkIsAdmin();
  const groupedItems = getGroupedNavItems(isAdmin, isSuperAdmin);
  
  // Log nav matches in dev mode
  useEffect(() => {
    logNavMatch(location.pathname);
  }, [location.pathname]);

  const isActive = (path: string) => {
    // Handle hierarchical paths correctly
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

  const groupLabels: Record<string, string> = {
    notifications: t('navigation.notifications', 'Notifications'),
    interactions: t('navigation.interactions', 'Interactions'),
    marketing: t('navigation.marketing', 'Marketing'), 
    operations: t('navigation.operations', 'Operations'),
    settings: t('navigation.settings', 'Settings'),
    admin: t('navigation.admin', 'Admin'),
    super_admin: t('navigation.superAdmin', 'Super Admin')
  };

  const groupOrder = ['notifications', 'interactions', 'marketing', 'operations', 'settings', 'admin', 'super_admin'];

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
      <SidebarHeader className="p-4 space-y-3">
        <h2 className={cn(
          "text-lg font-semibold text-foreground",
          isCollapsed && "sr-only"
        )}>
          Customer Platform
        </h2>
        
        {/* Agent Availability Toggle - at the top for prominence */}
        <AgentAvailabilityPanel collapsed={isCollapsed} />
      </SidebarHeader>

      <SidebarContent>
        {groupOrder.map(groupKey => {
          const items = groupedItems[groupKey as keyof typeof groupedItems];
          if (!items || items.length === 0) return null;
          
          // Don't show admin group if user is not admin
          if (groupKey === 'admin' && !isAdmin) return null;
          // Don't show super admin group if user is not super admin
          if (groupKey === 'super_admin' && !isSuperAdmin) return null;

          return (
            <SidebarGroup key={groupKey}>
              {/* Hide label for notifications group */}
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
                        <SidebarMenuButton asChild>
                          <NavLink 
                            to={item.to} 
                            end={item.to === '/'}
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

      <SidebarFooter className="mt-auto border-t border-sidebar-border py-2">
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
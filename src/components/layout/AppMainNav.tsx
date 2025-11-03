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
  useSidebar,
} from '@/components/ui/sidebar';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { getGroupedNavItems, logNavMatch } from '@/navigation/nav-config';
import { cn } from '@/lib/utils';
import { Crown } from 'lucide-react';

export const AppMainNav = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const { state } = useSidebar();
  const { isAdmin: checkIsAdmin, isLoading: permissionsLoading } = usePermissions();
  const { isSuperAdmin } = useAuth();
  
  const isCollapsed = state === 'collapsed';
  const isAdmin = checkIsAdmin();
  const groupedItems = getGroupedNavItems(isAdmin, isSuperAdmin);
  
  // Log nav matches in dev mode
  useEffect(() => {
    logNavMatch(location.pathname);
  }, [location.pathname]);

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const getNavClassName = (isItemActive: boolean) => 
    cn(isItemActive ? "bg-muted text-primary font-medium" : "hover:bg-muted/50");

  const groupLabels = {
    interactions: t('navigation.interactions', 'Interactions'),
    marketing: t('navigation.marketing', 'Marketing'), 
    operations: t('navigation.operations', 'Operations'),
    settings: t('navigation.settings', 'Settings'),
    admin: t('navigation.admin', 'Admin'),
    super_admin: t('navigation.superAdmin', 'Super Admin')
  };

  const groupOrder = ['interactions', 'marketing', 'operations', 'settings', 'admin', 'super_admin'];

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
      <SidebarHeader className="p-4">
        <h2 className={cn(
          "text-lg font-semibold text-foreground",
          isCollapsed && "sr-only"
        )}>
          Customer Platform
        </h2>
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
              <SidebarGroupLabel className={cn(
                groupKey === 'super_admin' && "text-yellow-600 dark:text-yellow-500 font-semibold"
              )}>
                {groupKey === 'super_admin' && <Crown className="inline h-4 w-4 mr-1" />}
                {groupLabels[groupKey as keyof typeof groupLabels]}
              </SidebarGroupLabel>
              
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => {
                    const Icon = item.icon;
                    const itemIsActive = isActive(item.to);
                    
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
                            <Icon className="mr-2 h-4 w-4" />
                            {!isCollapsed && <span>{item.label}</span>}
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
    </Sidebar>
  );
};
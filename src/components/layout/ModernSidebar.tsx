import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  MessageCircle,
  Phone,
  Mail,
  MessageSquare,
  Megaphone,
  Users,
  Settings,
  Wrench,
  LifeBuoy,
  DoorOpen,
  Plus,
  Filter,
  Archive,
  Clock,
  CheckCircle,
  Circle,
  Zap,
  Bell,
  User,
  Crown,
  BarChart3,
  Building2,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface ModernSidebarProps {}

export const ModernSidebar: React.FC<ModernSidebarProps> = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const sidebar = useSidebar();
  const { isSuperAdmin } = useAuth();

  // Main navigation items
  const mainNavItems = [
    {
      id: 'interactions',
      title: t('nav.interactions', 'Interactions'),
      icon: MessageCircle,
      items: [
        { id: 'text', title: t('nav.messages', 'Messages'), icon: MessageSquare, badge: 12 },
        { id: 'voice', title: t('nav.calls', 'Voice Calls'), icon: Phone, badge: 3 }
      ]
    },
    {
      id: 'marketing',
      title: t('nav.marketing', 'Marketing'),
      icon: Megaphone,
      items: [
        { id: 'newsletters', title: t('nav.newsletters', 'Newsletters'), icon: Mail },
        { id: 'campaigns', title: t('nav.campaigns', 'Campaigns'), icon: Zap }
      ]
    },
    {
      id: 'ops',
      title: t('nav.operations', 'Operations'),
      icon: Wrench,
      items: [
        { id: 'tickets', title: t('nav.tickets', 'Tickets'), icon: LifeBuoy, badge: 7 },
        { id: 'doorman', title: t('nav.doorman', 'Doorman'), icon: DoorOpen },
        { id: 'recruitment', title: t('nav.recruitment', 'Recruitment'), icon: Users }
      ]
    }
  ];

  // Quick filters for interactions
  const quickFilters = [
    { id: 'all', title: t('filters.all', 'All'), icon: Circle, count: 156 },
    { id: 'unread', title: t('filters.unread', 'Unread'), icon: Circle, count: 23 },
    { id: 'assigned', title: t('filters.assigned', 'Assigned'), icon: User, count: 45 },
    { id: 'pending', title: t('filters.pending', 'Pending'), icon: Clock, count: 12 },
    { id: 'closed', title: t('filters.closed', 'Closed'), icon: CheckCircle, count: 89 },
    { id: 'archived', title: t('filters.archived', 'Archived'), icon: Archive, count: 234 }
  ];

  const isItemActive = (mainId: string, subId?: string) => {
    if (subId) {
      return location.pathname.includes(`/${mainId}`) && location.pathname.includes(`/${subId}`);
    }
    return location.pathname.includes(`/${mainId}`);
  };

  return (
    <Sidebar className="border-0 bg-transparent h-full">
      <SidebarHeader className="border-b border-border p-4">
        <Button className="w-full justify-start gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          <span className="ml-2">{t('sidebar.newConversation', 'New Conversation')}</span>
        </Button>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3">
            {t('sidebar.workspace', 'Workspace')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  {/* Main Item */}
                  <SidebarMenuButton
                    className={cn(
                      "w-full justify-between group",
                      isItemActive(item.id) && "bg-primary text-primary-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </div>
                  </SidebarMenuButton>
                  
                  {/* Sub Items */}
                  {item.items && (
                    <SidebarMenu className="ml-4 mt-1">
                      {item.items.map((subItem) => (
                        <SidebarMenuItem key={`${item.id}-${subItem.id}`}>
                        <SidebarMenuButton
                          onClick={() => navigate(`/${item.id}/${subItem.id}`)}
                          className={cn(
                            "w-full justify-between text-sm",
                            isItemActive(item.id, subItem.id) && "bg-accent font-medium"
                          )}
                        >
                            <div className="flex items-center gap-2">
                              <subItem.icon className="h-3 w-3" />
                              <span>{subItem.title}</span>
                            </div>
                            {subItem.badge && subItem.badge > 0 && (
                              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                                {subItem.badge > 99 ? '99+' : subItem.badge}
                              </Badge>
                            )}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator className="mx-3" />

        {/* Quick Filters - Only for Interactions */}
        {location.pathname.includes('/interactions') && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 flex items-center justify-between">
              {t('sidebar.filters', 'Filters')}
              <Button variant="ghost" size="icon" className="h-4 w-4 opacity-60 hover:opacity-100">
                <Filter className="h-3 w-3" />
              </Button>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {quickFilters.map((filter) => (
                  <SidebarMenuItem key={filter.id}>
                    <SidebarMenuButton className="w-full justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <filter.icon className="h-3 w-3" />
                        <span>{filter.title}</span>
                      </div>
                      <Badge variant="outline" className="h-4 px-1 text-xs">
                        {filter.count}
                      </Badge>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-3">
        <SidebarMenu>
          {isSuperAdmin && (
            <>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate('/super-admin/dashboard')}
                  className={cn(
                    "w-full justify-start",
                    location.pathname.includes('/super-admin') && "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500"
                  )}
                >
                  <Crown className="h-4 w-4" />
                  <span className="ml-2 font-semibold">{t('nav.superAdmin', 'Super Admin')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {location.pathname.includes('/super-admin') && (
                <SidebarMenu className="ml-4 mt-1">
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => navigate('/super-admin/dashboard')}
                      className={cn(
                        "w-full justify-start text-sm",
                        location.pathname === '/super-admin/dashboard' && "bg-accent font-medium"
                      )}
                    >
                      <BarChart3 className="h-3 w-3" />
                      <span>{t('nav.dashboard', 'Dashboard')}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => navigate('/super-admin/organizations')}
                      className={cn(
                        "w-full justify-start text-sm",
                        location.pathname === '/super-admin/organizations' && "bg-accent font-medium"
                      )}
                    >
                      <Building2 className="h-3 w-3" />
                      <span>{t('nav.organizations', 'Organizations')}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => navigate('/super-admin/users')}
                      className={cn(
                        "w-full justify-start text-sm",
                        location.pathname === '/super-admin/users' && "bg-accent font-medium"
                      )}
                    >
                      <Users className="h-3 w-3" />
                      <span>{t('nav.allUsers', 'All Users')}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => navigate('/super-admin/roles')}
                      className={cn(
                        "w-full justify-start text-sm",
                        location.pathname === '/super-admin/roles' && "bg-accent font-medium"
                      )}
                    >
                      <Shield className="h-3 w-3" />
                      <span>{t('nav.roleManagement', 'Role Management')}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => navigate('/super-admin/analytics')}
                      className={cn(
                        "w-full justify-start text-sm",
                        location.pathname === '/super-admin/analytics' && "bg-accent font-medium"
                      )}
                    >
                      <BarChart3 className="h-3 w-3" />
                      <span>{t('nav.analytics', 'Analytics')}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              )}
              <Separator className="my-2" />
            </>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => navigate('/settings')}
              className="w-full justify-start"
            >
              <Settings className="h-4 w-4" />
              <span className="ml-2">{t('nav.settings', 'Settings')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};
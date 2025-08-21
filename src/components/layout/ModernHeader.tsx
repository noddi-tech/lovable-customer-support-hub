import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDateFormatting } from '@/hooks/useDateFormatting';
import { useIsMobile } from '@/hooks/use-responsive';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { SyncButton } from '@/components/dashboard/SyncButton';
import { 
  Search,
  User,
  LogOut,
  Settings,
  Palette,
  Menu,
  Bell,
  MessageCircle,
  Phone,
  Users,
  Clock,
  Home,
  Mail,
  Send,
  Headphones,
  Ticket,
  ShieldCheck,
  UserPlus
} from 'lucide-react';
import { 
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from '@/components/ui/menubar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';

interface ModernHeaderProps {
  activeTab: string;
  activeSubTab: string;
  onTabChange: (tab: string, subTab: string) => void;
  onSidebarToggle?: () => void;
  showSidebarToggle?: boolean;
}

export const ModernHeader: React.FC<ModernHeaderProps> = ({
  activeTab,
  activeSubTab,
  onTabChange,
  onSidebarToggle,
  showSidebarToggle = false
}) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { dateTime, timezone } = useDateFormatting();
  const isMobile = useIsMobile();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Navigation structure
  const mainTabs = [
    {
      id: 'interactions',
      title: t('header.interactions', 'Interactions'),
      icon: MessageCircle,
      items: [
        { id: 'text', title: t('header.messages', 'Messages'), icon: Mail },
        { id: 'voice', title: t('header.calls', 'Calls'), icon: Phone },
      ]
    },
    {
      id: 'marketing',
      title: t('header.marketing', 'Marketing'),
      icon: Send,
      items: [
        { id: 'newsletters', title: t('header.newsletters', 'Newsletters'), icon: Mail },
      ]
    },
    {
      id: 'operations',
      title: t('header.operations', 'Operations'),
      icon: Users,
      items: [
        { id: 'tickets', title: t('header.tickets', 'Tickets'), icon: Ticket },
        { id: 'doorman', title: t('header.doorman', 'Doorman'), icon: ShieldCheck },
        { id: 'recruitment', title: t('header.recruitment', 'Recruitment'), icon: UserPlus },
      ]
    },
    {
      id: 'settings',
      title: t('header.settings', 'Settings'),
      icon: Settings,
      items: [
        { id: 'general', title: t('header.general', 'General'), icon: Settings },
        { id: 'language', title: t('header.language', 'Language'), icon: Settings },
        { id: 'timezone', title: t('header.timezone', 'Timezone'), icon: Clock },
        { id: 'profile', title: t('header.profile', 'Profile'), icon: User },
        { id: 'notifications', title: t('header.notifications', 'Notifications'), icon: Bell },
        { id: 'email-templates', title: t('header.emailTemplates', 'Email Templates'), icon: Mail },
        { id: 'users', title: t('header.userManagement', 'User Management'), icon: Users },
        { id: 'departments', title: t('header.departments', 'Departments'), icon: Users },
        { id: 'admin', title: t('header.adminPortal', 'Admin Portal'), icon: ShieldCheck },
        { id: 'integrations', title: t('header.integrations', 'Integrations'), icon: Settings },
        { id: 'aircall', title: t('header.aircall', 'Aircall Settings'), icon: Phone },
        { id: 'sendgrid', title: t('header.sendgrid', 'Sendgrid Setup'), icon: Mail },
        { id: 'google-groups', title: t('header.googleGroups', 'Google Groups'), icon: Users },
        { id: 'voice-integrations', title: t('header.voiceIntegrations', 'Voice Integrations'), icon: Headphones },
        { id: 'inbound-routes', title: t('header.inboundRoutes', 'Inbound Routes'), icon: Phone },
        { id: 'design-library', title: t('header.designLibrary', 'Design Library'), icon: Palette },
        { id: 'components', title: t('header.components', 'Components'), icon: Settings },
      ]
    }
  ];

  // Get current tab info
  const currentMainTab = mainTabs.find(tab => tab.id === activeTab);
  const currentSubTab = currentMainTab?.items.find(item => item.id === activeSubTab);

  return (
    <div className="flex flex-col">
      <header className="modern-header flex items-center justify-between h-16 px-4 bg-card border-b border-border shadow-sm z-50">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          {/* Sidebar Toggle - Mobile */}
          {showSidebarToggle && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onSidebarToggle}
              className="lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}

          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-sm">
              <MessageCircle className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-foreground leading-none">
                {isMobile ? 'CS Hub' : 'Customer Support Hub'}
              </span>
              {!isMobile && (
                <span className="text-xs text-muted-foreground">
                  Professional Support Platform
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center Section - Menubar Navigation */}
        {!isMobile && (
          <div className="flex-1 flex justify-center">
            <Menubar className="border-none bg-transparent">
              {mainTabs.map((tab) => {
                const TabIcon = tab.icon;
                const isActiveTab = activeTab === tab.id;
                
                return (
                  <MenubarMenu key={tab.id}>
                    <MenubarTrigger className={cn(
                      "cursor-pointer px-3 py-2 text-sm font-medium transition-colors",
                      isActiveTab 
                        ? "text-primary bg-primary/10" 
                        : "text-muted-foreground hover:text-foreground"
                    )}>
                      <TabIcon className="h-4 w-4 mr-2" />
                      {tab.title}
                    </MenubarTrigger>
                    <MenubarContent align="start" className="min-w-48">
                      {tab.items.map((item) => {
                        const ItemIcon = item.icon;
                        const isActiveSubTab = activeTab === tab.id && activeSubTab === item.id;
                        
                        return (
                          <MenubarItem
                            key={item.id}
                            className={cn(
                              "cursor-pointer",
                              isActiveSubTab && "bg-primary/10 text-primary"
                            )}
                            onClick={() => onTabChange(tab.id, item.id)}
                          >
                            <ItemIcon className="h-4 w-4 mr-2" />
                            {item.title}
                          </MenubarItem>
                        );
                      })}
                    </MenubarContent>
                  </MenubarMenu>
                );
              })}
            </Menubar>
          </div>
        )}

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Quick Actions - Desktop Only */}
          {!isMobile && (
            <div className="flex items-center gap-2 mr-2">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              
              <div className="flex items-center gap-1 px-3 py-1 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{timezone}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <SyncButton />
            <NotificationDropdown />
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" align="end" forceMount>
              <div className="flex flex-col space-y-1 p-3 border-b border-border">
                <p className="text-sm font-medium leading-none">
                  {user?.user_metadata?.full_name || 'User'}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
              <div className="p-1">
                <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
                  <Settings className="mr-3 h-4 w-4" />
                  <span>{t('header.settings', 'Settings')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/admin/design-library')} className="cursor-pointer">
                  <Palette className="mr-3 h-4 w-4" />
                  <span>{t('header.designLibrary', 'Design Library')}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-3 h-4 w-4" />
                  <span>{t('header.signOut', 'Sign out')}</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Breadcrumb Navigation */}
      <div className="flex items-center h-10 px-4 bg-muted/30 border-b border-border">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink 
                onClick={() => navigate('/')} 
                className="cursor-pointer flex items-center"
              >
                <Home className="h-3 w-3 mr-1" />
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            
            {currentMainTab && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink 
                    onClick={() => currentMainTab.items[0] && onTabChange(currentMainTab.id, currentMainTab.items[0].id)}
                    className="cursor-pointer flex items-center"
                  >
                    <currentMainTab.icon className="h-3 w-3 mr-1" />
                    {currentMainTab.title}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            )}
            
            {currentSubTab && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="flex items-center">
                    <currentSubTab.icon className="h-3 w-3 mr-1" />
                    {currentSubTab.title}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  );
};
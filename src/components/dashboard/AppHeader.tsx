import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDateFormatting } from '@/hooks/useDateFormatting';
import { useIsMobile } from '@/hooks/use-responsive';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { SyncButton } from './SyncButton';
import { DeleteAllButton } from './DeleteAllButton';
import { 
  MessageCircle, 
  Megaphone, 
  Wrench, 
  Settings,
  Search,
  User,
  LogOut,
  Palette,
  Menu,
  ArrowLeft,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppHeaderProps {
  activeTab: string;
  activeSubTab: string;
  onTabChange: (tab: string, subTab: string) => void;
  onMenuClick?: () => void;
  onBackClick?: () => void;
  showBackButton?: boolean;
  showMenuButton?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  activeTab,
  activeSubTab,
  onTabChange,
  onMenuClick,
  onBackClick,
  showBackButton = false,
  showMenuButton = false
}) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { dateTime, timezone } = useDateFormatting();
  const isMobile = useIsMobile();

  // Fetch unread conversations count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-conversations-count'],
    queryFn: async () => {  
      const { data, error } = await supabase
        .from('conversations')
        .select('id', { count: 'exact' })
        .eq('is_read', false)
        .neq('status', 'closed');
      if (error) throw error;
      return data?.length || 0;
    },
    refetchInterval: 30000,
  });

  const mainTabs = [
    {
      id: 'interactions',
      label: t('header.interactions', 'Interactions'),
      icon: MessageCircle,
      subTabs: [
        { id: 'text', label: t('header.text', 'Text') },
        { id: 'voice', label: t('header.voice', 'Voice') }
      ]
    },
    {
      id: 'marketing',
      label: t('header.marketing', 'Marketing'),
      icon: Megaphone,
      subTabs: [
        { id: 'newsletters', label: t('header.newsletters', 'Newsletters') },
        { id: 'campaigns', label: t('header.campaigns', 'Campaigns') }
      ]
    },
    {
      id: 'ops',
      label: t('header.operations', 'Operations'),
      icon: Wrench,
      subTabs: [
        { id: 'tickets', label: t('header.tickets', 'Tickets') },
        { id: 'doorman', label: t('header.doorman', 'Doorman') },
        { id: 'recruitment', label: t('header.recruitment', 'Recruitment') }
      ]
    },
    {
      id: 'settings',
      label: t('header.settings', 'Settings'),
      icon: Settings,
      subTabs: [
        { id: 'general', label: t('settings.general', 'General') },
        { id: 'profile', label: t('settings.profile', 'Profile') },
        { id: 'notifications', label: t('settings.notifications', 'Notifications') },
        { id: 'email-templates', label: t('settings.emailTemplates', 'Email Templates') },
        { id: 'departments', label: t('settings.departments', 'Departments') },
        { id: 'users', label: t('settings.users', 'Users') },
        { id: 'admin', label: t('settings.admin', 'Admin') }
      ]
    }
  ];

  const activeMainTab = mainTabs.find(tab => tab.id === activeTab);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="app-header-container bg-card/80 backdrop-blur-sm border-b border-border shadow-sm">
      {/* Main Header */}
      <header className="flex items-center justify-between px-4 py-3">
        {/* Left Section - Logo, Navigation */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Mobile Menu/Back Button */}
          {isMobile && (showMenuButton || showBackButton) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={showBackButton ? onBackClick : onMenuClick}
              className="flex-shrink-0"
            >
              {showBackButton ? (
                <ArrowLeft className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </Button>
          )}

          {/* Logo/Brand */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">CS</span>
            </div>
            {!isMobile && (
              <span className="font-semibold text-lg">Customer Support</span>
            )}
          </div>

          {/* Main Navigation - Desktop */}
          {!isMobile && (
            <nav className="flex items-center gap-1">
              {mainTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <Button
                    key={tab.id}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    onClick={() => onTabChange(tab.id, tab.subTabs[0]?.id || '')}
                    className={cn(
                      "flex items-center gap-2",
                      isActive && "bg-primary text-primary-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                    {tab.id === 'interactions' && unreadCount > 0 && (
                      <Badge variant="destructive" className="h-4 px-1 text-xs ml-1">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Badge>
                    )}
                  </Button>
                );
              })}
            </nav>
          )}

          {/* Current Tab/Sub-tab Display - Mobile */}
          {isMobile && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-semibold text-sm truncate">
                {activeMainTab?.label}
              </span>
              {activeMainTab?.subTabs.length > 0 && (
                <span className="text-xs text-muted-foreground truncate">
                  {activeMainTab.subTabs.find(st => st.id === activeSubTab)?.label}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right Section - Actions, User Menu */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Timezone Display - Desktop only */}
          {!isMobile && (
            <div className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
              {timezone} • {dateTime(new Date()).split(' ')[1] || 'Now'}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <SyncButton />
            <DeleteAllButton />
            
            <Button variant="ghost" size="sm" className="hidden sm:flex">
              <Search className="h-4 w-4" />
            </Button>
            
            <NotificationDropdown />
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback>
                    {user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex flex-col space-y-1 p-2">
                <p className="text-sm font-medium leading-none">
                  {user?.user_metadata?.full_name || 'User'}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
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
        </div>
      </header>

      {/* Mobile Subtabs Dropdown - Only show when needed */}
      {isMobile && activeMainTab?.subTabs.length > 0 && (
        <div className="border-t border-border/50 bg-muted/30">
          <div className="px-4 py-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between">
                  {activeMainTab.subTabs.find(tab => tab.id === activeSubTab)?.label || 'Select Section'}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-full" align="start">
                {activeMainTab.subTabs.map((subTab) => (
                  <DropdownMenuItem
                    key={subTab.id}
                    onClick={() => onTabChange(activeTab, subTab.id)}
                    className={cn(
                      activeSubTab === subTab.id && "bg-accent"
                    )}
                  >
                    {subTab.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      {/* Desktop Subtabs Menubar - Only show when needed */}
      {!isMobile && activeMainTab?.subTabs.length > 0 && (
        <div className="px-4 py-2 bg-muted/20">
          <Menubar className="border-none bg-transparent h-8">
            <MenubarMenu>
              <MenubarTrigger className="data-[state=open]:bg-muted px-3 py-1 text-sm">
                {activeMainTab.subTabs.find(tab => tab.id === activeSubTab)?.label || 'Sections'}
              </MenubarTrigger>
              <MenubarContent>
                {activeMainTab.subTabs.map((subTab) => (
                  <MenubarItem
                    key={subTab.id}
                    onClick={() => onTabChange(activeTab, subTab.id)}
                    className={cn(
                      "cursor-pointer",
                      activeSubTab === subTab.id && "bg-accent font-medium"
                    )}
                  >
                    {subTab.label}
                  </MenubarItem>
                ))}
              </MenubarContent>
            </MenubarMenu>
          </Menubar>
        </div>
      )}
    </div>
  );
};
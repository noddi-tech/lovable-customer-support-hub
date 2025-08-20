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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
  ArrowLeft
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
      subTabs: []
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
    <header className="app-header flex items-center justify-between px-4 py-3 bg-card/80 backdrop-blur-sm border-b border-border shadow-sm">
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
                <div key={tab.id} className="relative">
                  <Button
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
                  
                  {/* Sub-tabs */}
                  {isActive && tab.subTabs.length > 0 && (
                    <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-md shadow-lg py-1 z-50 min-w-[120px]">
                      {tab.subTabs.map((subTab) => (
                        <button
                          key={subTab.id}
                          onClick={() => onTabChange(tab.id, subTab.id)}
                          className={cn(
                            "w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground",
                            activeSubTab === subTab.id && "bg-accent text-accent-foreground font-medium"
                          )}
                        >
                          {subTab.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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
  );
};
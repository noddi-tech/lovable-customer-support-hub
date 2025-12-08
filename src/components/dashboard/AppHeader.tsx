import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDateFormatting } from '@/hooks/useDateFormatting';
import { useIsMobile } from '@/hooks/use-responsive';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { SyncButton } from '@/components/dashboard/SyncButton';
import { ConnectionStatusIndicator } from '@/components/layout/ConnectionStatusIndicator';
import { OrganizationSwitcher } from '@/components/organization/OrganizationSwitcher';
import { useState } from 'react';
import { 
  Search,
  LogOut,
  Palette,
  Menu,
  ArrowLeft,
  Settings
} from 'lucide-react';

interface AppHeaderProps {
  onMenuClick?: () => void;
  onBackClick?: () => void;
  showBackButton?: boolean;
  showMenuButton?: boolean;
  sidebarTrigger?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onMenuClick,
  onBackClick,
  showBackButton = false,
  showMenuButton = false,
  sidebarTrigger
}) => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { dateTime, timezone } = useDateFormatting();
  const isMobile = useIsMobile();
  
  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Search handler
  const handleSearch = (query: string) => {
    if (!query.trim()) return;
    
    // Navigate to dashboard with search query
    navigate(`/?search=${encodeURIComponent(query)}`);
    setSearchOpen(false);
    setSearchQuery('');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="app-header-container bg-card/80 backdrop-blur-sm border-b border-border shadow-sm relative z-[200]">
      {/* Main Header */}
      <header className="flex items-center justify-between px-6 py-2.5">
        {/* Left Section - Logo, Navigation */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Mobile Menu/Back Button */}
          {isMobile && (
            <>
              {sidebarTrigger || (showMenuButton || showBackButton) && (
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
              {sidebarTrigger}
            </>
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

          {/* Organization Switcher - for super admins */}
          <OrganizationSwitcher />
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
          <div className="flex items-center gap-2">
            {/* Connection Status */}
            <ConnectionStatusIndicator />
            
            {/* Sync Button - Desktop only */}
            {!isMobile && <SyncButton />}

            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="hidden sm:flex">
                  <Search className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">
                    {t('dashboard.search.title', 'Search Conversations')}
                  </h4>
                  <Input
                    placeholder={t('dashboard.search.placeholder', 'Search by customer, subject, or content...')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch(searchQuery);
                      }
                    }}
                    autoFocus
                  />
                  <Button 
                    className="w-full" 
                    size="sm"
                    onClick={() => handleSearch(searchQuery)}
                    disabled={!searchQuery.trim()}
                  >
                    {t('dashboard.search.search', 'Search')}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            
            <NotificationDropdown />
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url || user?.user_metadata?.avatar_url} />
                  <AvatarFallback>
                    {profile?.full_name?.[0] || user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex flex-col space-y-1 p-2">
                <p className="text-sm font-medium leading-none">
                  {profile?.full_name || user?.user_metadata?.full_name || 'User'}
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

    </div>
  );
};
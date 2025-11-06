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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { SyncButton } from './SyncButton';
import { DeleteAllButton } from './DeleteAllButton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { 
  Search,
  User,
  LogOut,
  Palette,
  Menu,
  ArrowLeft,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const { user, signOut } = useAuth();
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
      <header className="flex items-center justify-between px-4 py-3">
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

    </div>
  );
};
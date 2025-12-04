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
  MessageCircle,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModernHeaderProps {
  onSidebarToggle?: () => void;
  showSidebarToggle?: boolean;
}

export const ModernHeader: React.FC<ModernHeaderProps> = ({
  onSidebarToggle,
  showSidebarToggle = false
}) => {
  const { user, profile, signOut } = useAuth();
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


  return (
    <div className="flex flex-col">
      <header className="modern-header flex items-center justify-between h-14 px-4 bg-muted border-b border-border shadow-sm z-50">
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
                  <AvatarImage src={profile?.avatar_url || user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {profile?.full_name?.[0] || user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" align="end" forceMount>
              <div className="flex flex-col space-y-1 p-3 border-b border-border">
                <p className="text-sm font-medium leading-none">
                  {profile?.full_name || user?.user_metadata?.full_name || 'User'}
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

    </div>
  );
};
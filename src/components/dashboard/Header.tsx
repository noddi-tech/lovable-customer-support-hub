import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, Search, Settings, LogOut, User, Menu, ArrowLeft, Palette } from 'lucide-react';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { SyncButton } from '@/components/dashboard/SyncButton';
import { DeleteAllButton } from '@/components/dashboard/DeleteAllButton';
import { useAuth } from '@/components/auth/AuthContext';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface HeaderProps {
  organizationName?: string;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  onBackClick?: () => void;
  selectedInboxId?: string;
  onInboxChange?: (id: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  organizationName = "Support Hub", 
  onMenuClick, 
  showMenuButton = false,
  onBackClick,
  selectedInboxId,
  onInboxChange
}) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Get unread conversation count for notifications
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-conversations'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_conversations');
      if (error) {
        console.error('Error fetching conversations for notifications:', error);
        return 0;
      }
      // Count unread conversations
      return data?.filter((conv: any) => !conv.is_read).length || 0;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch inboxes for header selector
  const { data: inboxes = [] } = useQuery({
    queryKey: ['inboxes'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_inboxes');
      if (error) throw error;
      return data as any[];
    },
  });

  return (
    <header className="h-16 bg-card/90 backdrop-blur-sm border-b border-border flex items-center justify-between px-4 md:px-6 shadow-surface">
      <div className="flex items-center space-x-2 md:space-x-4">
        {/* Mobile Menu/Back Button */}
        {showMenuButton && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBackClick || onMenuClick}
            className="md:hidden"
          >
            {onBackClick ? <ArrowLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        )}
        
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-glow">
            <span className="text-primary-foreground font-bold text-sm">CS</span>
          </div>
          <div className="hidden sm:block min-w-[180px]">
            <Select value={(typeof selectedInboxId === 'string' ? selectedInboxId : 'all') || 'all'} onValueChange={(v) => onInboxChange?.(v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Inboxes" />
              </SelectTrigger>
              <SelectContent className="z-[60]">
                <SelectItem value="all">All Inboxes</SelectItem>
                {inboxes.filter((i: any) => i.is_active).map((i: any) => (
                  <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2 md:space-x-4">
        {/* Sync Button */}
        <SyncButton />
        
        {/* Delete All Button */}
        <DeleteAllButton />

        {/* Search - Hidden on mobile */}
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hidden sm:flex">
          <Search className="h-4 w-4" />
        </Button>

        {/* Notifications */}
        <NotificationDropdown />

        {/* Settings - Hidden on mobile */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-muted-foreground hover:text-foreground hidden sm:flex"
          onClick={() => navigate('/settings')}
        >
          <Settings className="h-4 w-4" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder-avatar.jpg" alt="User" />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.email || 'User'}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  Support Agent
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/design-library')}>
              <Palette className="mr-2 h-4 w-4" />
              <span>Design Library</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
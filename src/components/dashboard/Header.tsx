import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, Search, Settings, LogOut, User } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import { Badge } from '@/components/ui/badge';

interface HeaderProps {
  organizationName?: string;
}

export const Header: React.FC<HeaderProps> = ({ organizationName = "Support Hub" }) => {
  const { user, signOut } = useAuth();

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">CS</span>
          </div>
          <div>
            <h1 className="font-semibold text-foreground">{organizationName}</h1>
            <p className="text-xs text-muted-foreground">Customer Support Hub</p>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Search */}
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
          <Search className="h-4 w-4" />
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground relative">
          <Bell className="h-4 w-4" />
          <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center">
            3
          </Badge>
        </Button>

        {/* Settings */}
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
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
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
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
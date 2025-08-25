import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare,
  Phone,
  Plus,
  Inbox,
  Archive
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const InteractionsSidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const interactionItems = [
    {
      title: 'Text Messages',
      icon: MessageSquare,
      path: '/',
      badge: '24'
    },
    {
      title: 'Voice Calls',
      icon: Phone,
      path: '/voice',
      badge: '5'
    }
  ];

  const quickFilters = [
    {
      title: 'Inbox',
      icon: Inbox,
      path: '/inbox'
    },
    {
      title: 'Archive',
      icon: Archive,
      path: '/archive'
    }
  ];

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Button className="w-full gap-2" onClick={() => navigate('/new-conversation')}>
          <Plus className="h-4 w-4" />
          New Conversation
        </Button>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Channels</SidebarGroupLabel>
          <SidebarMenu>
            {interactionItems.map((item) => {
              const Icon = item.icon;
              const itemIsActive = isActive(item.path);
              
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton 
                    asChild
                    isActive={itemIsActive}
                  >
                    <button
                      onClick={() => navigate(item.path)}
                      className={cn(
                        "w-full justify-between gap-2",
                        itemIsActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {item.title}
                      </div>
                      {item.badge && (
                        <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Quick Filters</SidebarGroupLabel>
          <SidebarMenu>
            {quickFilters.map((item) => {
              const Icon = item.icon;
              const itemIsActive = isActive(item.path);
              
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton 
                    asChild
                    isActive={itemIsActive}
                  >
                    <button
                      onClick={() => navigate(item.path)}
                      className={cn(
                        "w-full justify-start gap-2",
                        itemIsActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.title}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
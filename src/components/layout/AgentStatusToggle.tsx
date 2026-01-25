import React from 'react';
import { cn } from '@/lib/utils';
import { useAgentAvailability, type AvailabilityStatus } from '@/hooks/useAgentAvailability';
import { useOnlineAgents } from '@/hooks/useOnlineAgents';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Circle, ChevronDown, Loader2 } from 'lucide-react';

interface AgentStatusToggleProps {
  collapsed?: boolean;
  className?: string;
}

const statusConfig: Record<AvailabilityStatus, { label: string; color: string; bgColor: string }> = {
  online: { 
    label: 'Online for chat', 
    color: 'text-green-500', 
    bgColor: 'bg-green-500' 
  },
  away: { 
    label: 'Away', 
    color: 'text-yellow-500', 
    bgColor: 'bg-yellow-500' 
  },
  offline: { 
    label: 'Offline', 
    color: 'text-muted-foreground', 
    bgColor: 'bg-muted-foreground' 
  },
};

// Get initials from a name
const getInitials = (name: string): string => {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export const AgentStatusToggle: React.FC<AgentStatusToggleProps> = ({ 
  collapsed = false,
  className 
}) => {
  const { status, setStatus, isLoading, isUpdating } = useAgentAvailability();
  const { data: onlineAgents = [], isLoading: agentsLoading } = useOnlineAgents();
  
  const currentConfig = statusConfig[status];
  
  // Filter out current user and show only other online agents
  const otherAgents = onlineAgents.filter(a => a.chat_availability === 'online' || a.chat_availability === 'away');

  if (isLoading) {
    return (
      <div className={cn(collapsed ? "flex justify-center" : "px-2", className)}>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {!collapsed && <span className="text-sm">Loading...</span>}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(collapsed ? "flex justify-center" : "px-2", className)}>
      {/* Descriptive header - only when expanded */}
      {!collapsed && (
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 px-2">
          Chat Availability
        </p>
      )}
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "w-full justify-start gap-2",
              collapsed && "w-8 h-8 p-0 justify-center"
            )}
            disabled={isUpdating}
          >
            <div className="relative flex-shrink-0">
              <Circle className={cn("h-3 w-3 fill-current", currentConfig.color)} />
              {status === 'online' && (
                <span className="absolute inset-0 animate-ping">
                  <Circle className="h-3 w-3 fill-current text-green-500 opacity-50" />
                </span>
              )}
            </div>
            {!collapsed && (
              <>
                <span className="flex-1 text-left text-sm font-medium">
                  {currentConfig.label}
                </span>
                {isUpdating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                )}
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {(Object.entries(statusConfig) as [AvailabilityStatus, typeof currentConfig][]).map(
            ([statusKey, config]) => {
              const statusMessages: Record<AvailabilityStatus, { title: string; description: string }> = {
                online: {
                  title: 'You are now online for chat',
                  description: 'Visitors can start live chats with you'
                },
                away: {
                  title: 'Status set to Away',
                  description: 'You will still receive chat notifications'
                },
                offline: {
                  title: 'You are now offline',
                  description: 'Live chat is disabled for visitors'
                }
              };
              
              return (
                <DropdownMenuItem
                  key={statusKey}
                  onSelect={(e) => {
                    e.preventDefault();
                    setStatus(statusKey);
                    toast.success(statusMessages[statusKey].title, {
                      description: statusMessages[statusKey].description,
                    });
                  }}
                  className={cn(
                    "flex items-center gap-2 cursor-pointer",
                    status === statusKey && "bg-muted"
                  )}
                >
                  <Circle className={cn("h-3 w-3 fill-current", config.color)} />
                  <span>{config.label}</span>
                </DropdownMenuItem>
              );
            }
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Show specific online agents instead of just count */}
      {!collapsed && otherAgents.length > 0 && (
        <div className="mt-2 px-2">
          <p className="text-xs text-muted-foreground mb-1.5">Online now:</p>
          <div className="flex flex-wrap gap-1.5">
            {otherAgents.slice(0, 3).map(agent => (
              <div 
                key={agent.id} 
                className="flex items-center gap-1.5 px-1.5 py-0.5 bg-muted/50 rounded-md"
                title={agent.full_name}
              >
                <Avatar className="h-5 w-5">
                  {agent.avatar_url && (
                    <AvatarImage src={agent.avatar_url} alt={agent.full_name} />
                  )}
                  <AvatarFallback className="text-[9px] bg-primary/10">
                    {getInitials(agent.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-foreground truncate max-w-[60px]">
                  {agent.full_name.split(' ')[0]}
                </span>
                <Circle className={cn(
                  "h-1.5 w-1.5 fill-current shrink-0",
                  agent.chat_availability === 'online' ? 'text-green-500' : 'text-yellow-500'
                )} />
              </div>
            ))}
            {otherAgents.length > 3 && (
              <div className="flex items-center px-1.5 py-0.5 bg-muted/50 rounded-md">
                <span className="text-xs text-muted-foreground">
                  +{otherAgents.length - 3} more
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Empty state when no other agents online */}
      {!collapsed && otherAgents.length === 0 && !agentsLoading && (
        <p className="text-xs text-muted-foreground mt-1 px-2">
          No other agents online
        </p>
      )}
    </div>
  );
};

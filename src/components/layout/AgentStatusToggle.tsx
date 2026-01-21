import React from 'react';
import { cn } from '@/lib/utils';
import { useAgentAvailability, type AvailabilityStatus } from '@/hooks/useAgentAvailability';
import { Button } from '@/components/ui/button';
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

export const AgentStatusToggle: React.FC<AgentStatusToggleProps> = ({ 
  collapsed = false,
  className 
}) => {
  const { status, setStatus, isLoading, onlineAgentCount, isUpdating } = useAgentAvailability();
  
  const currentConfig = statusConfig[status];
  const otherOnlineAgents = Math.max(0, onlineAgentCount - (status === 'online' ? 1 : 0));

  if (isLoading) {
    return (
      <div className={cn("p-2", className)}>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {!collapsed && <span className="text-sm">Loading...</span>}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("px-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "w-full justify-start gap-2",
              collapsed && "justify-center px-0"
            )}
            disabled={isUpdating}
          >
            <div className="relative">
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
            ([statusKey, config]) => (
              <DropdownMenuItem
                key={statusKey}
                onClick={() => setStatus(statusKey)}
                className={cn(
                  "flex items-center gap-2 cursor-pointer",
                  status === statusKey && "bg-muted"
                )}
              >
                <Circle className={cn("h-3 w-3 fill-current", config.color)} />
                <span>{config.label}</span>
              </DropdownMenuItem>
            )
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {!collapsed && otherOnlineAgents > 0 && (
        <p className="text-xs text-muted-foreground mt-1 px-2">
          {otherOnlineAgents} other agent{otherOnlineAgents !== 1 ? 's' : ''} online
        </p>
      )}
    </div>
  );
};

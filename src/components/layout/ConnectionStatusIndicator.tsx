import React from 'react';
import { useRealtimeConnection } from '@/contexts/RealtimeProvider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Wifi, WifiOff } from 'lucide-react';

export const ConnectionStatusIndicator: React.FC = () => {
  const { isConnected } = useRealtimeConnection();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent/50 cursor-default transition-colors">
          <div className="relative">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-destructive" />
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive animate-pulse" />
              </>
            )}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {isConnected ? (
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Live updates active
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
            Reconnecting...
          </span>
        )}
      </TooltipContent>
    </Tooltip>
  );
};

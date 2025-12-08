import React from 'react';
import { useRealtimeConnection } from '@/contexts/RealtimeProvider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

export const ConnectionStatusIndicator: React.FC = () => {
  const { connectionStatus } = useRealtimeConnection();

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'connecting':
        return <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />;
      case 'disconnected':
        return (
          <div className="relative">
            <WifiOff className="h-4 w-4 text-yellow-500" />
          </div>
        );
      case 'error':
        return (
          <div className="relative">
            <WifiOff className="h-4 w-4 text-destructive" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive animate-pulse" />
          </div>
        );
      default:
        return <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Live updates active
          </span>
        );
      case 'connecting':
        return (
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse" />
            Connecting...
          </span>
        );
      case 'disconnected':
        return (
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
            Reconnecting...
          </span>
        );
      case 'error':
        return (
          <span className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
              Connection failed
            </span>
            <span className="text-muted-foreground text-[10px]">Using polling (30s refresh)</span>
          </span>
        );
      default:
        return 'Unknown status';
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent/50 cursor-default transition-colors">
          {getStatusIcon()}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {getStatusText()}
      </TooltipContent>
    </Tooltip>
  );
};

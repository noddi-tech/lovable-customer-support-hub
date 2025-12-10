import React from 'react';
import { useRealtimeConnection } from '@/contexts/RealtimeProvider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Wifi, WifiOff, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const ConnectionStatusIndicator: React.FC = () => {
  const { connectionStatus, forceReconnect } = useRealtimeConnection();

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'connecting':
        return <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />;
      case 'disconnected':
        return (
          <div className="relative cursor-pointer" onClick={forceReconnect}>
            <WifiOff className="h-4 w-4 text-yellow-500" />
          </div>
        );
      case 'error':
        return (
          <div className="relative cursor-pointer" onClick={forceReconnect}>
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
            Connecting to live updates...
          </span>
        );
      case 'disconnected':
        return (
          <span className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
              Reconnecting...
            </span>
            <span className="text-muted-foreground text-[10px]">
              Emails still arrive normally via webhook.
            </span>
            <Button 
              variant="link" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                forceReconnect();
              }}
              className="text-xs h-auto p-0 text-primary justify-start"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry now
            </Button>
          </span>
        );
      case 'error':
        return (
          <span className="flex flex-col gap-1">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
              Real-time unavailable
            </span>
            <span className="text-muted-foreground text-[10px]">
              Emails arrive normally. Using 10s backup refresh.
            </span>
            <Button 
              variant="link" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                forceReconnect();
              }}
              className="text-xs h-auto p-0 text-primary justify-start"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry now
            </Button>
          </span>
        );
      default:
        return 'Unknown status';
    }
  };

  const isClickable = connectionStatus === 'disconnected' || connectionStatus === 'error';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          className={`flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent/50 transition-colors ${
            isClickable ? 'cursor-pointer' : 'cursor-default'
          }`}
          onClick={isClickable ? forceReconnect : undefined}
        >
          {getStatusIcon()}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs max-w-[200px]">
        {getStatusText()}
      </TooltipContent>
    </Tooltip>
  );
};

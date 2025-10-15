import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface LiveDataIndicatorProps {
  isLive: boolean;
  lastUpdated?: Date;
  onRefresh?: () => void;
  className?: string;
}

export const LiveDataIndicator: React.FC<LiveDataIndicatorProps> = ({
  isLive,
  lastUpdated,
  onRefresh,
  className,
}) => {
  const getTimeAgo = () => {
    if (!lastUpdated) return 'Never';
    return formatDistanceToNow(lastUpdated, { addSuffix: true });
  };

  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-2', className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant={isLive ? 'default' : 'secondary'}
              className={cn(
                'h-6 px-2 text-xs gap-1.5',
                isLive && 'bg-success hover:bg-success/90'
              )}
            >
              {isLive ? (
                <>
                  <Wifi className="h-3 w-3" />
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </span>
                  Live
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  Offline
                </>
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              {isLive
                ? 'Real-time updates active'
                : 'Real-time updates disconnected'}
            </p>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground mt-1">
                Last updated: {getTimeAgo()}
              </p>
            )}
          </TooltipContent>
        </Tooltip>

        {onRefresh && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                className="h-6 w-6 p-0"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Refresh data</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};

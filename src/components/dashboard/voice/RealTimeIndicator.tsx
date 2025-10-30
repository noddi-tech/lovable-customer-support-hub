import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeConnectionManager } from '@/hooks/useRealtimeConnectionManager';
import { logger } from '@/utils/logger';

interface RealTimeIndicatorProps {
  onRefresh?: () => void;
}

export const RealTimeIndicator: React.FC<RealTimeIndicatorProps> = ({ onRefresh }) => {
  const { toast } = useToast();
  const { 
    isConnected, 
    lastConnected, 
    forceReconnect,
    subscriptionCount,
    subscriptionNames 
  } = useRealtimeConnectionManager();

  // Log connection status changes
  logger.debug('Connection status', {
    isConnected,
    subscriptionCount,
    subscriptionNames,
    lastConnected: lastConnected?.toISOString()
  }, 'RealTimeIndicator');

  const handleRefresh = () => {
    onRefresh?.();
    forceReconnect(); // Also force reconnection
    toast({
      title: "Refreshing",
      description: "Updating voice interface data...",
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant={isConnected ? "default" : "destructive"} 
        className="flex items-center gap-1"
      >
        {isConnected ? (
          <>
            <Wifi className="h-3 w-3" />
            Live
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3" />
            Offline
          </>
        )}
      </Badge>
      
      {lastConnected && isConnected && (
        <span className="text-xs text-muted-foreground">
          Last update: {lastConnected.toLocaleTimeString()}
        </span>
      )}
      
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRefresh}
        className="h-6 w-6 p-0"
        title="Refresh data and reconnect"
      >
        <RefreshCw className="h-3 w-3" />
      </Button>
    </div>
  );
};
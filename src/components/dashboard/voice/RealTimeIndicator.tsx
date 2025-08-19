import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface RealTimeIndicatorProps {
  onRefresh?: () => void;
}

export const RealTimeIndicator: React.FC<RealTimeIndicatorProps> = ({ onRefresh }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Monitor Supabase real-time connection status
    const channel = supabase.channel('connection-monitor');
    
    channel.subscribe((status) => {
      setIsConnected(status === 'SUBSCRIBED');
      if (status === 'SUBSCRIBED') {
        setLastUpdate(new Date());
      } else if (status === 'CLOSED') {
        toast({
          title: "Connection Lost",
          description: "Real-time updates have been disconnected",
          variant: "destructive"
        });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const handleRefresh = () => {
    onRefresh?.();
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
      
      {lastUpdate && (
        <span className="text-xs text-muted-foreground">
          Last update: {lastUpdate.toLocaleTimeString()}
        </span>
      )}
      
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRefresh}
        className="h-6 w-6 p-0"
        title="Refresh data"
      >
        <RefreshCw className="h-3 w-3" />
      </Button>
    </div>
  );
};
/**
 * Call Controls Component
 * 
 * Enhanced call control buttons with agent transfer selector
 * Supports both compact and full variants
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Volume2, VolumeX, Pause, Play, PhoneOff, PhoneForwarded, Loader2, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface CallControlsProps {
  onMute?: () => void;
  onHold?: () => void;
  onTransfer?: (agentId: string) => void;
  onHangUp?: () => void;
  isMuted?: boolean;
  isOnHold?: boolean;
  variant?: 'compact' | 'full';
  className?: string;
}

export const CallControls: React.FC<CallControlsProps> = ({
  onMute,
  onHold,
  onTransfer,
  onHangUp,
  isMuted = false,
  isOnHold = false,
  variant = 'full',
  className,
}) => {
  const { toast } = useToast();
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const isCompact = variant === 'compact';

  // Fetch available agents for transfer
  const { data: agents, isLoading: loadingAgents } = useQuery({
    queryKey: ['available-agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, role')
        .eq('is_active', true)
        .in('role', ['agent', 'admin'])
        .order('full_name');

      if (error) throw error;
      return data;
    },
    enabled: isTransferOpen,
  });

  const handleTransfer = (agentId: string, agentName: string) => {
    if (onTransfer) {
      onTransfer(agentId);
      toast({
        title: 'Transfer initiated',
        description: `Transferring call to ${agentName}`,
      });
    }
    setIsTransferOpen(false);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Mute/Unmute */}
      {onMute && (
        <Button
          onClick={onMute}
          size={isCompact ? "sm" : "default"}
          variant={isMuted ? "destructive" : "outline"}
          className={cn(
            "gap-2",
            isMuted && "bg-red-500/10 border-red-500/20 text-red-600 hover:bg-red-500/20"
          )}
        >
          {isMuted ? (
            <>
              <VolumeX className={cn("h-4 w-4", isCompact && "h-3 w-3")} />
              {!isCompact && "Unmute"}
            </>
          ) : (
            <>
              <Volume2 className={cn("h-4 w-4", isCompact && "h-3 w-3")} />
              {!isCompact && "Mute"}
            </>
          )}
        </Button>
      )}

      {/* Hold/Resume */}
      {onHold && (
        <Button
          onClick={onHold}
          size={isCompact ? "sm" : "default"}
          variant={isOnHold ? "default" : "outline"}
          className="gap-2"
        >
          {isOnHold ? (
            <>
              <Play className={cn("h-4 w-4", isCompact && "h-3 w-3")} />
              {!isCompact && "Resume"}
            </>
          ) : (
            <>
              <Pause className={cn("h-4 w-4", isCompact && "h-3 w-3")} />
              {!isCompact && "Hold"}
            </>
          )}
        </Button>
      )}

      {/* Transfer with Agent Selector */}
      {onTransfer && (
        <DropdownMenu open={isTransferOpen} onOpenChange={setIsTransferOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              size={isCompact ? "sm" : "default"}
              variant="outline"
              className="gap-2"
            >
              <PhoneForwarded className={cn("h-4 w-4", isCompact && "h-3 w-3")} />
              {!isCompact && "Transfer"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Transfer to Agent</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {loadingAgents ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : agents && agents.length > 0 ? (
              agents.map((agent) => (
                <DropdownMenuItem
                  key={agent.user_id}
                  onClick={() => handleTransfer(agent.user_id, agent.full_name)}
                  className="cursor-pointer"
                >
                  <User className="h-4 w-4 mr-2" />
                  <div className="flex flex-col">
                    <span className="font-medium">{agent.full_name}</span>
                    <span className="text-xs text-muted-foreground">{agent.email}</span>
                  </div>
                </DropdownMenuItem>
              ))
            ) : (
              <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                No agents available
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Hang Up */}
      {onHangUp && (
        <Button
          onClick={onHangUp}
          size={isCompact ? "sm" : "default"}
          variant="destructive"
          className="gap-2"
        >
          <PhoneOff className={cn("h-4 w-4", isCompact && "h-3 w-3")} />
          {!isCompact && "End Call"}
        </Button>
      )}
    </div>
  );
};

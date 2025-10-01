/**
 * Call Controls Component
 * 
 * Inline controls for active calls (transfer, hold, mute)
 */

import React from 'react';
import { PhoneForwarded, Pause, Play, Volume2, VolumeX, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CallControlsProps {
  callId: string;
  isOnHold?: boolean;
  isMuted?: boolean;
  onHold?: () => void;
  onResume?: () => void;
  onMute?: () => void;
  onUnmute?: () => void;
  onTransfer?: (agentId: string) => void;
  onHangUp?: () => void;
  availableAgents?: Array<{ id: string; name: string; available: boolean }>;
  compact?: boolean;
}

export const CallControls: React.FC<CallControlsProps> = ({
  callId,
  isOnHold = false,
  isMuted = false,
  onHold,
  onResume,
  onMute,
  onUnmute,
  onTransfer,
  onHangUp,
  availableAgents = [],
  compact = false
}) => {
  const handleTransferSelect = (agentId: string) => {
    if (onTransfer) {
      onTransfer(agentId);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {/* Mute/Unmute */}
        <Button
          onClick={isMuted ? onUnmute : onMute}
          size="sm"
          variant="ghost"
          className={cn(
            "h-8 w-8 p-0",
            isMuted && "bg-red-500/10 text-red-600 hover:bg-red-500/20"
          )}
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>

        {/* Hold/Resume */}
        <Button
          onClick={isOnHold ? onResume : onHold}
          size="sm"
          variant="ghost"
          className={cn(
            "h-8 w-8 p-0",
            isOnHold && "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
          )}
        >
          {isOnHold ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </Button>

        {/* Transfer */}
        {availableAgents.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
              >
                <PhoneForwarded className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card z-50">
              <div className="px-2 py-1.5 text-sm font-semibold">Transfer to:</div>
              <DropdownMenuSeparator />
              {availableAgents.map((agent) => (
                <DropdownMenuItem
                  key={agent.id}
                  onClick={() => handleTransferSelect(agent.id)}
                  disabled={!agent.available}
                  className="flex items-center justify-between"
                >
                  <span>{agent.name}</span>
                  {agent.available ? (
                    <Badge variant="secondary" className="text-xs">Available</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Busy</Badge>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Hang Up */}
        <Button
          onClick={onHangUp}
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
        >
          <PhoneOff className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Mute/Unmute */}
      <Button
        onClick={isMuted ? onUnmute : onMute}
        size="sm"
        variant={isMuted ? "default" : "outline"}
        className={isMuted ? "bg-red-600 hover:bg-red-700" : ""}
      >
        {isMuted ? (
          <>
            <VolumeX className="h-4 w-4 mr-2" />
            Unmute
          </>
        ) : (
          <>
            <Volume2 className="h-4 w-4 mr-2" />
            Mute
          </>
        )}
      </Button>

      {/* Hold/Resume */}
      <Button
        onClick={isOnHold ? onResume : onHold}
        size="sm"
        variant={isOnHold ? "default" : "outline"}
        className={isOnHold ? "bg-amber-600 hover:bg-amber-700" : ""}
      >
        {isOnHold ? (
          <>
            <Play className="h-4 w-4 mr-2" />
            Resume
          </>
        ) : (
          <>
            <Pause className="h-4 w-4 mr-2" />
            Hold
          </>
        )}
      </Button>

      {/* Transfer */}
      {availableAgents.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              <PhoneForwarded className="h-4 w-4 mr-2" />
              Transfer
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 bg-card z-50">
            <div className="px-2 py-1.5 text-sm font-semibold">Transfer call to:</div>
            <DropdownMenuSeparator />
            {availableAgents.map((agent) => (
              <DropdownMenuItem
                key={agent.id}
                onClick={() => handleTransferSelect(agent.id)}
                disabled={!agent.available}
                className="flex items-center justify-between"
              >
                <span>{agent.name}</span>
                {agent.available ? (
                  <Badge variant="secondary" className="text-xs">Available</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">Busy</Badge>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Hang Up */}
      <Button
        onClick={onHangUp}
        size="sm"
        variant="destructive"
      >
        <PhoneOff className="h-4 w-4 mr-2" />
        End Call
      </Button>
    </div>
  );
};

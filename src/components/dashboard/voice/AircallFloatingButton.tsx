import React from 'react';
import { Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AircallFloatingButtonProps {
  isConnected: boolean;
  workspaceVisible: boolean;
  showAircallWorkspace: () => void;
  currentCall?: any | null;
  isWorkspaceReady: boolean;
}

/**
 * Floating Aircall icon button that appears when workspace is hidden
 * Provides quick access to show the Aircall workspace
 */
export const AircallFloatingButton: React.FC<AircallFloatingButtonProps> = ({
  isConnected,
  workspaceVisible,
  showAircallWorkspace,
  currentCall,
  isWorkspaceReady,
}) => {
  // Only show when workspace is hidden and SDK is connected
  if (workspaceVisible || !isConnected || !isWorkspaceReady) {
    return null;
  }

  // Determine status
  const hasActiveCall = currentCall !== null;
  const statusColor = hasActiveCall ? 'bg-red-500' : 'bg-green-500';
  const statusLabel = hasActiveCall ? 'Active call' : 'Connected';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={showAircallWorkspace}
          className={cn(
            'aircall-float-button',
            'fixed bottom-24 right-6 z-[9998]',
            'w-14 h-14 rounded-full',
            'bg-primary text-primary-foreground',
            'shadow-lg hover:shadow-xl',
            'flex items-center justify-center',
            'transition-all duration-300',
            'hover:scale-110',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
            'animate-fade-in',
            hasActiveCall && 'aircall-pulse-ring'
          )}
          aria-label="Show Aircall Phone"
          aria-pressed={workspaceVisible}
        >
          <Phone className="w-6 h-6" />
          
          {/* Status indicator dot */}
          <span
            className={cn(
              'absolute top-0 right-0',
              'w-3 h-3 rounded-full',
              'border-2 border-background',
              statusColor,
              hasActiveCall && 'animate-pulse'
            )}
            aria-label={statusLabel}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="left">
        <p>Show Aircall Phone{hasActiveCall && ' (Active Call)'}</p>
      </TooltipContent>
    </Tooltip>
  );
};

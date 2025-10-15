import React from 'react';
import { Phone, ChevronDown } from 'lucide-react';
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
  hideAircallWorkspace: () => void;
  currentCall?: any | null;
  isWorkspaceReady: boolean;
}

/**
 * Toggle button for Aircall workspace
 * Shows as floating button when hidden, minimize button when visible
 */
export const AircallFloatingButton: React.FC<AircallFloatingButtonProps> = ({
  isConnected,
  workspaceVisible,
  showAircallWorkspace,
  hideAircallWorkspace,
  currentCall,
  isWorkspaceReady,
}) => {
  // Only show when SDK is connected and ready
  if (!isConnected || !isWorkspaceReady) {
    return null;
  }

  // Determine status and behavior
  const hasActiveCall = currentCall !== null;
  const statusColor = hasActiveCall ? 'bg-red-500' : 'bg-green-500';
  const statusLabel = hasActiveCall ? 'Active call' : 'Connected';
  
  const Icon = workspaceVisible ? ChevronDown : Phone;
  const handleClick = workspaceVisible ? hideAircallWorkspace : showAircallWorkspace;
  const tooltipText = workspaceVisible ? 'Minimize Phone' : 'Show Aircall Phone';
  
  // Position: floating when hidden, top-right of workspace when visible
  const positionClasses = workspaceVisible 
    ? 'fixed top-[calc(100vh-666px-20px+8px)] right-[28px] z-[10000]' 
    : 'fixed bottom-24 right-6 z-[9998]';
  
  // Size and style: smaller and subtle when visible
  const sizeClasses = workspaceVisible
    ? 'w-10 h-10'
    : 'w-14 h-14';
  
  const bgClasses = workspaceVisible
    ? 'bg-background/80 backdrop-blur-sm text-foreground border border-border'
    : 'bg-primary text-primary-foreground';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleClick}
          className={cn(
            'aircall-float-button',
            positionClasses,
            sizeClasses,
            'rounded-full',
            bgClasses,
            'shadow-lg hover:shadow-xl',
            'flex items-center justify-center',
            'transition-all duration-300',
            'hover:scale-110',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
            'animate-fade-in',
            !workspaceVisible && hasActiveCall && 'aircall-pulse-ring'
          )}
          aria-label={tooltipText}
          aria-pressed={workspaceVisible}
        >
          <Icon className={workspaceVisible ? "w-5 h-5" : "w-6 h-6"} />
          
          {/* Status indicator dot - only show when floating */}
          {!workspaceVisible && (
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
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="left">
        <p>{tooltipText}{!workspaceVisible && hasActiveCall && ' (Active Call)'}</p>
      </TooltipContent>
    </Tooltip>
  );
};

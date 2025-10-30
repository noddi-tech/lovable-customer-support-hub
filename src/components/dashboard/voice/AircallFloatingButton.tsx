import React, { useState, useEffect } from 'react';
import { Phone, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { debug } from '@/utils/debug';
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
  // Track whether Aircall workspace exists in DOM
  const [hasWorkspaceInDOM, setHasWorkspaceInDOM] = useState(false);
  const [lastLoggedState, setLastLoggedState] = useState<boolean | null>(null);
  
  // Check for workspace existence in DOM and watch for changes
  useEffect(() => {
    const checkWorkspace = () => {
      const workspace = document.querySelector('#aircall-workspace');
      const workspaceExists = workspace !== null;
      
      // Only log when state actually changes
      if (workspaceExists !== lastLoggedState) {
        debug.log('[AircallFloatingButton] Workspace state changed:', {
          exists: workspaceExists,
          isWorkspaceReady,
          timestamp: new Date().toISOString()
        });
        setLastLoggedState(workspaceExists);
      }
      
      setHasWorkspaceInDOM(workspaceExists);
    };
    
    // Initial check
    checkWorkspace();
    
    // Set up MutationObserver to watch for workspace being added/removed
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Check if nodes were added or removed
        if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
          checkWorkspace();
        }
      });
    });
    
    // Observe the body for changes to detect when #aircall-workspace is added/removed
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Also check periodically (fallback in case MutationObserver misses something)
    const interval = setInterval(checkWorkspace, 1000);
    
    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, [hasWorkspaceInDOM, isWorkspaceReady]);
  
  // Only show button if workspace actually exists in DOM
  if (!hasWorkspaceInDOM) {
    return null; // Silent - already logged state change
  }

  // Determine status and behavior
  const hasActiveCall = currentCall !== null;
  const statusColor = hasActiveCall ? 'bg-red-500' : 'bg-green-500';
  const statusLabel = hasActiveCall ? 'Active call' : 'Connected';
  
  const Icon = workspaceVisible ? ChevronDown : Phone;
  const tooltipText = workspaceVisible ? 'Minimize Phone' : 'Show Aircall Phone';
  
  const handleClick = () => {
    const container = document.querySelector('#aircall-workspace-container');
    const domVisible = container?.classList.contains('aircall-visible');
    
    debug.log('[AircallFloatingButton] Button clicked:', {
      workspaceVisible,
      domVisible,
      isConnected,
      isWorkspaceReady,
      action: workspaceVisible ? 'hiding' : 'showing'
    });
    
    if (workspaceVisible) {
      hideAircallWorkspace();
    } else {
      showAircallWorkspace();
    }
  };
  
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

/**
 * Phase 7: Aircall Debug Panel
 * 
 * Development-only debug panel to help diagnose Aircall issues
 * Shows initialization phase, diagnostic results, and connection status
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Bug } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAircallPhone } from '@/hooks/useAircallPhone';

export const AircallDebugPanel: React.FC = () => {
  const { toast } = useToast();
  const context = useAircallPhone();
  
  // Minimize state
  const [isMinimized, setIsMinimized] = React.useState(() => {
    return localStorage.getItem('aircall_debug_minimized') === 'true';
  });

  const toggleMinimize = () => {
    const newState = !isMinimized;
    setIsMinimized(newState);
    localStorage.setItem('aircall_debug_minimized', String(newState));
  };
  
  // PHASE 4: Force re-render every 100ms to show live recursion guard state
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    const interval = setInterval(forceUpdate, 100);
    return () => clearInterval(interval);
  }, []);

  // Get real-time workspace container info
  const container = document.querySelector('#aircall-workspace-container') as HTMLElement;
  const computedStyle = container ? window.getComputedStyle(container) : null;

  // PHASE 3: Monitor dialog pointer-events
  const dialogOverlay = document.querySelector('[data-radix-dialog-overlay]') as HTMLElement;
  const dialogContent = document.querySelector('[data-radix-dialog-content]') as HTMLElement;
  const dialogOverlayStyle = dialogOverlay ? window.getComputedStyle(dialogOverlay) : null;
  const dialogContentStyle = dialogContent ? window.getComputedStyle(dialogContent) : null;

  // PHASE 5: Enhanced diagnostics
  const aircallIframe = document.querySelector('iframe[id*="aircall"]') as HTMLIFrameElement | null;
  const iframeAllow = aircallIframe?.getAttribute('allow') || '';
  const hasHidPermission = iframeAllow.includes('hid');
  
  // Check third-party cookies
  const canAccessThirdPartyCookies = navigator.cookieEnabled;
  
  // Get CSP violations from console
  const cspViolations: string[] = [];
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const message = args.join(' ');
    if (message.includes('Content-Security-Policy') || message.includes('CSP')) {
      cspViolations.push(message);
    }
    originalConsoleError.apply(console, args);
  };

  // Check current origin vs expected
  const currentOrigin = window.location.origin;
  const isLocalhost = currentOrigin.includes('localhost');
  const isPreviewDomain = currentOrigin.includes('lovableproject.com');
  const needsDomainWhitelist = isLocalhost || isPreviewDomain;

  const debugInfo = {
    timestamp: new Date().toISOString(),
    initializationPhase: context.initializationPhase,
    isInitialized: context.isInitialized,
    isConnected: context.isConnected,
    isWorkspaceReady: context.isWorkspaceReady,
    workspaceVisible: context.workspaceVisible,
    hasCurrentCall: !!context.currentCall,
    error: context.error,
    diagnosticIssues: context.diagnosticIssues,
    showLoginModal: context.showLoginModal,
    showBlockedModal: context.showBlockedModal,
    localStorageLoginStatus: localStorage.getItem('aircall_login_status'),
    // PHASE 5: Origin & OAuth diagnostics
    currentOrigin,
    isLocalhost,
    isPreviewDomain,
    needsDomainWhitelist,
    // Workspace container diagnostics
    containerExists: !!container,
    containerClasses: container?.className || 'N/A',
    pointerEvents: computedStyle?.pointerEvents || 'N/A',
    inlinePointerEvents: container?.style.pointerEvents || 'N/A',
    zIndex: computedStyle?.zIndex || 'N/A',
    iframeExists: !!container?.querySelector('iframe'),
    iframeInfo: {
      exists: !!aircallIframe,
      src: aircallIframe?.getAttribute('src') || 'N/A',
      visible: aircallIframe?.style?.display !== 'none',
      allowAttribute: iframeAllow || 'N/A',
      hasHidPermission,
    },
    // Security diagnostics
    thirdPartyCookiesEnabled: canAccessThirdPartyCookies,
    cspViolations,
    // PHASE 3: Dialog diagnostics
    dialogOverlayExists: !!dialogOverlay,
    dialogOverlayPointerEvents: dialogOverlayStyle?.pointerEvents || 'N/A',
    dialogContentExists: !!dialogContent,
    dialogContentPointerEvents: dialogContentStyle?.pointerEvents || 'N/A',
  };

  const copyDebugInfo = () => {
    const text = JSON.stringify(debugInfo, null, 2);
    navigator.clipboard.writeText(text);
    toast({
      title: 'Debug Info Copied',
      description: 'Debug information copied to clipboard',
    });
  };

  // PHASE 3: Force fix function to remove all pointer-events: none
  const forceFix = () => {
    let fixed = 0;
    
    // Fix workspace container
    if (container) {
      container.style.pointerEvents = 'auto';
      container.classList.remove('aircall-hidden');
      container.classList.add('aircall-visible');
      fixed++;
    }
    
    // Fix dialog overlay
    if (dialogOverlay) {
      dialogOverlay.style.pointerEvents = 'auto';
      fixed++;
    }
    
    // Fix dialog content
    if (dialogContent) {
      dialogContent.style.pointerEvents = 'auto';
      fixed++;
    }
    
    toast({
      title: 'Force Fix Applied',
      description: `Fixed ${fixed} elements to have pointer-events: auto`,
    });
  };

  // PHASE 7: Force reinitialize function
  const forceReinitialize = () => {
    // Clear all Aircall-related localStorage
    const keysToRemove = [
      'aircall_login_status',
      'aircall_connection_timestamp',
      'aircall_connection_attempts',
      'last_reconnect_attempt',
      'aircall_workspace_visible'
    ];
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    toast({
      title: 'Reinitializing Aircall',
      description: 'Cleared cache and reloading page...',
    });
    
    // Reload page after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  // Always show debug panel when Aircall is initializing or has issues
  const shouldShow = 
    process.env.NODE_ENV === 'development' || 
    new URLSearchParams(window.location.search).get('debug') === 'aircall' ||
    window.location.pathname.includes('/voice'); // Always show on voice page

  if (!shouldShow) return null;

  // Render minimized version
  if (isMinimized) {
    return (
      <Button
        onClick={toggleMinimize}
        className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg z-[9999]"
        size="icon"
        variant="outline"
        title="Show Aircall Debug Panel"
      >
        <Bug className="h-5 w-5" />
      </Button>
    );
  }

  // Render full panel
  return (
    <Card className="fixed bottom-4 right-4 w-96 p-4 shadow-lg border-2 border-primary/20 z-[9999]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bug className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm">Aircall Debug Panel</h3>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleMinimize}
            className="h-7 px-2 text-xs"
            title="Minimize debug panel"
          >
            Minimize
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={forceFix}
            className="h-7 px-2 text-xs"
            title="Force fix pointer-events on all elements"
          >
            Fix
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={forceReinitialize}
            className="h-7 px-2 text-xs"
            title="Clear cache and reinitialize Aircall"
          >
            Reinit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              console.log('[AircallDebug] Forcing showWorkspace() call');
              context.showAircallWorkspace?.(true);
            }}
            className="h-7 px-2 text-xs"
            title="Force show workspace (for login)"
          >
            Show
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={copyDebugInfo}
            className="h-7 w-7 p-0"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Phase:</span>
          <Badge variant="outline" className="text-xs">
            {context.initializationPhase}
          </Badge>
        </div>
        
        <div className="pt-2 border-t border-border">
          <span className="text-muted-foreground block mb-1 text-xs">SDK Method Detection:</span>
          <div className="text-xs text-muted-foreground">
            Check console for available workspace methods after initialization
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Initialized:</span>
          <Badge variant={context.isInitialized ? 'default' : 'secondary'} className="text-xs">
            {context.isInitialized ? 'Yes' : 'No'}
          </Badge>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Connected:</span>
          <Badge variant={context.isConnected ? 'default' : 'destructive'} className="text-xs">
            {context.isConnected ? 'Yes' : 'No'}
          </Badge>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Workspace Ready:</span>
          <Badge variant={context.isWorkspaceReady ? 'default' : 'secondary'} className="text-xs">
            {context.isWorkspaceReady ? 'Yes' : 'No'}
          </Badge>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Workspace Visible:</span>
          <Badge variant={context.workspaceVisible ? 'default' : 'secondary'} className="text-xs">
            {context.workspaceVisible ? 'Yes' : 'No'}
          </Badge>
        </div>

        {/* LocalStorage vs Actual State Check */}
        <div className="pt-2 border-t border-border">
          <span className="text-muted-foreground block mb-1">Login State:</span>
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cached (localStorage):</span>
              <Badge variant={localStorage.getItem('aircall_login_status') === 'true' ? 'default' : 'secondary'} className="text-xs">
                {localStorage.getItem('aircall_login_status') === 'true' ? 'Logged In' : 'Not Logged In'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Actual (context):</span>
              <Badge variant={context.isConnected ? 'default' : 'secondary'} className="text-xs">
                {context.isConnected ? 'Connected' : 'Not Connected'}
              </Badge>
            </div>
            {localStorage.getItem('aircall_login_status') === 'true' && !context.isConnected && (
              <div className="text-xs text-destructive mt-1">
                ⚠️ Mismatch: Cached as logged in but not connected
              </div>
            )}
          </div>
        </div>

        {/* PHASE 5: Origin & OAuth Diagnostics */}
        <div className="pt-2 border-t border-border">
          <span className="text-muted-foreground block mb-1">Origin & OAuth:</span>
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Origin:</span>
              <span className="font-mono text-xs truncate max-w-[200px]">{debugInfo.currentOrigin}</span>
            </div>
            {debugInfo.needsDomainWhitelist && (
              <div className="text-xs text-destructive mt-1">
                ⚠️ {debugInfo.isLocalhost ? 'Localhost' : 'Preview domain'} detected - Google OAuth will fail. Deploy to production domain and whitelist in Aircall admin.
              </div>
            )}
          </div>
        </div>

        {/* PHASE 5: Security Diagnostics */}
        <div className="pt-2 border-t border-border">
          <span className="text-muted-foreground block mb-1">Security:</span>
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Third-Party Cookies:</span>
              <Badge variant={debugInfo.thirdPartyCookiesEnabled ? 'default' : 'destructive'} className="text-xs">
                {debugInfo.thirdPartyCookiesEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            {!debugInfo.thirdPartyCookiesEnabled && (
              <div className="text-xs text-destructive mt-1">
                ⚠️ Enable third-party cookies for [*.]aircall.io and [*.]google.com
              </div>
            )}
            {debugInfo.cspViolations.length > 0 && (
              <div className="text-xs text-destructive mt-1">
                ⚠️ CSP violations detected: {debugInfo.cspViolations.length}
              </div>
            )}
          </div>
        </div>

        {/* Iframe Diagnostics */}
        {debugInfo.iframeInfo.exists && (
          <div className="pt-2 border-t border-border">
            <span className="text-muted-foreground block mb-1">Iframe Status:</span>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Exists:</span>
                <Badge variant="default" className="text-xs">Yes</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Visible:</span>
                <Badge variant={debugInfo.iframeInfo.visible ? 'default' : 'secondary'} className="text-xs">
                  {debugInfo.iframeInfo.visible ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">HID Permission:</span>
                <Badge variant={debugInfo.iframeInfo.hasHidPermission ? 'default' : 'destructive'} className="text-xs">
                  {debugInfo.iframeInfo.hasHidPermission ? '✅ Present' : '❌ Missing'}
                </Badge>
              </div>
              {!debugInfo.iframeInfo.hasHidPermission && (
                <div className="text-xs text-destructive mt-1">
                  ⚠️ iframe missing 'hid' permission - WebHID API required for hardware integration
                </div>
              )}
              {debugInfo.iframeInfo.src !== 'N/A' && (
                <div className="text-xs text-muted-foreground truncate">
                  Src: {debugInfo.iframeInfo.src.substring(0, 50)}...
                </div>
              )}
              {debugInfo.iframeInfo.allowAttribute !== 'N/A' && (
                <div className="text-xs text-muted-foreground truncate">
                  Allow: {debugInfo.iframeInfo.allowAttribute.substring(0, 50)}...
                </div>
              )}
            </div>
          </div>
        )}

        {/* PHASE 4: Show recursion guard states */}
        <div className="pt-2 border-t border-border">
          <span className="text-muted-foreground block mb-1">Recursion Guards:</span>
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Showing (locked):</span>
              <Badge variant="outline" className="text-xs">
                {context._debugRecursionGuards?.isShowing ? '🔒' : '✅'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Hiding (locked):</span>
              <Badge variant="outline" className="text-xs">
                {context._debugRecursionGuards?.isHiding ? '🔒' : '✅'}
              </Badge>
            </div>
          </div>
        </div>

        {container && (
          <div className="pt-2 border-t border-border">
            <span className="text-muted-foreground block mb-1">Container:</span>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pointer Events:</span>
                <span className="font-mono">{computedStyle?.pointerEvents}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Inline Style:</span>
                <span className="font-mono">{container.style.pointerEvents || 'none'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Classes:</span>
                <span className="font-mono text-xs">{container.className}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">iFrame:</span>
                <Badge variant={container.querySelector('iframe') ? 'default' : 'secondary'} className="text-xs">
                  {container.querySelector('iframe') ? 'Loaded' : 'Missing'}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* PHASE 3: Dialog diagnostics */}
        {(dialogOverlay || dialogContent) && (
          <div className="pt-2 border-t border-border">
            <span className="text-muted-foreground block mb-1">Dialog:</span>
            <div className="text-xs space-y-1">
              {dialogOverlay && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Overlay Pointer:</span>
                  <span className={`font-mono ${dialogOverlayStyle?.pointerEvents === 'none' ? 'text-destructive' : ''}`}>
                    {dialogOverlayStyle?.pointerEvents}
                  </span>
                </div>
              )}
              {dialogContent && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Content Pointer:</span>
                  <span className={`font-mono ${dialogContentStyle?.pointerEvents === 'none' ? 'text-destructive' : ''}`}>
                    {dialogContentStyle?.pointerEvents}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {context.diagnosticIssues.length > 0 && (
          <div className="pt-2 border-t border-border">
            <span className="text-muted-foreground block mb-1">Issues:</span>
            <div className="space-y-1">
              {context.diagnosticIssues.map((issue, i) => (
                <Badge key={i} variant="destructive" className="text-xs mr-1">
                  {issue}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {context.error && (
          <div className="pt-2 border-t border-border">
            <span className="text-muted-foreground block mb-1">Error:</span>
            <p className="text-destructive text-xs">{context.error}</p>
          </div>
        )}

        <div className="pt-2 border-t border-border">
          <span className="text-muted-foreground block mb-1">Modals:</span>
          <div className="flex gap-1">
            {context.showLoginModal && (
              <Badge variant="outline" className="text-xs">Login</Badge>
            )}
            {context.showBlockedModal && (
              <Badge variant="outline" className="text-xs">Blocked</Badge>
            )}
            {!context.showLoginModal && !context.showBlockedModal && (
              <span className="text-xs text-muted-foreground">None</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

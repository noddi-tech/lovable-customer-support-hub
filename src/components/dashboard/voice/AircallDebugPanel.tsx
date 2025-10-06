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

  // Get real-time workspace container info
  const container = document.querySelector('#aircall-workspace-container') as HTMLElement;
  const computedStyle = container ? window.getComputedStyle(container) : null;

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
    // Workspace container diagnostics
    containerExists: !!container,
    containerClasses: container?.className || 'N/A',
    pointerEvents: computedStyle?.pointerEvents || 'N/A',
    inlinePointerEvents: container?.style.pointerEvents || 'N/A',
    zIndex: computedStyle?.zIndex || 'N/A',
    iframeExists: !!container?.querySelector('iframe'),
  };

  const copyDebugInfo = () => {
    const text = JSON.stringify(debugInfo, null, 2);
    navigator.clipboard.writeText(text);
    toast({
      title: 'Debug Info Copied',
      description: 'Debug information copied to clipboard',
    });
  };

  // Only show in development or with ?debug=aircall
  const shouldShow = 
    process.env.NODE_ENV === 'development' || 
    new URLSearchParams(window.location.search).get('debug') === 'aircall';

  if (!shouldShow) return null;

  return (
    <Card className="fixed bottom-4 right-4 w-96 p-4 shadow-lg border-2 border-primary/20 z-50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bug className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm">Aircall Debug Panel</h3>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={copyDebugInfo}
          className="h-7 w-7 p-0"
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Phase:</span>
          <Badge variant="outline" className="text-xs">
            {context.initializationPhase}
          </Badge>
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

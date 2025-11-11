import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Minimize2, Maximize2 } from 'lucide-react';
import { logger } from '@/utils/logger';

interface PerformanceDebugPanelProps {
  visible?: boolean;
}

export const PerformanceDebugPanel: React.FC<PerformanceDebugPanelProps> = ({ 
  visible: initialVisible = false 
}) => {
  const [isVisible, setIsVisible] = useState(initialVisible);
  const [isMinimized, setIsMinimized] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

  // Toggle visibility with Ctrl+Shift+D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update metrics every 500ms
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      const debugMetrics = logger.getDebugMetrics();
      setMetrics(debugMetrics);
      forceUpdate();
    }, 500);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-[9999]">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsVisible(true)}
          className="shadow-lg"
        >
          Show Debug (Ctrl+Shift+D)
        </Button>
      </div>
    );
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-[9999]">
        <Card className="p-2 shadow-xl bg-background/95 backdrop-blur">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Performance Debug</Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsMinimized(false)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsVisible(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-[500px] z-[9999] max-h-[80vh] overflow-hidden">
      <Card className="shadow-xl bg-background/95 backdrop-blur border-2">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b bg-muted/50">
          <div className="flex items-center gap-2">
            <Badge>Performance Debug</Badge>
            <span className="text-xs text-muted-foreground">
              Press Ctrl+Shift+D to toggle
            </span>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => logger.clearDebugMetrics()}
            >
              Clear
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsMinimized(true)}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsVisible(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(80vh-80px)]">
          {/* Component Render Counts */}
          <div>
            <h3 className="font-semibold text-sm mb-2">Component Renders</h3>
            <div className="space-y-1 text-xs">
              {metrics?.componentRenders && Object.keys(metrics.componentRenders).length > 0 ? (
                Object.entries(metrics.componentRenders).map(([name, count]: [string, any]) => (
                  <div key={name} className="flex justify-between items-center p-1 bg-muted/30 rounded">
                    <span className="font-mono">{name}</span>
                    <Badge variant={count > 10 ? 'destructive' : count > 5 ? 'secondary' : 'outline'} className="text-xs">
                      {count}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground">No render data yet...</div>
              )}
            </div>
          </div>

          {/* Parse Cache Stats */}
          <div>
            <h3 className="font-semibold text-sm mb-2">Parse Cache</h3>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2 bg-muted/30 rounded">
                <div className="text-muted-foreground">Hits</div>
                <div className="text-lg font-bold text-green-500">
                  {metrics?.parseCache?.hits || 0}
                </div>
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <div className="text-muted-foreground">Misses</div>
                <div className="text-lg font-bold text-orange-500">
                  {metrics?.parseCache?.misses || 0}
                </div>
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <div className="text-muted-foreground">Size</div>
                <div className="text-lg font-bold">
                  {metrics?.parseCache?.size || 0}
                </div>
              </div>
            </div>
            {metrics?.parseCache && (
              <div className="mt-2 p-2 bg-muted/30 rounded text-xs">
                <div className="text-muted-foreground">Hit Rate</div>
                <div className="font-mono text-sm">
                  {metrics.parseCache.hits + metrics.parseCache.misses > 0
                    ? ((metrics.parseCache.hits / (metrics.parseCache.hits + metrics.parseCache.misses)) * 100).toFixed(1)
                    : 0}%
                </div>
              </div>
            )}
          </div>

          {/* Slow Operations */}
          <div>
            <h3 className="font-semibold text-sm mb-2">Slow Operations (&gt;50ms)</h3>
            <div className="space-y-1 text-xs max-h-[150px] overflow-y-auto">
              {metrics?.slowOperations && metrics.slowOperations.length > 0 ? (
                metrics.slowOperations.slice(-10).reverse().map((op: any, idx: number) => (
                  <div key={idx} className="p-2 bg-destructive/10 rounded">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-xs">{op.label}</span>
                      <Badge variant="destructive" className="text-xs">
                        {op.duration.toFixed(1)}ms
                      </Badge>
                    </div>
                    {op.component && (
                      <div className="text-muted-foreground text-xs mt-1">
                        in {op.component}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground">No slow operations detected</div>
              )}
            </div>
          </div>

          {/* Memoization Breaks */}
          <div>
            <h3 className="font-semibold text-sm mb-2">Memoization Events</h3>
            <div className="space-y-1 text-xs max-h-[150px] overflow-y-auto">
              {metrics?.memoBreaks && metrics.memoBreaks.length > 0 ? (
                metrics.memoBreaks.slice(-10).reverse().map((event: any, idx: number) => (
                  <div key={idx} className="p-2 bg-muted/30 rounded">
                    <div className="font-mono">{event.component}</div>
                    <div className="text-muted-foreground mt-1">
                      {event.reason}
                    </div>
                    <div className="text-muted-foreground text-xs mt-1">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground">No memoization events logged</div>
              )}
            </div>
          </div>

          {/* Parse Call Stack */}
          <div>
            <h3 className="font-semibold text-sm mb-2">Recent Parse Calls</h3>
            <div className="space-y-1 text-xs max-h-[150px] overflow-y-auto">
              {metrics?.parseCalls && metrics.parseCalls.length > 0 ? (
                metrics.parseCalls.slice(-5).reverse().map((call: any, idx: number) => (
                  <div key={idx} className="p-2 bg-muted/30 rounded font-mono text-xs">
                    <div className="flex justify-between">
                      <span>{call.function}</span>
                      <Badge variant={call.cached ? 'outline' : 'secondary'} className="text-xs">
                        {call.cached ? 'CACHED' : 'PARSED'}
                      </Badge>
                    </div>
                    {call.contentPreview && (
                      <div className="text-muted-foreground mt-1 truncate">
                        {call.contentPreview}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground">No parse calls yet</div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

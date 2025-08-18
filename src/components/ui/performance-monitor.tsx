import React, { useEffect, useState } from 'react';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Zap, Clock, AlertTriangle, X } from 'lucide-react';

interface PerformanceMetrics {
  renderTime: number;
  componentCount: number;
  memoryUsage?: number;
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
}

interface PerformanceMonitorProps {
  show: boolean;
  onClose: () => void;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ show, onClose }) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const { measureRender } = usePerformanceMonitoring('PerformanceMonitor');

  useEffect(() => {
    if (!show) return;

    const updateMetrics = () => {
      // Measure performance
      const renderStart = performance.now();
      
      // Get component count (estimate based on DOM nodes)
      const componentCount = document.querySelectorAll('[data-react-component]').length || 
                           Math.floor(document.querySelectorAll('*').length / 10);

      // Get memory usage if available
      const memoryUsage = (performance as any).memory?.usedJSHeapSize / 1024 / 1024;

      // Get paint metrics
      const paintEntries = performance.getEntriesByType('paint');
      const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime;
      const lcp = paintEntries.find(entry => entry.name === 'largest-contentful-paint')?.startTime;

      const renderEnd = performance.now();

      setMetrics({
        renderTime: renderEnd - renderStart,
        componentCount,
        memoryUsage,
        fcp,
        lcp
      });
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 2000);

    return () => clearInterval(interval);
  }, [show]);

  if (!show || !metrics) return null;

  const getPerformanceLevel = (renderTime: number) => {
    if (renderTime < 16) return { level: 'excellent', color: 'bg-green-500', text: 'Excellent' };
    if (renderTime < 33) return { level: 'good', color: 'bg-yellow-500', text: 'Good' };
    return { level: 'poor', color: 'bg-red-500', text: 'Needs Optimization' };
  };

  const performanceLevel = getPerformanceLevel(metrics.renderTime);

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <Card className="shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Performance Monitor
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Render Performance */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Render Time</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono">{metrics.renderTime.toFixed(2)}ms</span>
              <Badge 
                variant="outline" 
                className={`${performanceLevel.color} text-white border-transparent`}
              >
                {performanceLevel.text}
              </Badge>
            </div>
          </div>

          {/* Component Count */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Components</span>
            </div>
            <span className="text-sm font-mono">{metrics.componentCount}</span>
          </div>

          {/* Memory Usage */}
          {metrics.memoryUsage && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Memory</span>
              </div>
              <span className="text-sm font-mono">{metrics.memoryUsage.toFixed(1)} MB</span>
            </div>
          )}

          {/* Paint Metrics */}
          {(metrics.fcp || metrics.lcp) && (
            <div className="pt-2 border-t">
              <div className="text-xs text-muted-foreground mb-2">Paint Metrics</div>
              {metrics.fcp && (
                <div className="flex items-center justify-between">
                  <span className="text-xs">FCP</span>
                  <span className="text-xs font-mono">{metrics.fcp.toFixed(0)}ms</span>
                </div>
              )}
              {metrics.lcp && (
                <div className="flex items-center justify-between">
                  <span className="text-xs">LCP</span>
                  <span className="text-xs font-mono">{metrics.lcp.toFixed(0)}ms</span>
                </div>
              )}
            </div>
          )}

          {/* Performance Tips */}
          {performanceLevel.level === 'poor' && (
            <div className="pt-2 border-t">
              <div className="text-xs text-muted-foreground">
                <Clock className="h-3 w-3 inline mr-1" />
                Consider lazy loading or reducing component complexity
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
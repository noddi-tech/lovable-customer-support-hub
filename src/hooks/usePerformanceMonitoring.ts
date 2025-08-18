import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  componentName: string;
}

export const usePerformanceMonitoring = (componentName: string) => {
  const renderStartTime = useRef<number>(0);
  const mountTime = useRef<number>(0);

  useEffect(() => {
    mountTime.current = performance.now();
    
    return () => {
      // Component unmount cleanup
      if (process.env.NODE_ENV === 'development') {
        const unmountTime = performance.now();
        const lifecycleTime = unmountTime - mountTime.current;
        console.debug(`${componentName} lifecycle time:`, lifecycleTime.toFixed(2), 'ms');
      }
    };
  }, [componentName]);

  const measureRender = () => {
    if (process.env.NODE_ENV === 'development') {
      renderStartTime.current = performance.now();
      
      requestAnimationFrame(() => {
        const renderTime = performance.now() - renderStartTime.current;
        if (renderTime > 16) { // Flag renders slower than 60fps
          console.warn(`Slow render in ${componentName}:`, renderTime.toFixed(2), 'ms');
        }
      });
    }
  };

  return { measureRender };
};

export const useMemoryMonitoring = () => {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && 'memory' in performance) {
      const logMemoryUsage = () => {
        const memory = (performance as any).memory;
        if (memory) {
          console.debug('Memory usage:', {
            used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
            total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
            limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`
          });
        }
      };

      const interval = setInterval(logMemoryUsage, 30000); // Log every 30 seconds
      return () => clearInterval(interval);
    }
  }, []);
};
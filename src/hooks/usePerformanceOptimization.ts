import { useEffect, useRef, useCallback, useMemo } from 'react';
import { logger } from '@/utils/logger';

interface PerformanceMetrics {
  renderTime: number;
  reRenderCount: number;
  memoryUsage?: number;
  componentSize?: number;
}

interface PerformanceConfig {
  enableLogging: boolean;
  renderTimeThreshold: number;
  reRenderThreshold: number;
  trackReRenders: boolean;
  componentName?: string;
}

const DEFAULT_CONFIG: PerformanceConfig = {
  enableLogging: false, // Disabled by default in production
  renderTimeThreshold: 16, // 16ms = 60fps threshold
  reRenderThreshold: 10,
  trackReRenders: true
};

export const usePerformanceOptimization = (
  dependencies: any[] = [],
  config: Partial<PerformanceConfig> = {}
) => {
  const finalConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);
  const renderCountRef = useRef(0);
  const renderStartTime = useRef<number>();
  const previousDeps = useRef<any[]>();
  const metricsRef = useRef<PerformanceMetrics>({
    renderTime: 0,
    reRenderCount: 0
  });

  // Track render start time
  const startRenderTiming = useCallback(() => {
    if (finalConfig.enableLogging) {
      renderStartTime.current = performance.now();
    }
  }, [finalConfig.enableLogging]);

  // Track render end time and log if needed
  const endRenderTiming = useCallback(() => {
    if (finalConfig.enableLogging && renderStartTime.current) {
      const renderTime = performance.now() - renderStartTime.current;
      metricsRef.current.renderTime = renderTime;
      
      if (renderTime > finalConfig.renderTimeThreshold) {
        logger.warn(`Slow render detected: ${renderTime.toFixed(2)}ms`, {
          component: finalConfig.componentName,
          renderTime,
          threshold: finalConfig.renderTimeThreshold
        }, 'PerformanceOptimizer');
      }
    }
  }, [finalConfig.enableLogging, finalConfig.renderTimeThreshold, finalConfig.componentName]);

  // Check for unnecessary re-renders
  const checkReRender = useCallback(() => {
    if (!finalConfig.trackReRenders) return;

    renderCountRef.current += 1;
    metricsRef.current.reRenderCount = renderCountRef.current;

    if (finalConfig.enableLogging && previousDeps.current) {
      const changedDeps = dependencies.map((dep, index) => ({
        index,
        prev: previousDeps.current?.[index],
        current: dep,
        changed: !Object.is(previousDeps.current?.[index], dep)
      })).filter(dep => dep.changed);

      if (changedDeps.length === 0) {
        logger.warn('Unnecessary re-render detected', {
          component: finalConfig.componentName,
          renderCount: renderCountRef.current
        }, 'PerformanceOptimizer');
      } else if (renderCountRef.current > finalConfig.reRenderThreshold) {
        logger.warn(`High re-render count: ${renderCountRef.current}`, {
          component: finalConfig.componentName,
          changedDependencies: changedDeps
        }, 'PerformanceOptimizer');
      }
    }

    previousDeps.current = [...dependencies];
  }, [dependencies, finalConfig, renderCountRef]);

  // Memory usage tracking (approximate)
  const checkMemoryUsage = useCallback(() => {
    if (finalConfig.enableLogging && 'memory' in performance) {
      const memoryInfo = (performance as any).memory;
      metricsRef.current.memoryUsage = memoryInfo.usedJSHeapSize;
      
      // Log if memory usage is high (>100MB)
      if (memoryInfo.usedJSHeapSize > 100 * 1024 * 1024) {
        logger.warn(`High memory usage: ${Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024)}MB`, {
          component: finalConfig.componentName,
          memoryUsage: memoryInfo.usedJSHeapSize
        }, 'PerformanceOptimizer');
      }
    }
  }, [finalConfig.enableLogging, finalConfig.componentName]);

  // Get current performance metrics
  const getMetrics = useCallback((): PerformanceMetrics => {
    return { ...metricsRef.current };
  }, []);

  // Reset metrics
  const resetMetrics = useCallback(() => {
    renderCountRef.current = 0;
    metricsRef.current = {
      renderTime: 0,
      reRenderCount: 0
    };
  }, []);

  // Main performance tracking effect
  useEffect(() => {
    if (finalConfig.enableLogging) {
      startRenderTiming();
      checkReRender();
      checkMemoryUsage();
      endRenderTiming();
    }
  }, dependencies);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (finalConfig.enableLogging && renderCountRef.current > finalConfig.reRenderThreshold) {
        logger.info(`Component unmounted after ${renderCountRef.current} renders`, {
          component: finalConfig.componentName,
          finalMetrics: getMetrics()
        }, 'PerformanceOptimizer');
      }
    };
  }, []);

  return {
    startRenderTiming,
    endRenderTiming,
    checkReRender,
    checkMemoryUsage,
    getMetrics,
    resetMetrics,
    renderCount: renderCountRef.current
  };
};
import { useEffect, useRef, useCallback } from 'react';
import { logger } from '@/utils/logger';
import debounce from 'lodash.debounce';

interface PerformanceMetrics {
  renderTime: number;
  reRenderCount: number;
  memoryUsage?: {
    used: number;
    total: number;
    limit: number;
    percentage: number;
  };
  componentSize?: {
    props: number;
    state: number;
  };
}

interface PerformanceMonitoringOptions {
  enableLogging?: boolean;
  logThreshold?: number; // Log renders slower than this (ms)
  memoryCheckInterval?: number; // Memory check interval (ms)
  trackReRenders?: boolean;
  componentName?: string;
}

export const usePerformanceMonitoring = (
  options: PerformanceMonitoringOptions = {}
) => {
  const {
    enableLogging = import.meta.env.DEV,
    logThreshold = 16, // 60fps threshold
    memoryCheckInterval = 10000, // 10 seconds
    trackReRenders = true,
    componentName = 'UnnamedComponent'
  } = options;

  const renderCountRef = useRef(0);
  const renderStartRef = useRef<number>(0);
  const lastPropsRef = useRef<any>(null);
  const lastStateRef = useRef<any>(null);
  const metricsRef = useRef<PerformanceMetrics>({
    renderTime: 0,
    reRenderCount: 0,
  });

  // Start render timing
  const startRenderTiming = useCallback(() => {
    renderStartRef.current = performance.now();
  }, []);

  // End render timing and log if necessary
  const endRenderTiming = useCallback(() => {
    const renderTime = performance.now() - renderStartRef.current;
    renderCountRef.current += 1;
    metricsRef.current.renderTime = renderTime;
    metricsRef.current.reRenderCount = renderCountRef.current;

    if (enableLogging && renderTime > logThreshold) {
      logger.warn('Slow render detected', {
        componentName,
        renderTime: `${renderTime.toFixed(2)}ms`,
        reRenderCount: renderCountRef.current,
        threshold: logThreshold
      }, 'PerformanceMonitoring');
    }
  }, [enableLogging, logThreshold, componentName]);

  // Check for unnecessary re-renders
  const checkReRender = useCallback((props?: any, state?: any) => {
    if (!trackReRenders) return;

    const propsChanged = lastPropsRef.current && 
      JSON.stringify(props) !== JSON.stringify(lastPropsRef.current);
    const stateChanged = lastStateRef.current && 
      JSON.stringify(state) !== JSON.stringify(lastStateRef.current);

    if (renderCountRef.current > 1 && !propsChanged && !stateChanged) {
      logger.warn('Unnecessary re-render detected', {
        componentName,
        reRenderCount: renderCountRef.current,
        propsChanged,
        stateChanged
      }, 'PerformanceMonitoring');
    }

    lastPropsRef.current = props;
    lastStateRef.current = state;
  }, [trackReRenders, componentName]);

  // Memory usage check
  const checkMemoryUsage = useCallback(() => {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in window.performance) {
      const memory = (window.performance as any).memory;
      const memoryUsage = {
        used: Math.round(memory.usedJSHeapSize / 1048576), // MB
        total: Math.round(memory.totalJSHeapSize / 1048576), // MB
        limit: Math.round(memory.jsHeapSizeLimit / 1048576), // MB
        percentage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)
      };

      metricsRef.current.memoryUsage = memoryUsage;

      if (memoryUsage.percentage > 85) {
        logger.error('Critical memory usage detected', {
          componentName,
          ...memoryUsage
        }, 'PerformanceMonitoring');
      } else if (memoryUsage.percentage > 70) {
        logger.warn('High memory usage detected', {
          componentName,
          ...memoryUsage
        }, 'PerformanceMonitoring');
      }

      return memoryUsage;
    }
    return null;
  }, [componentName]);

  // Debounced memory check to avoid excessive calls
  const debouncedMemoryCheck = useCallback(
    debounce(checkMemoryUsage, 1000),
    [checkMemoryUsage]
  );

  // Performance observer for paint and layout metrics
  useEffect(() => {
    if (!enableLogging) return;

    let observer: PerformanceObserver | null = null;

    if ('PerformanceObserver' in window) {
      observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'measure' || entry.entryType === 'navigation') {
            logger.debug('Performance entry', {
              componentName,
              type: entry.entryType,
              name: entry.name,
              duration: entry.duration,
              startTime: entry.startTime
            }, 'PerformanceMonitoring');
          }
        });
      });

      try {
        observer.observe({ entryTypes: ['measure', 'navigation'] });
      } catch (error) {
        // Some browsers might not support all entry types
        logger.debug('Performance observer setup failed', { error }, 'PerformanceMonitoring');
      }
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [enableLogging, componentName]);

  // Memory monitoring interval
  useEffect(() => {
    if (memoryCheckInterval <= 0) return;

    const interval = setInterval(() => {
      debouncedMemoryCheck();
    }, memoryCheckInterval);

    return () => {
      clearInterval(interval);
      debouncedMemoryCheck.cancel();
    };
  }, [memoryCheckInterval, debouncedMemoryCheck]);

  // Component size estimation
  const estimateComponentSize = useCallback((props?: any, state?: any) => {
    try {
      const propsSize = props ? new Blob([JSON.stringify(props)]).size : 0;
      const stateSize = state ? new Blob([JSON.stringify(state)]).size : 0;
      
      metricsRef.current.componentSize = {
        props: propsSize,
        state: stateSize
      };

      if (enableLogging && (propsSize > 1024 || stateSize > 1024)) { // 1KB threshold
        logger.warn('Large component data detected', {
          componentName,
          propsSize: `${propsSize} bytes`,
          stateSize: `${stateSize} bytes`
        }, 'PerformanceMonitoring');
      }

      return { props: propsSize, state: stateSize };
    } catch (error) {
      logger.debug('Failed to estimate component size', { error }, 'PerformanceMonitoring');
      return null;
    }
  }, [enableLogging, componentName]);

  // Get current metrics
  const getMetrics = useCallback((): PerformanceMetrics => {
    return { ...metricsRef.current };
  }, []);

  // Reset metrics
  const resetMetrics = useCallback(() => {
    renderCountRef.current = 0;
    metricsRef.current = {
      renderTime: 0,
      reRenderCount: 0,
    };
  }, []);

  // Performance report
  const generateReport = useCallback(() => {
    const metrics = getMetrics();
    const report = {
      componentName,
      ...metrics,
      timestamp: new Date().toISOString(),
      averageRenderTime: metrics.renderTime,
      totalRenders: renderCountRef.current
    };

    if (enableLogging) {
      logger.info('Performance report generated', report, 'PerformanceMonitoring');
    }

    return report;
  }, [componentName, enableLogging, getMetrics]);

  return {
    startRenderTiming,
    endRenderTiming,
    checkReRender,
    checkMemoryUsage,
    estimateComponentSize,
    getMetrics,
    resetMetrics,
    generateReport,
    // Convenience method to wrap around component renders
    measureRender: (renderFn: () => void) => {
      startRenderTiming();
      renderFn();
      endRenderTiming();
    },
  };
};
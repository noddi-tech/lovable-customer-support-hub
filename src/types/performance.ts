/**
 * Performance monitoring and optimization types
 */

export interface PerformanceMetrics {
  componentName: string;
  renderTime: number;
  mountTime: number;
  unmountTime?: number;
  memoryUsage?: {
    used: number;
    total: number;
    limit: number;
  };
}

export interface PerformanceThresholds {
  fastRender: number;
  slowRender: number;
  verySlowRender: number;
  memoryWarning: number;
  memoryCritical: number;
}

export interface OptimizationConfig {
  intersectionThreshold: number;
  intersectionRootMargin: string;
  searchDebounce: number;
  scrollThrottle: number;
  resizeThrottle: number;
  itemHeight: number;
  overscan: number;
  queryStaleTime: number;
  queryCacheTime: number;
}

export interface FeatureFlags {
  enablePerformanceMonitoring: boolean;
  enableMemoryMonitoring: boolean;
  enableVirtualScrolling: boolean;
  enableServiceWorker: boolean;
}

export type PerformanceLevel = 'fast' | 'normal' | 'slow' | 'critical';

export interface ComponentPerformanceData {
  name: string;
  averageRenderTime: number;
  maxRenderTime: number;
  minRenderTime: number;
  renderCount: number;
  level: PerformanceLevel;
}
/**
 * Performance-related constants and configurations
 */

export const PERFORMANCE_THRESHOLDS = {
  // Render time thresholds (in milliseconds)
  FAST_RENDER: 16, // 60fps
  SLOW_RENDER: 100,
  VERY_SLOW_RENDER: 500,

  // Memory thresholds (in MB)
  MEMORY_WARNING: 50,
  MEMORY_CRITICAL: 100,

  // Bundle size thresholds (in KB)
  CHUNK_SIZE_WARNING: 500,
  CHUNK_SIZE_MAX: 1000,

  // Network thresholds (in milliseconds)
  FAST_NETWORK: 100,
  SLOW_NETWORK: 1000,
} as const;

export const OPTIMIZATION_CONFIG = {
  // Lazy loading
  INTERSECTION_THRESHOLD: 0.1,
  INTERSECTION_ROOT_MARGIN: '50px',

  // Debounce/throttle delays
  SEARCH_DEBOUNCE: 300,
  SCROLL_THROTTLE: 16,
  RESIZE_THROTTLE: 100,

  // Virtual scrolling
  ITEM_HEIGHT: 64,
  OVERSCAN: 5,

  // Cache settings
  QUERY_STALE_TIME: 5 * 60 * 1000, // 5 minutes
  QUERY_CACHE_TIME: 10 * 60 * 1000, // 10 minutes
} as const;

export const FEATURE_FLAGS = {
  ENABLE_PERFORMANCE_MONITORING: process.env.NODE_ENV === 'development',
  ENABLE_MEMORY_MONITORING: process.env.NODE_ENV === 'development',
  ENABLE_VIRTUAL_SCROLLING: false,
  ENABLE_SERVICE_WORKER: process.env.NODE_ENV === 'production',
} as const;
import React from 'react';

/**
 * Bundle optimization utilities for dynamic imports and code splitting
 */

// Dynamic import wrapper with error handling and loading states
export const dynamicImport = async <T = any>(
  importFn: () => Promise<{ default: T } | T>,
  componentName?: string
): Promise<T> => {
  try {
    const module = await importFn();
    return 'default' in module ? module.default : module;
  } catch (error) {
    console.error(`Failed to dynamically import ${componentName || 'module'}:`, error);
    throw error;
  }
};

// Preload critical components
export const preloadComponent = (importFn: () => Promise<any>) => {
  // Start loading the component in the background
  importFn().catch(() => {
    // Ignore errors during preloading
  });
};

// Bundle splitting for different routes/features
export const RouteComponents = {
  // Admin components (heavy, rarely used)
  AdminPortal: () => import('../components/admin/AdminPortal'),
  UserManagement: () => import('../components/admin/UserManagement'),
  IntegrationSettings: () => import('../components/admin/IntegrationSettings'),
  
  // Dashboard components (core, frequently used)
  ConversationView: () => import('../components/dashboard/ConversationView'),
  VoiceInterface: () => import('../components/dashboard/VoiceInterface'),
  
  // Newsletter components (medium usage)
  NewsletterBuilder: () => import('../components/dashboard/NewsletterBuilder'),
  
  // Settings components (occasional use)
  EmailTemplateSettings: () => import('../components/settings/EmailTemplateSettings'),
  LanguageSettings: () => import('../components/settings/LanguageSettings'),
};

// Performance monitoring
export const PerformanceMonitor = {
  // Measure component render time
  measureRenderTime: (componentName: string, renderFn: () => void) => {
    const start = performance.now();
    renderFn();
    const end = performance.now();
    console.debug(`${componentName} render time: ${end - start}ms`);
  },

  // Monitor memory usage
  checkMemoryUsage: () => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: Math.round(memory.usedJSHeapSize / 1048576), // MB
        total: Math.round(memory.totalJSHeapSize / 1048576), // MB  
        limit: Math.round(memory.jsHeapSizeLimit / 1048576), // MB
        percentage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)
      };
    }
    return null;
  }
};
import { useEffect, useRef, useCallback } from 'react';
import { logger } from '@/utils/logger';

interface MemoryLeakPreventionOptions {
  enableLogging?: boolean;
  maxEventListeners?: number;
  checkIntervalMs?: number;
}

export const useMemoryLeakPrevention = (
  componentName: string,
  options: MemoryLeakPreventionOptions = {}
) => {
  const {
    enableLogging = false,
    maxEventListeners = 10,
    checkIntervalMs = 30000, // 30 seconds
  } = options;

  const timeoutsRef = useRef<Set<number>>(new Set());
  const intervalsRef = useRef<Set<number>>(new Set());
  const eventListenersRef = useRef<Array<{
    element: EventTarget;
    type: string;
    listener: EventListener;
    options?: AddEventListenerOptions | boolean;
  }>>(new Array());
  const observersRef = useRef<Set<MutationObserver | IntersectionObserver | ResizeObserver>>(new Set());
  const subscriptionsRef = useRef<Set<{ unsubscribe: () => void }>>(new Set());

  // Memory check interval
  const memoryCheckRef = useRef<number | null>(null);

  // Enhanced setTimeout with tracking
  const safeSetTimeout = useCallback((
    callback: () => void,
    delay: number
  ): number => {
    const timeout = setTimeout(() => {
      timeoutsRef.current.delete(timeout);
      callback();
    }, delay);
    
    timeoutsRef.current.add(timeout);
    
    if (enableLogging) {
      logger.debug('Timeout created', { 
        componentName, 
        delay, 
        activeTimeouts: timeoutsRef.current.size 
      }, 'MemoryLeakPrevention');
    }
    
    return timeout;
  }, [componentName, enableLogging]);

  // Enhanced setInterval with tracking
  const safeSetInterval = useCallback((
    callback: () => void,
    delay: number
  ): number => {
    const interval = setInterval(callback, delay);
    intervalsRef.current.add(interval);
    
    if (enableLogging) {
      logger.debug('Interval created', { 
        componentName, 
        delay, 
        activeIntervals: intervalsRef.current.size 
      }, 'MemoryLeakPrevention');
    }
    
    return interval;
  }, [componentName, enableLogging]);

  // Enhanced addEventListener with tracking
  const safeAddEventListener = useCallback((
    element: EventTarget,
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions | boolean
  ) => {
    element.addEventListener(type, listener, options);
    
    const listenerInfo = { element, type, listener, options };
    eventListenersRef.current.push(listenerInfo);
    
    if (eventListenersRef.current.length > maxEventListeners) {
      logger.warn('High number of event listeners detected', {
        componentName,
        count: eventListenersRef.current.length,
        maxEventListeners
      }, 'MemoryLeakPrevention');
    }
    
    if (enableLogging) {
      logger.debug('Event listener added', { 
        componentName, 
        type, 
        activeListeners: eventListenersRef.current.length 
      }, 'MemoryLeakPrevention');
    }
  }, [componentName, enableLogging, maxEventListeners]);

  // Enhanced observer tracking
  const trackObserver = useCallback((
    observer: MutationObserver | IntersectionObserver | ResizeObserver
  ) => {
    observersRef.current.add(observer);
    
    if (enableLogging) {
      logger.debug('Observer tracked', { 
        componentName, 
        type: observer.constructor.name,
        activeObservers: observersRef.current.size 
      }, 'MemoryLeakPrevention');
    }
  }, [componentName, enableLogging]);

  // Enhanced subscription tracking
  const trackSubscription = useCallback((
    subscription: { unsubscribe: () => void }
  ) => {
    subscriptionsRef.current.add(subscription);
    
    if (enableLogging) {
      logger.debug('Subscription tracked', { 
        componentName, 
        activeSubscriptions: subscriptionsRef.current.size 
      }, 'MemoryLeakPrevention');
    }
  }, [componentName, enableLogging]);

  // Clear timeout with tracking
  const safeClearTimeout = useCallback((timeout: number) => {
    clearTimeout(timeout);
    timeoutsRef.current.delete(timeout);
  }, []);

  // Clear interval with tracking
  const safeClearInterval = useCallback((interval: number) => {
    clearInterval(interval);
    intervalsRef.current.delete(interval);
  }, []);

  // Remove event listener with tracking
  const safeRemoveEventListener = useCallback((
    element: EventTarget,
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions | boolean
  ) => {
    element.removeEventListener(type, listener, options);
    
    eventListenersRef.current = eventListenersRef.current.filter(
      item => !(item.element === element && item.type === type && item.listener === listener)
    );
  }, []);

  // Memory usage check
  const checkMemoryUsage = useCallback(() => {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in window.performance) {
      const memory = (window.performance as any).memory;
      const memoryInfo = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usedPercentage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)
      };

      if (memoryInfo.usedPercentage > 80) {
        logger.warn('High memory usage detected', {
          componentName,
          ...memoryInfo,
          activeTimeouts: timeoutsRef.current.size,
          activeIntervals: intervalsRef.current.size,
          activeListeners: eventListenersRef.current.length,
          activeObservers: observersRef.current.size,
          activeSubscriptions: subscriptionsRef.current.size,
        }, 'MemoryLeakPrevention');
      }

      if (enableLogging) {
        logger.debug('Memory check', { componentName, ...memoryInfo }, 'MemoryLeakPrevention');
      }
    }
  }, [componentName, enableLogging]);

  // Cleanup all resources
  const cleanup = useCallback(() => {
    // Clear timeouts
    timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    timeoutsRef.current.clear();

    // Clear intervals
    intervalsRef.current.forEach(interval => clearInterval(interval));
    intervalsRef.current.clear();

    // Remove event listeners
    eventListenersRef.current.forEach(({ element, type, listener, options }) => {
      try {
        element.removeEventListener(type, listener, options);
      } catch (error) {
        logger.warn('Error removing event listener', { error, type }, 'MemoryLeakPrevention');
      }
    });
    eventListenersRef.current = [];

    // Disconnect observers
    observersRef.current.forEach(observer => {
      try {
        observer.disconnect();
      } catch (error) {
        logger.warn('Error disconnecting observer', { error }, 'MemoryLeakPrevention');
      }
    });
    observersRef.current.clear();

    // Unsubscribe from subscriptions
    subscriptionsRef.current.forEach(subscription => {
      try {
        subscription.unsubscribe();
      } catch (error) {
        logger.warn('Error unsubscribing', { error }, 'MemoryLeakPrevention');
      }
    });
    subscriptionsRef.current.clear();

    // Clear memory check interval
    if (memoryCheckRef.current) {
      clearInterval(memoryCheckRef.current);
      memoryCheckRef.current = null;
    }

    if (enableLogging) {
      logger.info('Component cleanup completed', { componentName }, 'MemoryLeakPrevention');
    }
  }, [componentName, enableLogging]);

  // Set up memory monitoring
  useEffect(() => {
    if (checkIntervalMs > 0) {
      memoryCheckRef.current = setInterval(checkMemoryUsage, checkIntervalMs);
    }

    // Initial memory check
    checkMemoryUsage();

    return () => {
      if (memoryCheckRef.current) {
        clearInterval(memoryCheckRef.current);
      }
    };
  }, [checkMemoryUsage, checkIntervalMs]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    safeSetTimeout,
    safeSetInterval,
    safeAddEventListener,
    safeClearTimeout,
    safeClearInterval,
    safeRemoveEventListener,
    trackObserver,
    trackSubscription,
    cleanup,
    checkMemoryUsage,
    // Status getters
    getActiveResourcesCount: () => ({
      timeouts: timeoutsRef.current.size,
      intervals: intervalsRef.current.size,
      eventListeners: eventListenersRef.current.length,
      observers: observersRef.current.size,
      subscriptions: subscriptionsRef.current.size,
    }),
  };
};
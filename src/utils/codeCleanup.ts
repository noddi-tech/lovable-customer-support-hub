/**
 * Utility functions for code cleanup and optimization
 */

/**
 * Deep clone an object without functions
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T;
  if (typeof obj === "object") {
    const copy = {} as T;
    Object.keys(obj).forEach(key => {
      const value = (obj as any)[key];
      if (typeof value !== "function") {
        (copy as any)[key] = deepClone(value);
      }
    });
    return copy;
  }
  return obj;
}

/**
 * Throttle function execution
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastExecTime = 0;
  return (...args: Parameters<T>) => {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
}

/**
 * Debounce function execution
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Memory-efficient array operations
 */
export const arrayUtils = {
  chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  },

  unique<T>(array: T[], key?: keyof T): T[] {
    if (!key) return [...new Set(array)];
    const seen = new Set();
    return array.filter(item => {
      const value = item[key];
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  },

  groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const groupKey = String(item[key]);
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }
};

/**
 * Clean up event listeners and timers
 */
export class CleanupManager {
  private cleanupTasks: (() => void)[] = [];

  add(cleanupFn: () => void) {
    this.cleanupTasks.push(cleanupFn);
  }

  addEventListener(
    element: EventTarget,
    event: string,
    listener: EventListener,
    options?: AddEventListenerOptions
  ) {
    element.addEventListener(event, listener, options);
    this.add(() => element.removeEventListener(event, listener, options));
  }

  addTimeout(timeoutId: NodeJS.Timeout) {
    this.add(() => clearTimeout(timeoutId));
  }

  addInterval(intervalId: NodeJS.Timeout) {
    this.add(() => clearInterval(intervalId));
  }

  cleanup() {
    this.cleanupTasks.forEach(task => {
      try {
        task();
      } catch (error) {
        console.warn('Cleanup task failed:', error);
      }
    });
    this.cleanupTasks = [];
  }
}
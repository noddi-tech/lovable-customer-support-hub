/**
 * Centralized debug logging utility
 * All debug output is controlled by VITE_UI_PROBE environment variable
 */

const isDebugEnabled = () => import.meta.env.VITE_UI_PROBE === '1';

export const debug = {
  log: (message: string, data?: any) => {
    if (!isDebugEnabled()) return;
    console.log(message, data);
  },
  
  group: (label: string, data?: any, collapsed: boolean = true) => {
    if (!isDebugEnabled()) return;
    
    if (collapsed) {
      console.groupCollapsed(label);
    } else {
      console.group(label);
    }
    
    if (data) {
      console.log(data);
    }
  },
  
  groupEnd: () => {
    if (!isDebugEnabled()) return;
    console.groupEnd();
  },
  
  warn: (message: string, data?: any) => {
    if (!isDebugEnabled()) return;
    console.warn(message, data);
  },
  
  // Always show errors regardless of flag
  error: (message: string, data?: any) => {
    console.error(message, data);
  }
};

// Export convenience function for checking if debug is enabled
export const isDebugMode = isDebugEnabled;

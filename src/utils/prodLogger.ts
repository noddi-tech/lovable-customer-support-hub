/**
 * Production-safe logger
 * Only logs debug messages in development mode
 * Always logs warn and error messages
 */

const isDev = import.meta.env.MODE !== 'production';

export const prodLogger = {
  debug: (...args: any[]) => {
    if (isDev) {
      console.log(...args);
    }
  },
  
  info: (...args: any[]) => {
    if (isDev) {
      console.info(...args);
    }
  },
  
  warn: (...args: any[]) => {
    console.warn(...args);
  },
  
  error: (...args: any[]) => {
    console.error(...args);
  }
};

/**
 * Centralized logging utility to replace console.log statements
 * Can be toggled for production environments
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: Date;
  component?: string;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  private createLogEntry(level: LogLevel, message: string, data?: any, component?: string): LogEntry {
    return {
      level,
      message,
      data,
      timestamp: new Date(),
      component
    };
  }

  private addLog(entry: LogEntry) {
    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }
  }

  debug(message: string, data?: any, component?: string) {
    const entry = this.createLogEntry('debug', message, data, component);
    this.addLog(entry);
    
    if (this.isDevelopment) {
      if (data !== undefined) {
        console.log(`[DEBUG] ${component ? `[${component}] ` : ''}${message}`, data);
      } else {
        console.log(`[DEBUG] ${component ? `[${component}] ` : ''}${message}`);
      }
    }
  }

  info(message: string, data?: any, component?: string) {
    const entry = this.createLogEntry('info', message, data, component);
    this.addLog(entry);
    
    if (this.isDevelopment) {
      if (data !== undefined) {
        console.log(`[INFO] ${component ? `[${component}] ` : ''}${message}`, data);
      } else {
        console.log(`[INFO] ${component ? `[${component}] ` : ''}${message}`);
      }
    }
  }

  warn(message: string, data?: any, component?: string) {
    const entry = this.createLogEntry('warn', message, data, component);
    this.addLog(entry);
    
    if (this.isDevelopment) {
      if (data !== undefined) {
        console.warn(`[WARN] ${component ? `[${component}] ` : ''}${message}`, data);
      } else {
        console.warn(`[WARN] ${component ? `[${component}] ` : ''}${message}`);
      }
    }
  }

  error(message: string, data?: any, component?: string) {
    const entry = this.createLogEntry('error', message, data, component);
    this.addLog(entry);
    
    // Always show errors, even in production
    if (data !== undefined) {
      console.error(`[ERROR] ${component ? `[${component}] ` : ''}${message}`, data);
    } else {
      console.error(`[ERROR] ${component ? `[${component}] ` : ''}${message}`);
    }
  }

  // Get recent logs for debugging
  getRecentLogs(count = 50): LogEntry[] {
    return this.logs.slice(0, count);
  }

  // Clear all logs
  clearLogs() {
    this.logs = [];
  }

  // Export logs for debugging
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const logger = new Logger();
/**
 * Centralized logging utility with log levels and smart deduplication
 * Controlled by VITE_LOG_LEVEL environment variable
 */

type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'SILENT';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: Date;
  component?: string;
  count?: number;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private logLevel: LogLevel;
  private lastLogKey: string = '';
  private lastLogCount: number = 0;
  private lastLogTimer: NodeJS.Timeout | null = null;
  
  constructor() {
    // Get log level from environment variable
    const envLevel = import.meta.env.VITE_LOG_LEVEL?.toUpperCase() as LogLevel;
    this.logLevel = envLevel || (this.isDevelopment ? 'INFO' : 'WARN');
  }
  
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['SILENT', 'ERROR', 'WARN', 'INFO', 'DEBUG'];
    const currentIndex = levels.indexOf(this.logLevel);
    const messageIndex = levels.indexOf(level);
    return currentIndex >= messageIndex && currentIndex > 0; // SILENT blocks everything
  }
  
  private getLogKey(message: string, component?: string): string {
    return `${component || 'global'}:${message}`;
  }
  
  private flushDuplicateLog() {
    if (this.lastLogCount > 1) {
      console.log(`↑ Previous message repeated ${this.lastLogCount - 1} more time(s)`);
    }
    this.lastLogKey = '';
    this.lastLogCount = 0;
  }

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
    if (!this.shouldLog('DEBUG')) return;
    
    const entry = this.createLogEntry('DEBUG', message, data, component);
    this.addLog(entry);
    
    const logKey = this.getLogKey(message, component);
    
    // Smart deduplication: only log if different from last message
    if (logKey === this.lastLogKey) {
      this.lastLogCount++;
      
      // Reset timer to flush after 2 seconds of silence
      if (this.lastLogTimer) clearTimeout(this.lastLogTimer);
      this.lastLogTimer = setTimeout(() => this.flushDuplicateLog(), 2000);
      return;
    }
    
    // Flush previous duplicate count
    this.flushDuplicateLog();
    
    // Log new message
    this.lastLogKey = logKey;
    this.lastLogCount = 1;
    
    if (data !== undefined) {
      console.log(`[DEBUG] ${component ? `[${component}] ` : ''}${message}`, data);
    } else {
      console.log(`[DEBUG] ${component ? `[${component}] ` : ''}${message}`);
    }
  }

  info(message: string, data?: any, component?: string) {
    if (!this.shouldLog('INFO')) return;
    
    const entry = this.createLogEntry('INFO', message, data, component);
    this.addLog(entry);
    
    const logKey = this.getLogKey(message, component);
    
    if (logKey === this.lastLogKey) {
      this.lastLogCount++;
      if (this.lastLogTimer) clearTimeout(this.lastLogTimer);
      this.lastLogTimer = setTimeout(() => this.flushDuplicateLog(), 2000);
      return;
    }
    
    this.flushDuplicateLog();
    this.lastLogKey = logKey;
    this.lastLogCount = 1;
    
    if (data !== undefined) {
      console.log(`[INFO] ${component ? `[${component}] ` : ''}${message}`, data);
    } else {
      console.log(`[INFO] ${component ? `[${component}] ` : ''}${message}`);
    }
  }

  warn(message: string, data?: any, component?: string) {
    if (!this.shouldLog('WARN')) return;
    
    const entry = this.createLogEntry('WARN', message, data, component);
    this.addLog(entry);
    
    const logKey = this.getLogKey(message, component);
    
    if (logKey === this.lastLogKey) {
      this.lastLogCount++;
      if (this.lastLogTimer) clearTimeout(this.lastLogTimer);
      this.lastLogTimer = setTimeout(() => this.flushDuplicateLog(), 2000);
      return;
    }
    
    this.flushDuplicateLog();
    this.lastLogKey = logKey;
    this.lastLogCount = 1;
    
    if (data !== undefined) {
      console.warn(`[WARN] ${component ? `[${component}] ` : ''}${message}`, data);
    } else {
      console.warn(`[WARN] ${component ? `[${component}] ` : ''}${message}`);
    }
  }

  error(message: string, data?: any, component?: string) {
    if (!this.shouldLog('ERROR')) return;
    
    const entry = this.createLogEntry('ERROR', message, data, component);
    this.addLog(entry);
    
    // Errors always show (no deduplication for errors)
    this.flushDuplicateLog();
    
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
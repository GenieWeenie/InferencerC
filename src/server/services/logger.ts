import fs from 'fs';
import path from 'path';
import os from 'os';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

/**
 * Logger service for the application
 * Provides structured logging with configurable levels and output destinations
 */
export class Logger {
  private logLevel: LogLevel;
  private logToFile: boolean;
  private logFilePath: string;
  private enabled: boolean;

  /**
   * Creates a new logger instance
   * @param logLevel Minimum level to log (default: INFO)
   * @param logToFile Whether to log to file (default: false)
   * @param logFilePath Path to log file (default: ./logs/app.log)
   * @param enabled Whether logging is enabled (default: true)
   */
  constructor(
    logLevel: LogLevel = LogLevel.INFO,
    logToFile: boolean = false,
    logFilePath: string = path.join(process.cwd(), 'logs', 'app.log'),
    enabled: boolean = true
  ) {
    this.logLevel = logLevel;
    this.logToFile = logToFile;
    this.logFilePath = logFilePath;
    this.enabled = enabled;

    // Create logs directory if it doesn't exist
    if (this.logToFile) {
      const logDir = path.dirname(this.logFilePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
  }

  /**
   * Logs a message at the specified level
   * @param level The log level
   * @param message The message to log
   * @param meta Optional metadata to include
   */
  private log(level: LogLevel, message: string, meta?: unknown): void {
    if (!this.enabled || this.levelToInt(level) < this.levelToInt(this.logLevel)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      meta,
      pid: process.pid,
      hostname: os.hostname()
    };

    const logString = JSON.stringify(logEntry);

    // Output to console
    switch (level) {
      case LogLevel.ERROR:
        console.error(logString);
        break;
      case LogLevel.WARN:
        console.warn(logString);
        break;
      default:
        console.log(logString);
    }

    // Optionally write to file
    if (this.logToFile) {
      try {
        fs.appendFileSync(this.logFilePath, logString + '\n');
      } catch (error) {
        console.error('Failed to write to log file:', error);
      }
    }
  }

  /**
   * Converts log level to integer for comparison
   * @param level The log level
   * @returns Integer representation of the level
   */
  private levelToInt(level: LogLevel): number {
    switch (level) {
      case LogLevel.DEBUG: return 0;
      case LogLevel.INFO: return 1;
      case LogLevel.WARN: return 2;
      case LogLevel.ERROR: return 3;
      default: return 1; // Default to INFO level
    }
  }

  /**
   * Logs a debug message
   * @param message The message to log
   * @param meta Optional metadata to include
   */
  debug(message: string, meta?: unknown): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  /**
   * Logs an info message
   * @param message The message to log
   * @param meta Optional metadata to include
   */
  info(message: string, meta?: unknown): void {
    this.log(LogLevel.INFO, message, meta);
  }

  /**
   * Logs a warning message
   * @param message The message to log
   * @param meta Optional metadata to include
   */
  warn(message: string, meta?: unknown): void {
    this.log(LogLevel.WARN, message, meta);
  }

  /**
   * Logs an error message
   * @param message The message to log
   * @param meta Optional metadata to include
   */
  error(message: string, meta?: unknown): void {
    this.log(LogLevel.ERROR, message, meta);
  }

  /**
   * Updates the log level
   * @param level The new log level
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Enables or disables logging
   * @param enabled Whether logging should be enabled
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

// Create a global logger instance
export const logger = new Logger(LogLevel.INFO, true);

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.Logger = exports.LogLevel = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "DEBUG";
    LogLevel["INFO"] = "INFO";
    LogLevel["WARN"] = "WARN";
    LogLevel["ERROR"] = "ERROR";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
/**
 * Logger service for the application
 * Provides structured logging with configurable levels and output destinations
 */
class Logger {
    logLevel;
    logToFile;
    logFilePath;
    enabled;
    /**
     * Creates a new logger instance
     * @param logLevel Minimum level to log (default: INFO)
     * @param logToFile Whether to log to file (default: false)
     * @param logFilePath Path to log file (default: ./logs/app.log)
     * @param enabled Whether logging is enabled (default: true)
     */
    constructor(logLevel = LogLevel.INFO, logToFile = false, logFilePath = path_1.default.join(process.cwd(), 'logs', 'app.log'), enabled = true) {
        this.logLevel = logLevel;
        this.logToFile = logToFile;
        this.logFilePath = logFilePath;
        this.enabled = enabled;
        // Create logs directory if it doesn't exist
        if (this.logToFile) {
            const logDir = path_1.default.dirname(this.logFilePath);
            if (!fs_1.default.existsSync(logDir)) {
                fs_1.default.mkdirSync(logDir, { recursive: true });
            }
        }
    }
    /**
     * Logs a message at the specified level
     * @param level The log level
     * @param message The message to log
     * @param meta Optional metadata to include
     */
    log(level, message, meta) {
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
            hostname: os_1.default.hostname()
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
                fs_1.default.appendFileSync(this.logFilePath, logString + '\n');
            }
            catch (error) {
                console.error('Failed to write to log file:', error);
            }
        }
    }
    /**
     * Converts log level to integer for comparison
     * @param level The log level
     * @returns Integer representation of the level
     */
    levelToInt(level) {
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
    debug(message, meta) {
        this.log(LogLevel.DEBUG, message, meta);
    }
    /**
     * Logs an info message
     * @param message The message to log
     * @param meta Optional metadata to include
     */
    info(message, meta) {
        this.log(LogLevel.INFO, message, meta);
    }
    /**
     * Logs a warning message
     * @param message The message to log
     * @param meta Optional metadata to include
     */
    warn(message, meta) {
        this.log(LogLevel.WARN, message, meta);
    }
    /**
     * Logs an error message
     * @param message The message to log
     * @param meta Optional metadata to include
     */
    error(message, meta) {
        this.log(LogLevel.ERROR, message, meta);
    }
    /**
     * Updates the log level
     * @param level The new log level
     */
    setLogLevel(level) {
        this.logLevel = level;
    }
    /**
     * Enables or disables logging
     * @param enabled Whether logging should be enabled
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }
}
exports.Logger = Logger;
// Create a global logger instance
exports.logger = new Logger(LogLevel.INFO, true);
//# sourceMappingURL=logger.js.map
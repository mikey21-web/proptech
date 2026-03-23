/**
 * ClickProps Winston Logger Configuration
 * Structured logging for production monitoring
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  service: string;
  [key: string]: unknown;
}

const LOG_LEVEL = (process.env.LOG_LEVEL || 'info') as LogLevel;
const SERVICE_NAME = 'clickprops-crm';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] <= LEVEL_PRIORITY[LOG_LEVEL];
}

function formatLog(level: LogLevel, message: string, meta?: Record<string, unknown>): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    service: SERVICE_NAME,
    ...meta,
  };
}

function writeLog(entry: LogEntry): void {
  const output = JSON.stringify(entry);
  if (entry.level === 'error') {
    console.error(output);
  } else if (entry.level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  error(message: string, meta?: Record<string, unknown>) {
    if (shouldLog('error')) writeLog(formatLog('error', message, meta));
  },
  warn(message: string, meta?: Record<string, unknown>) {
    if (shouldLog('warn')) writeLog(formatLog('warn', message, meta));
  },
  info(message: string, meta?: Record<string, unknown>) {
    if (shouldLog('info')) writeLog(formatLog('info', message, meta));
  },
  debug(message: string, meta?: Record<string, unknown>) {
    if (shouldLog('debug')) writeLog(formatLog('debug', message, meta));
  },
};

export default logger;

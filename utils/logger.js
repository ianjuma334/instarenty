import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(colors);

// Define format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define transports
const transports = [
  // Console transport for development
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }),

  // Error log file
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/error.log'),
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    )
  }),

  // Combined log file
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/combined.log'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    )
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: config.logging.level,
  levels,
  format,
  transports,
});

// Create logs directory if it doesn't exist
import fs from 'fs';
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Export logger methods for easy use
export const logError = (message, meta = {}) => {
  logger.error(message, meta);
};

export const logWarn = (message, meta = {}) => {
  logger.warn(message, meta);
};

export const logInfo = (message, meta = {}) => {
  logger.info(message, meta);
};

export const logHttp = (message, meta = {}) => {
  logger.http(message, meta);
};

export const logDebug = (message, meta = {}) => {
  logger.debug(message, meta);
};

// Morgan stream for HTTP request logging
export const morganStream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

export default logger;
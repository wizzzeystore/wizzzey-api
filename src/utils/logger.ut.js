import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Custom format for detailed logging
const detailedFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}] ${message}`;
    
    // Add request ID if present
    if (meta.requestId) {
      log += ` | RequestID: ${meta.requestId}`;
    }
    
    // Add error location if present
    if (meta.error?.location) {
      const loc = meta.error.location;
      log += ` | Location: ${loc.fileName}:${loc.lineNumber}`;
    }
    
    // Add additional metadata
    if (Object.keys(meta).length > 0) {
      const cleanMeta = { ...meta };
      delete cleanMeta.requestId;
      delete cleanMeta.error;
      if (Object.keys(cleanMeta).length > 0) {
        log += ` | Meta: ${JSON.stringify(cleanMeta, null, 2)}`;
      }
    }
    
    return log;
  })
);

// Simple format for production
const simpleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format with colors
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} ${level} ${message}`;
    
    // Add request ID with color
    if (meta.requestId) {
      log += ` \x1b[36m[${meta.requestId}]\x1b[0m`;
    }
    
    // Add error location with color
    if (meta.error?.location) {
      const loc = meta.error.location;
      log += ` \x1b[33m[${loc.fileName}:${loc.lineNumber}]\x1b[0m`;
    }
    
    // Add method and URL for requests
    if (meta.request?.method && meta.request?.url) {
      log += ` \x1b[35m${meta.request.method} ${meta.request.url}\x1b[0m`;
    }
    
    // Add status code for responses
    if (meta.statusCode) {
      const color = meta.statusCode >= 500 ? '\x1b[31m' : 
                   meta.statusCode >= 400 ? '\x1b[33m' : 
                   meta.statusCode >= 300 ? '\x1b[36m' : '\x1b[32m';
      log += ` ${color}${meta.statusCode}\x1b[0m`;
    }
    
    // Add duration for requests
    if (meta.duration) {
      log += ` \x1b[90m(${meta.duration})\x1b[0m`;
    }
    
    return log;
  })
);

// Create the logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: process.env.NODE_ENV === 'production' ? simpleFormat : detailedFormat,
  defaultMeta: { 
    service: 'wizzzey-api',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    // Console transport with colors
    new winston.transports.Console({
      format: consoleFormat
    }),
    
    // Combined log file
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      format: detailedFormat
    }),
    
    // Error log file
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      format: detailedFormat
    }),
    
    // Request log file
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/requests.log'),
      level: 'info',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      format: detailedFormat,
      filter: (info) => info.type === 'REQUEST_START' || info.type === 'REQUEST_END'
    })
  ]
});

// Create a stream object for Morgan
export const stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

// Enhanced logging methods
export const logRequest = (req, res, duration) => {
  const logData = {
    type: 'REQUEST_END',
    requestId: req.headers['x-request-id'],
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    user: req.user ? req.user.email : 'anonymous',
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent']
  };
  
  if (res.statusCode >= 400) {
    logger.warn('Request completed with error', logData);
  } else {
    logger.info('Request completed successfully', logData);
  }
};

export const logError = (error, req, additionalData = {}) => {
  const logData = {
    type: 'ERROR',
    requestId: req?.headers['x-request-id'],
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code
    },
    request: req ? {
      method: req.method,
      url: req.originalUrl,
      user: req.user ? req.user.email : 'anonymous'
    } : null,
    ...additionalData
  };
  
  logger.error('Error occurred', logData);
};

export default logger; 
import logger from './logger.ut.js';
import path from 'path';

/**
 * Global error handler for async functions
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 */
export const asyncHandler = (fn) => {
  return function(req, res, next) {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error handler
 * @param {Error} error - Validation error
 * @returns {Object} Formatted error response
 */
export const handleValidationError = (error) => {
  const errors = Object.values(error.errors).map(err => ({
    field: err.path,
    message: err.message
  }));
  
  return {
    statusCode: 400,
    message: 'Validation Error',
    meta: {
      errors
    }
  };
};

/**
 * MongoDB duplicate key error handler
 * @param {Error} error - Duplicate key error
 * @returns {Object} Formatted error response
 */
export const handleDuplicateKeyError = (error) => {
  const field = Object.keys(error.keyValue)[0];
  return {
    statusCode: 409,
    message: `Duplicate value for ${field}`,
    meta: {
      field,
      value: error.keyValue[field]
    }
  };
};

// Function to extract error location from stack trace
const extractErrorLocation = (stack) => {
  if (!stack) return null;
  
  const lines = stack.split('\n');
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('at ')) {
      const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
      if (match) {
        const [, functionName, filePath, lineNumber, columnNumber] = match;
        const fileName = path.basename(filePath);
        const relativePath = filePath.includes('wizzzey-api') 
          ? filePath.split('wizzzey-api')[1] 
          : filePath;
        
        return {
          functionName,
          fileName,
          filePath: relativePath,
          lineNumber: parseInt(lineNumber),
          columnNumber: parseInt(columnNumber),
          fullPath: filePath
        };
      }
    }
  }
  return null;
};

// Function to get request context for error logging
const getRequestContext = (req) => {
  return {
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    params: req.params,
    query: req.query,
    body: req.body,
    headers: {
      'user-agent': req.headers['user-agent'],
      'content-type': req.headers['content-type'],
      'authorization': req.headers.authorization ? 'Bearer [REDACTED]' : undefined,
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-real-ip': req.headers['x-real-ip']
    },
    ip: req.ip || req.connection.remoteAddress,
    user: req.user ? {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    } : 'anonymous'
  };
};

export const globalErrorHandler = (err, req, res, next) => {
  // Extract error location
  const errorLocation = extractErrorLocation(err.stack);
  
  // Get request context
  const requestContext = getRequestContext(req);
  
  // Enhanced error details for logging
  const errorDetails = {
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    
    error: {
      name: err.name,
      message: err.message,
      code: err.code,
      statusCode: err.statusCode || 500,
      stack: err.stack,
      location: errorLocation
    },
    
    request: requestContext,
    
    environment: {
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    }
  };

  // Log error with appropriate level
  if (err.statusCode >= 400 && err.statusCode < 500) {
    logger.warn('Client Error:', errorDetails);
  } else {
    logger.error('Server Error:', errorDetails);
  }

  // Add debugging headers (only if headers haven't been sent yet)
  try {
    if (!res.headersSent) {
      res.setHeader('X-Request-ID', errorDetails.requestId);
      if (errorLocation) {
        res.setHeader('X-Error-Location', `${errorLocation.fileName}:${errorLocation.lineNumber}`);
        res.setHeader('X-Error-Function', errorLocation.functionName);
      }
    }
  } catch (error) {
    // Silently ignore header setting errors
    console.warn('Could not set global error response headers:', error.message);
  }

  // Check if response has already been sent
  if (res.headersSent) {
    return;
  }

  // Handle different error types with detailed responses
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      type: 'ERROR',
      message: err.message,
      data: null,
      debug: {
        requestId: errorDetails.requestId,
        errorCode: err.statusCode,
        location: errorLocation ? `${errorLocation.fileName}:${errorLocation.lineNumber}` : null
      }
    });
  }

  if (err.name === 'ValidationError') {
    const validationErrors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
      value: e.value
    }));
    
    return res.status(400).json({
      type: 'ERROR',
      message: 'Validation failed',
      data: {
        errors: validationErrors
      },
      debug: {
        requestId: errorDetails.requestId,
        errorCode: 400,
        location: errorLocation ? `${errorLocation.fileName}:${errorLocation.lineNumber}` : null
      }
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      type: 'ERROR',
      message: 'Invalid token',
      data: null,
      debug: {
        requestId: errorDetails.requestId,
        errorCode: 401,
        location: errorLocation ? `${errorLocation.fileName}:${errorLocation.lineNumber}` : null
      }
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      type: 'ERROR',
      message: 'Token expired',
      data: null,
      debug: {
        requestId: errorDetails.requestId,
        errorCode: 401,
        location: errorLocation ? `${errorLocation.fileName}:${errorLocation.lineNumber}` : null
      }
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      type: 'ERROR',
      message: `Invalid ${err.path} format: ${err.value}`,
      data: null,
      debug: {
        requestId: errorDetails.requestId,
        errorCode: 400,
        location: errorLocation ? `${errorLocation.fileName}:${errorLocation.lineNumber}` : null,
        details: {
          path: err.path,
          value: err.value,
          kind: err.kind
        }
      }
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    
    return res.status(400).json({
      type: 'ERROR',
      message: `Duplicate ${field}: ${value}`,
      data: null,
      debug: {
        requestId: errorDetails.requestId,
        errorCode: 400,
        location: errorLocation ? `${errorLocation.fileName}:${errorLocation.lineNumber}` : null,
        details: {
          duplicateField: field,
          duplicateValue: value
        }
      }
    });
  }

  // Generic server error
  return res.status(500).json({
    type: 'ERROR',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message,
    data: null,
    debug: {
      requestId: errorDetails.requestId,
      errorCode: 500,
      location: errorLocation ? `${errorLocation.fileName}:${errorLocation.lineNumber}` : null,
      ...(process.env.NODE_ENV !== 'production' && {
        stack: err.stack,
        name: err.name,
        code: err.code
      })
    }
  });
};

/**
 * Standard API response format
 */
export class ApiResponse {
  static success(res, message, data = null, statusCode = 200) {
    return res.status(statusCode).json({
      type: 'OK',
      message,
      data
    });
  }

  static error(res, message, statusCode = 500, data = null) {
    return res.status(statusCode).json({
      type: 'ERROR',
      message,
      data
    });
  }

  static validationError(res, errors) {
    return res.status(400).json({
      type: 'ERROR',
      message: 'Validation failed',
      data: {
        errors
      }
    });
  }

  static notFound(res, message = 'Resource not found') {
    return res.status(404).json({
      type: 'ERROR',
      message,
      data: null
    });
  }

  static unauthorized(res, message = 'Unauthorized access') {
    return res.status(401).json({
      type: 'ERROR',
      message,
      data: null
    });
  }

  static forbidden(res, message = 'Forbidden access') {
    return res.status(403).json({
      type: 'ERROR',
      message,
      data: null
    });
  }

  static paginated(res, message, data, pagination) {
    return res.json({
      type: 'OK',
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...pagination
      }
    });
  }
} 
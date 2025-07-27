import logger from '../utils/logger.ut.js';
import path from 'path';

// Function to extract file and line information from stack trace
const extractErrorLocation = (stack) => {
  if (!stack) return null;
  
  const lines = stack.split('\n');
  // Skip the first line (error message) and find the first meaningful stack line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('at ')) {
      // Extract file path and line number
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

// Function to get request context
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

const errorLogger = (err, req, res, next) => {
  // Extract error location
  const errorLocation = extractErrorLocation(err.stack);
  
  // Get request context
  const requestContext = getRequestContext(req);
  
  // Enhanced error details
  const errorDetails = {
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    
    // Error information
    error: {
      name: err.name,
      message: err.message,
      code: err.code,
      statusCode: err.statusCode || 500,
      stack: err.stack,
      location: errorLocation
    },
    
    // Request context
    request: requestContext,
    
    // Environment info
    environment: {
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    }
  };

  // Log error with different levels based on error type
  if (err.statusCode >= 400 && err.statusCode < 500) {
    logger.warn('Client Error:', errorDetails);
  } else {
    logger.error('Server Error:', errorDetails);
  }

  // Add request ID to response headers for debugging (only if headers haven't been sent yet)
  try {
    if (!res.headersSent) {
      res.setHeader('X-Request-ID', errorDetails.requestId);
      res.setHeader('X-Error-Location', errorLocation ? `${errorLocation.fileName}:${errorLocation.lineNumber}` : 'unknown');
    }
  } catch (error) {
    // Silently ignore header setting errors
    console.warn('Could not set error response headers:', error.message);
  }

  // Pass to next error handler
  next(err);
};

export default errorLogger; 
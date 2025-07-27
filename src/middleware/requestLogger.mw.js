import morgan from 'morgan';
import { stream } from '../utils/logger.ut.js';

// Custom token for request body (truncated for security)
morgan.token('body', (req) => {
  if (!req.body || Object.keys(req.body).length === 0) return '';
  
  // Remove sensitive fields
  const sanitizedBody = { ...req.body };
  delete sanitizedBody.password;
  delete sanitizedBody.token;
  delete sanitizedBody.authorization;
  
  const bodyStr = JSON.stringify(sanitizedBody);
  return bodyStr.length > 500 ? bodyStr.substring(0, 500) + '...' : bodyStr;
});

// Custom token for response body (truncated)
morgan.token('response-body', (req, res) => {
  if (res.locals.responseBody) {
    const responseStr = JSON.stringify(res.locals.responseBody);
    return responseStr.length > 300 ? responseStr.substring(0, 300) + '...' : responseStr;
  }
  return '';
});

// Custom token for user info
morgan.token('user', (req) => {
  if (req.user) {
    return `${req.user.email || req.user.id} (${req.user.role || 'user'})`;
  }
  return 'anonymous';
});

// Custom token for request duration with color coding
morgan.token('response-time-ms', (req, res) => {
  if (!res._header || !req._startAt) return '';
  const diff = process.hrtime(req._startAt);
  const ms = diff[0] * 1e3 + diff[1] * 1e-6;
  return ms.toFixed(2);
});

// Custom token for request ID
morgan.token('request-id', (req) => {
  return req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
});

// Custom token for query parameters
morgan.token('query', (req) => {
  if (!req.query || Object.keys(req.query).length === 0) return '';
  return JSON.stringify(req.query);
});

// Custom token for request parameters
morgan.token('params', (req) => {
  if (!req.params || Object.keys(req.params).length === 0) return '';
  return JSON.stringify(req.params);
});

// Custom token for status code with color
morgan.token('status-colored', (req, res) => {
  const status = res.statusCode;
  let color = '\x1b[0m'; // Reset
  
  if (status >= 500) color = '\x1b[31m'; // Red for server errors
  else if (status >= 400) color = '\x1b[33m'; // Yellow for client errors
  else if (status >= 300) color = '\x1b[36m'; // Cyan for redirects
  else if (status >= 200) color = '\x1b[32m'; // Green for success
  
  return `${color}${status}\x1b[0m`;
});

// Custom token for method with color
morgan.token('method-colored', (req) => {
  const method = req.method;
  let color = '\x1b[0m'; // Reset
  
  switch (method) {
    case 'GET': color = '\x1b[32m'; break; // Green
    case 'POST': color = '\x1b[33m'; break; // Yellow
    case 'PUT': color = '\x1b[34m'; break; // Blue
    case 'DELETE': color = '\x1b[31m'; break; // Red
    case 'PATCH': color = '\x1b[35m'; break; // Magenta
  }
  
  return `${color}${method}\x1b[0m`;
});

// Create enhanced format for detailed logging
const detailedFormat = ':request-id | :method-colored :url | :status-colored | :response-time-ms ms | :user | :query | :params | :body';

// Create simplified format for production
const simpleFormat = ':method-colored :url | :status-colored | :response-time-ms ms | :user';

// Create the middleware with environment-based format
const requestLogger = (req, res, next) => {
  // Generate request ID if not present
  if (!req.headers['x-request-id']) {
    req.headers['x-request-id'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Add request start time
  req._startAt = process.hrtime();
  
  // Log request start
  const startLog = {
    type: 'REQUEST_START',
    requestId: req.headers['x-request-id'],
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    query: req.query,
    params: req.params,
    body: req.body,
    headers: {
      'user-agent': req.headers['user-agent'],
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length'],
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
  
  // Use morgan for the main logging
  const morganMiddleware = morgan(
    process.env.NODE_ENV === 'production' ? simpleFormat : detailedFormat,
    { stream }
  );
  
  // Override res.end to capture response details
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const endTime = process.hrtime(req._startAt);
    const duration = (endTime[0] * 1e3 + endTime[1] * 1e-6).toFixed(2);
    
    // Log request completion
    const endLog = {
      type: 'REQUEST_END',
      requestId: req.headers['x-request-id'],
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length') || 0,
      user: req.user ? {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role
      } : 'anonymous'
    };
    
    // Add response headers for debugging (only if headers haven't been sent yet)
    try {
      if (!res.headersSent) {
        res.setHeader('X-Request-ID', req.headers['x-request-id']);
        res.setHeader('X-Response-Time', `${duration}ms`);
      }
    } catch (error) {
      // Silently ignore header setting errors
      console.warn('Could not set response headers:', error.message);
    }
    
    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };
  
  return morganMiddleware(req, res, next);
};

export default requestLogger;
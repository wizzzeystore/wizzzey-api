import logger from '../utils/logger.ut.js';

const errorLogger = (err, req, res, next) => {
  const errorDetails = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    headers: req.headers,
    body: req.body,
    user: req.user ? {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    } : 'anonymous',
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name,
      code: err.code
    }
  };

  // Log the error
  logger.error('Error occurred:', errorDetails);

  // Pass to next error handler
  next(err);
};

export default errorLogger; 
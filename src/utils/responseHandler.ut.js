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

/**
 * Global error handler middleware
 */
export const globalErrorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      type: 'ERROR',
      message: err.message,
      data: null
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      type: 'ERROR',
      message: 'Validation failed',
      data: {
        errors: Object.values(err.errors).map(e => e.message)
      }
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      type: 'ERROR',
      message: 'Invalid token',
      data: null
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      type: 'ERROR',
      message: 'Token expired',
      data: null
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      type: 'ERROR',
      message: 'Invalid ID format',
      data: null
    });
  }

  if (err.code === 11000) {
    return res.status(400).json({
      type: 'ERROR',
      message: 'Duplicate field value entered',
      data: null
    });
  }

  return res.status(500).json({
    type: 'ERROR',
    message: 'Something went wrong!',
    data: null
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
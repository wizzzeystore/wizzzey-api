import express from 'express';
import requestLogger from './src/middleware/requestLogger.mw.js';
import errorLogger from './src/middleware/errorLogger.mw.js';
import { globalErrorHandler, asyncHandler } from './src/utils/responseHandler.ut.js';
import logger from './src/utils/logger.ut.js';

const app = express();
const PORT = 5001;

// Middleware
app.use(express.json());
app.use(requestLogger);
app.use(errorLogger);

// Test routes to demonstrate enhanced logging
app.get('/test/success', (req, res) => {
  res.json({ message: 'Success test', timestamp: new Date().toISOString() });
});

app.get('/test/client-error', (req, res) => {
  const error = new Error('Client error test');
  error.statusCode = 400;
  throw error;
});

app.get('/test/server-error', asyncHandler(async (req, res) => {
  // Simulate a server error
  throw new Error('Server error test');
}));

app.get('/test/validation-error', asyncHandler(async (req, res) => {
  // Simulate a validation error
  const validationError = new Error('Validation failed');
  validationError.name = 'ValidationError';
  validationError.errors = {
    email: { path: 'email', message: 'Invalid email format', value: 'invalid-email' },
    password: { path: 'password', message: 'Password too short', value: '123' }
  };
  throw validationError;
}));

app.get('/test/database-error', asyncHandler(async (req, res) => {
  // Simulate a database error
  const dbError = new Error('Cast to ObjectId failed');
  dbError.name = 'CastError';
  dbError.path = '_id';
  dbError.value = 'invalid-id';
  dbError.kind = 'ObjectId';
  throw dbError;
}));

app.get('/test/duplicate-error', asyncHandler(async (req, res) => {
  // Simulate a duplicate key error
  const duplicateError = new Error('Duplicate key error');
  duplicateError.code = 11000;
  duplicateError.keyValue = { email: 'test@example.com' };
  throw duplicateError;
}));

app.get('/test/async-error', asyncHandler(async (req, res) => {
  // Simulate an async error
  await new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('Async operation failed'));
    }, 100);
  });
}));

// Global error handler
app.use(globalErrorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Enhanced logging test server running on port ${PORT}`);
  logger.info('Available test endpoints:');
  logger.info('  GET /test/success - Success response');
  logger.info('  GET /test/client-error - Client error (400)');
  logger.info('  GET /test/server-error - Server error (500)');
  logger.info('  GET /test/validation-error - Validation error');
  logger.info('  GET /test/database-error - Database error');
  logger.info('  GET /test/duplicate-error - Duplicate key error');
  logger.info('  GET /test/async-error - Async error');
});

export default app; 
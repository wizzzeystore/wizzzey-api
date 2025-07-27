# Enhanced Error Handling and Logging System

## Overview

The Wizzzey API now features a comprehensive error handling and logging system that provides detailed debugging information including file names, line numbers, exact error details, and request context.

## Features

### 🔍 **Detailed Error Location**
- **File Name**: Exact file where error occurred
- **Line Number**: Precise line number in the file
- **Function Name**: Function where error originated
- **Column Number**: Character position in the line
- **Full Stack Trace**: Complete error stack with parsed locations

### 📊 **Enhanced Request Logging**
- **Request ID**: Unique identifier for each request
- **Method & URL**: HTTP method and full URL
- **Query Parameters**: All query parameters
- **Request Body**: Sanitized request body (sensitive data removed)
- **User Context**: Authenticated user information
- **Performance Metrics**: Request duration and response size
- **IP Address**: Client IP address
- **User Agent**: Browser/client information

### 🎨 **Color-Coded Console Output**
- **Green**: Successful requests (2xx)
- **Yellow**: Client errors (4xx)
- **Red**: Server errors (5xx)
- **Cyan**: Redirects (3xx)
- **Blue**: PUT requests
- **Magenta**: PATCH requests

### 📁 **Structured Log Files**
- **combined.log**: All logs
- **error.log**: Only error logs
- **requests.log**: Only request logs
- **Console**: Colored, formatted output

## Error Response Format

### Standard Error Response
```json
{
  "type": "ERROR",
  "message": "Error description",
  "data": null,
  "debug": {
    "requestId": "req_1703123456789_abc123def",
    "errorCode": 400,
    "location": "product.ct.js:45",
    "details": {
      // Additional error-specific details
    }
  }
}
```

### Response Headers
- `X-Request-ID`: Unique request identifier
- `X-Error-Location`: File and line where error occurred
- `X-Error-Function`: Function name where error originated
- `X-Response-Time`: Request duration in milliseconds

## Error Types Handled

### 1. **Validation Errors** (400)
```json
{
  "type": "ERROR",
  "message": "Validation failed",
  "data": {
    "errors": [
      {
        "field": "email",
        "message": "Invalid email format",
        "value": "invalid-email"
      }
    ]
  },
  "debug": {
    "requestId": "req_1703123456789_abc123def",
    "errorCode": 400,
    "location": "user.ct.js:23"
  }
}
```

### 2. **Cast Errors** (400)
```json
{
  "type": "ERROR",
  "message": "Invalid _id format: invalid-id",
  "data": null,
  "debug": {
    "requestId": "req_1703123456789_abc123def",
    "errorCode": 400,
    "location": "product.ct.js:67",
    "details": {
      "path": "_id",
      "value": "invalid-id",
      "kind": "ObjectId"
    }
  }
}
```

### 3. **Duplicate Key Errors** (400)
```json
{
  "type": "ERROR",
  "message": "Duplicate email: test@example.com",
  "data": null,
  "debug": {
    "requestId": "req_1703123456789_abc123def",
    "errorCode": 400,
    "location": "user.ct.js:89",
    "details": {
      "duplicateField": "email",
      "duplicateValue": "test@example.com"
    }
  }
}
```

### 4. **JWT Errors** (401)
```json
{
  "type": "ERROR",
  "message": "Invalid token",
  "data": null,
  "debug": {
    "requestId": "req_1703123456789_abc123def",
    "errorCode": 401,
    "location": "auth.mw.js:12"
  }
}
```

### 5. **Server Errors** (500)
```json
{
  "type": "ERROR",
  "message": "Database connection failed",
  "data": null,
  "debug": {
    "requestId": "req_1703123456789_abc123def",
    "errorCode": 500,
    "location": "db.js:34",
    "stack": "Error: Database connection failed\n    at connect (db.js:34:15)\n    ...",
    "name": "ConnectionError",
    "code": "ECONNREFUSED"
  }
}
```

## Log Output Examples

### Console Output (Development)
```
12:34:56.789 info  Request completed successfully [req_1703123456789_abc123def] [product.ct.js:45] GET /api/products 200 (45.23ms)
12:34:57.123 error Server Error [req_1703123456789_def456ghi] [user.ct.js:67] POST /api/users 500 (123.45ms)
```

### File Output (Development)
```
2024-12-21 12:34:56.789 [INFO] Request completed successfully | RequestID: req_1703123456789_abc123def | Location: product.ct.js:45 | Meta: {
  "type": "REQUEST_END",
  "method": "GET",
  "url": "/api/products",
  "statusCode": 200,
  "duration": "45.23ms",
  "user": "admin@wizzzey.com"
}
```

### File Output (Production)
```json
{
  "timestamp": "2024-12-21 12:34:56.789",
  "level": "info",
  "message": "Request completed successfully",
  "service": "wizzzey-api",
  "version": "1.0.0",
  "requestId": "req_1703123456789_abc123def",
  "method": "GET",
  "url": "/api/products",
  "statusCode": 200,
  "duration": "45.23ms"
}
```

## Usage Examples

### 1. **Using asyncHandler for Error Handling**
```javascript
import { asyncHandler } from '../utils/responseHandler.ut.js';

export const getProducts = asyncHandler(async (req, res) => {
  const products = await Product.find();
  res.json({ products });
});
```

### 2. **Custom Error with Status Code**
```javascript
import { ApiError } from '../utils/responseHandler.ut.js';

export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    throw new ApiError('Product not found', 404);
  }
  res.json({ product });
});
```

### 3. **Manual Error Logging**
```javascript
import { logError } from '../utils/logger.ut.js';

try {
  // Some operation
} catch (error) {
  logError(error, req, { operation: 'product-creation' });
  throw error;
}
```

## Configuration

### Environment Variables
- `NODE_ENV`: Controls log level and format
  - `development`: Detailed logs with colors
  - `production`: JSON logs, minimal details

### Log Files
- **Location**: `wizzzey-api/logs/`
- **Rotation**: 10MB max size, 10 files max
- **Retention**: Automatic cleanup of old files

### Log Levels
- **error**: Errors and exceptions
- **warn**: Client errors (4xx)
- **info**: Successful requests and general info
- **debug**: Detailed debugging (development only)

## Testing the Enhanced Logging

Run the test server to see the enhanced logging in action:

```bash
cd wizzzey-api
node test-enhanced-logging.js
```

Then test the endpoints:
```bash
# Success
curl http://localhost:5001/test/success

# Client error
curl http://localhost:5001/test/client-error

# Server error
curl http://localhost:5001/test/server-error

# Validation error
curl http://localhost:5001/test/validation-error

# Database error
curl http://localhost:5001/test/database-error

# Duplicate error
curl http://localhost:5001/test/duplicate-error

# Async error
curl http://localhost:5001/test/async-error
```

## Benefits

### 🚀 **Faster Debugging**
- Immediate identification of error location
- Detailed context for each error
- Request tracing with unique IDs

### 🔒 **Security**
- Sensitive data automatically redacted
- Authorization tokens hidden in logs
- Sanitized request bodies

### 📈 **Performance Monitoring**
- Request duration tracking
- Response size monitoring
- Memory usage tracking

### 🎯 **Production Ready**
- Environment-specific configurations
- Log rotation and cleanup
- Structured JSON logging for production

## Integration with Existing Code

The enhanced logging system is automatically integrated with:
- All Express routes
- Database operations
- Authentication middleware
- File uploads
- API responses

No changes to existing controller code are required - the system works transparently in the background. 
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './src/utils/logger.ut.js';
import requestLogger from './src/middleware/requestLogger.mw.js';
import errorLogger from './src/middleware/errorLogger.mw.js';
import connectDB from './src/config/db.js';
// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the correct path
dotenv.config({ path: path.join(__dirname, '.env') });

// Load Swagger document
const swaggerDocument = YAML.load(path.join(__dirname, 'src/docs/swagger.yaml'));

// Create Express app
const app = express();

// Increase event listener limit
process.setMaxListeners(20);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use(requestLogger);

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
logger.info('API Documentation available at /api-docs');

// serve images from the uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import routes
// Authentication and User Management
import authRoutes from './src/routes/auth.rt.js';
import userRoutes from './src/routes/user.rt.js';

// Product Management
import productRoutes from './src/routes/product.rt.js';
import categoryRoutes from './src/routes/category.rt.js';
import brandRoutes from './src/routes/brand.rt.js';
import inventoryRoutes from './src/routes/inventory.rt.js';

// Order and Sales
import orderRoutes from './src/routes/order.rt.js';
import discountCodeRoutes from './src/routes/discountCode.rt.js';
import dashboardRoutes from './src/routes/dashboard.rt.js';

// Content Management
import blogPostRoutes from './src/routes/blogPost.rt.js';
import faqRoutes from './src/routes/faq.rt.js';

// System Management
import notificationRoutes from './src/routes/notification.rt.js';
import appSettingsRoutes from './src/routes/appSettings.rt.js';
import activityLogRoutes from './src/routes/activityLog.rt.js';

// Use routes
// Authentication and User Management
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Product Management
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/inventory', inventoryRoutes);

// Order and Sales
app.use('/api/orders', orderRoutes);
app.use('/api/discount-codes', discountCodeRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Content Management
app.use('/api/blog-posts', blogPostRoutes);
app.use('/api/faqs', faqRoutes);

// System Management
app.use('/api/notifications', notificationRoutes);
app.use('/api/app-settings', appSettingsRoutes);
app.use('/api/activity-logs', activityLogRoutes);

// Error logging middleware
app.use(errorLogger);

// Error handling middleware
app.use((err, req, res, next) => {
  // Log the error
  logger.error('Error:', err);

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      type: 'VALIDATION_ERROR',
      message: err.message,
      data: null
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      type: 'UNAUTHORIZED',
      message: 'Invalid token or unauthorized access',
      data: null
    });
  }

  if (err.name === 'NotFoundError') {
    return res.status(404).json({
      type: 'NOT_FOUND',
      message: err.message,
      data: null
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    type: 'ERROR',
    message: err.message || 'Something went wrong!',
    data: null
  });
});

// Start server function
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
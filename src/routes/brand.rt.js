import express from 'express';
import * as brandController from '../controllers/brand.ct.js';
import { verifyToken } from '../middleware/auth.mw.js';
import { upload, compressFiles } from '../middleware/fileUpload.mw.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// Brand CRUD operations
router.get('/', brandController.getBrands);
router.get('/:id', brandController.getBrand);
router.post('/', upload.single('logo'), compressFiles, brandController.createBrand);
router.put('/:id', upload.single('logo'), compressFiles, brandController.updateBrand);
router.delete('/:id', brandController.deleteBrand);

// Order placed management
router.post('/:id/orders', brandController.addOrderPlaced);
router.put('/:brandId/orders/:orderId', brandController.updateOrderPlacedStatus);

// Out of stock orders management
router.post('/:id/out-of-stock', brandController.addOutOfStockOrder);
router.put('/:brandId/out-of-stock/:orderId', brandController.updateOutOfStockOrderStatus);

export default router; 
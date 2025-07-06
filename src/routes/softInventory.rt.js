import express from 'express';
import {
  getSoftInventoryItems,
  getSoftInventoryItemById,
  createSoftInventoryItem,
  updateSoftInventoryItem,
  deleteSoftInventoryItem,
  getLowStockItems,
  getOutOfStockItems,
  bulkUpdateQuantities
} from '../controllers/softInventory.ct.js';
import { verifyToken } from '../middleware/auth.mw.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// GET /api/soft-inventory - Get all soft inventory items with filters
router.get('/', getSoftInventoryItems);

// GET /api/soft-inventory/low-stock - Get low stock items
router.get('/low-stock', getLowStockItems);

// GET /api/soft-inventory/out-of-stock - Get out of stock items
router.get('/out-of-stock', getOutOfStockItems);

// GET /api/soft-inventory/:id - Get a single soft inventory item
router.get('/:id', getSoftInventoryItemById);

// POST /api/soft-inventory - Create a new soft inventory item
router.post('/', createSoftInventoryItem);

// PUT /api/soft-inventory/:id - Update a soft inventory item
router.put('/:id', updateSoftInventoryItem);

// DELETE /api/soft-inventory - Delete a soft inventory item
router.delete('/', deleteSoftInventoryItem);

// POST /api/soft-inventory/bulk-update - Bulk update quantities
router.post('/bulk-update', bulkUpdateQuantities);

export default router; 
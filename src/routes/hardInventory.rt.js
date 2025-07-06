import express from 'express';
import {
  getHardInventoryItems,
  getHardInventoryItemById,
  createHardInventoryItem,
  updateHardInventoryItem,
  deleteHardInventoryItem,
  getItemsByPlatform,
  getLowStockByPlatform,
  getOutOfStockByPlatform,
  bulkUpdateQuantities,
  syncPlatformData
} from '../controllers/hardInventory.ct.js';
import { verifyToken } from '../middleware/auth.mw.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// GET /api/hard-inventory - Get all hard inventory items with filters
router.get('/', getHardInventoryItems);

// GET /api/hard-inventory/platform/:platform - Get items by platform
router.get('/platform/:platform', getItemsByPlatform);

// GET /api/hard-inventory/platform/:platform/low-stock - Get low stock items by platform
router.get('/platform/:platform/low-stock', getLowStockByPlatform);

// GET /api/hard-inventory/platform/:platform/out-of-stock - Get out of stock items by platform
router.get('/platform/:platform/out-of-stock', getOutOfStockByPlatform);

// GET /api/hard-inventory/:id - Get a single hard inventory item
router.get('/:id', getHardInventoryItemById);

// POST /api/hard-inventory - Create a new hard inventory item
router.post('/', createHardInventoryItem);

// PUT /api/hard-inventory/:id - Update a hard inventory item
router.put('/:id', updateHardInventoryItem);

// DELETE /api/hard-inventory - Delete a hard inventory item
router.delete('/', deleteHardInventoryItem);

// POST /api/hard-inventory/bulk-update - Bulk update quantities
router.post('/bulk-update', bulkUpdateQuantities);

// POST /api/hard-inventory/platform/:platform/sync - Sync platform data
router.post('/platform/:platform/sync', syncPlatformData);

export default router; 
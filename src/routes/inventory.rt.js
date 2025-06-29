import express from 'express';
import * as inventoryController from '../controllers/inventory.ct.js';
import { verifyToken } from '../middleware/auth.mw.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// Get inventory summary
router.get('/summary', inventoryController.getInventorySummary);

// Get all inventory items
router.get('/', inventoryController.getInventoryItems);

// Get a single inventory item
router.get('/:id', inventoryController.getInventoryItem);

// Create a new inventory item
router.post('/', inventoryController.createInventoryItem);

// Update an inventory item
router.put('/:id', inventoryController.updateInventoryItem);

// Delete an inventory item
router.delete('/:id', inventoryController.deleteInventoryItem);

export default router; 
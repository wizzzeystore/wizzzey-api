import express from 'express';
const router = express.Router();
import * as orderController from '../controllers/order.ct.js';
import { verifyToken } from '../middleware/auth.mw.js';
import { upload, compressFiles } from '../middleware/fileUpload.mw.js';

// GET all orders
router.get('/', orderController.getAllOrders);

// GET orders by current user ID
router.get('/my-orders', verifyToken, orderController.getOrdersByUserId);

// GET today's orders
router.get('/today', orderController.getTodayOrders);

// GET a single order by ID
router.get('/:id', orderController.getOrderById);

// CREATE a new order
router.post('/', verifyToken, upload.array('files', 10), compressFiles, orderController.createOrder);

// UPDATE an order by ID
router.put('/:id', verifyToken, orderController.updateOrder);

// DELETE an order by ID
router.delete('/:id', verifyToken, orderController.deleteOrder);

export default router;
import express from 'express';
import { 
  getProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct 
} from '../controllers/product.ct.js';
import { verifyToken, authorize } from '../middleware/auth.mw.js';
import { upload, compressFiles } from '../middleware/fileUpload.mw.js';

const router = express.Router();

// Public routes
router.get('/', getProducts);

// Protected routes (admin only)
// CREATE a new product
router.post('/', upload.array('files', 10), compressFiles, createProduct);

// UPDATE a product
router.put('/', verifyToken, upload.array('files', 10), compressFiles, updateProduct);
router.delete('/', verifyToken, authorize('Admin'), deleteProduct);

export default router;
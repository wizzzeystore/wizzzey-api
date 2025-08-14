import express from 'express';
import { 
  getVariantsByProduct, 
  getVariantsByColor, 
  getDefaultVariant, 
  createVariant, 
  updateVariant, 
  deleteVariant, 
  getVariants 
} from '../controllers/productVariant.ct.js';
import { upload } from '../middleware/fileUpload.mw.js';
import { verifyToken } from '../middleware/auth.mw.js';

const router = express.Router();

// Get variants by product ID
router.get('/by-product', getVariantsByProduct);

// Get variants by color
router.get('/by-color', getVariantsByColor);

// Get default variant
router.get('/default', getDefaultVariant);

// Get all variants with pagination
router.get('/', getVariants);

// Create a new variant (requires authentication)
router.post('/', verifyToken, upload.array('files', 10), createVariant);

// Update a variant (requires authentication)
router.put('/', verifyToken, upload.array('files', 10), updateVariant);

// Delete a variant (requires authentication)
router.delete('/', verifyToken, deleteVariant);

export default router; 
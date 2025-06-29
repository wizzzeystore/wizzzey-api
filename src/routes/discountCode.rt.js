import express from 'express';
import {
  createDiscountCode,
  getDiscountCodes,
  updateDiscountCode,
  deleteDiscountCode,
} from '../controllers/discountCode.ct.js';
const router = express.Router();

// GET discount codes with filters
router.get('/', getDiscountCodes);

// CREATE a new discount code
router.post('/', createDiscountCode);

// UPDATE a discount code by ID
router.put('/:id', updateDiscountCode);

// DELETE a discount code by ID
router.delete('/:id', deleteDiscountCode);

export default router; 
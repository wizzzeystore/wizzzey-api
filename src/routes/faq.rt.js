import express from 'express';
import { 
  getAllFAQs, 
  createFAQ, 
  updateFAQ, 
  deleteFAQ 
} from '../controllers/faq.ct.js';
import { verifyToken, authorize } from '../middleware/auth.mw.js';

const router = express.Router();

// Public routes
router.get('/', getAllFAQs);

// Protected routes (admin only)
router.post('/', verifyToken, authorize('Admin'), createFAQ);
router.put('/:id', verifyToken, authorize('Admin'), updateFAQ);
router.delete('/:id', verifyToken, authorize('Admin'), deleteFAQ);

export default router; 
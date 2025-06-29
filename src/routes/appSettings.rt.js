import express from 'express';
import { 
  getAppSettings, 
  createAppSettings, 
  updateAppSettings, 
  deleteAppSettings,
  generateApiKey
} from '../controllers/appSettings.ct.js';
import { verifyToken, authorize } from '../middleware/auth.mw.js';

const router = express.Router();

// Public routes (only for public settings)
router.get('/', getAppSettings);

// Protected routes (admin only)
router.post('/', verifyToken, authorize('Admin'), createAppSettings);
router.put('/:id', verifyToken, authorize('Admin'), updateAppSettings);
router.delete('/:id', verifyToken, authorize('Admin'), deleteAppSettings);
router.post('/generate-api-key', verifyToken, authorize('Admin'), generateApiKey);

export default router; 
import express from 'express';
import {
  getAppSettings, 
  createAppSettings, 
  updateAppSettings, 
  deleteAppSettings,
  generateApiKey,
  uploadStoreLogo,
  uploadHeroImage,
  uploadFooterImage,
  uploadHeroImageMobile,
  uploadFooterImageMobile,
  deleteStoreLogo,
  deleteHeroImage,
  deleteFooterImage
} from '../controllers/appSettings.ct.js';
import { verifyToken, authorize } from '../middleware/auth.mw.js';
import { upload } from '../middleware/fileUpload.mw.js';

const router = express.Router();

// Public routes (only for public settings)
router.get('/', getAppSettings);

// Protected routes (admin only)
router.post('/', verifyToken, authorize('Admin'), createAppSettings);
router.put('/', verifyToken, authorize('Admin'), updateAppSettings);
router.post('/generate-api-key', verifyToken, authorize('Admin'), generateApiKey);

// File upload routes (admin only) - these must come before parameter routes
router.post('/upload/logo', verifyToken, authorize('Admin'), upload.single('logo'), uploadStoreLogo);
router.post('/upload/hero', verifyToken, authorize('Admin'), upload.single('hero'), uploadHeroImage);
router.post('/upload/footer', verifyToken, authorize('Admin'), upload.single('footer'), uploadFooterImage);
router.post('/upload/hero-mobile', verifyToken, authorize('Admin'), upload.single('heroMobile'), uploadHeroImageMobile);
router.post('/upload/footer-mobile', verifyToken, authorize('Admin'), upload.single('footerMobile'), uploadFooterImageMobile);
router.delete('/logo', verifyToken, authorize('Admin'), deleteStoreLogo);
router.delete('/hero', verifyToken, authorize('Admin'), deleteHeroImage);
router.delete('/footer', verifyToken, authorize('Admin'), deleteFooterImage);

// Parameter routes (must come after specific routes)
router.delete('/:id', verifyToken, authorize('Admin'), deleteAppSettings);

export default router; 
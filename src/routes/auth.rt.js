import express from 'express';
import { 
  register,
  login,
  forgotPassword,
  resetPassword,
  verifyEmail,
  getProfile,
  updateProfile,
  changePassword
} from '../controllers/auth.ct.js';
import { verifyToken } from '../middleware/auth.mw.js';
import { asyncHandler } from '../utils/responseHandler.ut.js';

const router = express.Router();

// Public routes
router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.post('/forgot-password', asyncHandler(forgotPassword));
router.post('/reset-password/:token', asyncHandler(resetPassword));
router.get('/verify-email/:token', asyncHandler(verifyEmail));

// Protected routes
router.use(verifyToken);
router.get('/profile', verifyToken, getProfile);
router.put('/profile', verifyToken, updateProfile);
router.put('/change-password', verifyToken, changePassword);

export default router; 
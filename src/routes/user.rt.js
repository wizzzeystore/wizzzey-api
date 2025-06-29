import express from 'express';
import { 
  createUser, 
  updateUser, 
  deleteUser,
  updateOwnProfile, 
  getAllUsers
} from '../controllers/user.ct.js';
import { verifyToken, authorize } from '../middleware/auth.mw.js';
import { asyncHandler } from '../utils/responseHandler.ut.js';

const router = express.Router();

// User can update their own profile (no admin role required)
router.put('/profile', verifyToken, asyncHandler(updateOwnProfile));

// Admin-only routes
router.use(verifyToken);
router.get('/', authorize('Admin'), asyncHandler(getAllUsers));
router.post('/', authorize('Admin'), asyncHandler(createUser));
router.put('/:id', authorize('Admin'), asyncHandler(updateUser));
router.delete('/:id', authorize('Admin'), asyncHandler(deleteUser));

export default router;

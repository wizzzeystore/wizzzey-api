import express from 'express';
import { 
  createUser, 
  updateUser, 
  deleteUser,
  updateOwnProfile, 
  getAllUsers,
  getUsers,
  getUserStats,
  getUsersByRole,
  toggleUserStatus
} from '../controllers/user.ct.js';
import { verifyToken, authorize, requirePermission, updateLastLogin } from '../middleware/auth.mw.js';
import { asyncHandler } from '../utils/responseHandler.ut.js';

const router = express.Router();

// Apply last login update to all authenticated routes
router.use(verifyToken, updateLastLogin);

// User can update their own profile (no admin role required)
router.put('/profile', asyncHandler(updateOwnProfile));

// Get user statistics (Admin and Moderator only)
router.get('/stats', authorize(['Admin', 'Moderator']), asyncHandler(getUserStats));

// Get users by role
router.get('/role/:role', authorize(['Admin', 'Moderator']), asyncHandler(getUsersByRole));

// Toggle user status
router.patch('/:id/toggle-status', authorize(['Admin', 'Moderator']), asyncHandler(toggleUserStatus));

// Admin and Moderator routes
router.get('/', authorize(['Admin', 'Moderator']), asyncHandler(getUsers));
router.get('/all', authorize(['Admin', 'Moderator']), asyncHandler(getAllUsers));

// User management routes (Admin and Moderator)
router.post('/', authorize(['Admin', 'Moderator']), asyncHandler(createUser));
router.put('/:id', authorize(['Admin', 'Moderator']), asyncHandler(updateUser));
router.delete('/', authorize(['Admin', 'Moderator']), asyncHandler(deleteUser));

export default router;

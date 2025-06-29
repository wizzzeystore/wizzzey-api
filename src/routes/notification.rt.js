import express from 'express';
import { 
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount
} from '../controllers/notification.ct.js';
import { verifyToken } from '../middleware/auth.mw.js';
import { asyncHandler } from '../utils/responseHandler.ut.js';

const router = express.Router();

// Get user notifications
router.get('/', verifyToken, asyncHandler(getUserNotifications));

// Mark notification as read
router.patch('/:id/read', verifyToken, asyncHandler(markAsRead));

// Mark all notifications as read
router.patch('/read-all', verifyToken, asyncHandler(markAllAsRead));

// Delete notification
router.delete('/:id', verifyToken, asyncHandler(deleteNotification));

// Get unread notification count
router.get('/unread/count', verifyToken, asyncHandler(getUnreadCount));

export default router;
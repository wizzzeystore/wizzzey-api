import express from 'express';
import { 
  triggerManualCleanup, 
  getCleanupStatus, 
  getOrphanedFilesPreview,
  startCleanupScheduler,
  stopCleanupScheduler
} from '../controllers/cleanup.ct.js';
import { verifyToken, authorize } from '../middleware/auth.mw.js';

const router = express.Router();

/**
 * @swagger
 * /api/cleanup/trigger:
 *   post:
 *     summary: Trigger manual cleanup of orphaned files
 *     tags: [Cleanup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cleanup process started successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.post('/trigger', verifyToken, authorize(['Admin']), triggerManualCleanup);

/**
 * @swagger
 * /api/cleanup/status:
 *   get:
 *     summary: Get cleanup service status
 *     tags: [Cleanup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cleanup service status retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/status', verifyToken, authorize(['Admin']), getCleanupStatus);

/**
 * @swagger
 * /api/cleanup/preview:
 *   get:
 *     summary: Get preview of orphaned files (without deleting)
 *     tags: [Cleanup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Orphaned files preview generated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/preview', verifyToken, authorize(['Admin']), getOrphanedFilesPreview);

/**
 * @swagger
 * /api/cleanup/scheduler/start:
 *   post:
 *     summary: Start the cleanup scheduler
 *     tags: [Cleanup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cleanup scheduler started successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.post('/scheduler/start', verifyToken, authorize(['Admin']), startCleanupScheduler);

/**
 * @swagger
 * /api/cleanup/scheduler/stop:
 *   post:
 *     summary: Stop the cleanup scheduler
 *     tags: [Cleanup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cleanup scheduler stopped successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Internal server error
 */
router.post('/scheduler/stop', verifyToken, authorize(['Admin']), stopCleanupScheduler);

export default router; 
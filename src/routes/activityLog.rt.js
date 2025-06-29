import express from 'express';
import { ActivityLogController } from '../controllers/activityLog.ct.js';
const router = express.Router();

const activityLogController = new ActivityLogController();

// POST create a new activity log
router.post('/', activityLogController.logActivity.bind(activityLogController));

// GET all activity logs
router.get('/', activityLogController.getActivityLogs.bind(activityLogController));

export default router; 
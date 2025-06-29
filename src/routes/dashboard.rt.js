import express from 'express';
import { getDashboardStats } from '../controllers/dashboard.ct.js';
import { verifyToken } from '../middleware/auth.mw.js';

const router = express.Router();

// Get dashboard statistics
router.get('/stats', verifyToken, getDashboardStats);

export default router; 
import express from 'express';
import { uploadSizeChart, listSizeCharts, deleteSizeChart } from '../controllers/sizeChart.ct.js';
import { verifyToken } from '../middleware/auth.mw.js';
import { upload } from '../middleware/fileUpload.mw.js';

const router = express.Router();

// List all size charts
router.get('/', verifyToken, listSizeCharts);

// Upload a new size chart (image upload)
router.post('/', verifyToken, upload.single('image'), uploadSizeChart);

// Delete a size chart
router.delete('/:id', verifyToken, deleteSizeChart);

export default router; 
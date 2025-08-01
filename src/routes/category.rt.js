// src/routes/categoryRoutes.js
import express from 'express';
import * as categoryController from '../controllers/category.ct.js';
import { verifyToken } from '../middleware/auth.mw.js';
import { upload, compressFiles } from '../middleware/fileUpload.mw.js';

const router = express.Router();

// GET categories or a single category by ID
router.get('/', categoryController.getCategories);

// GET a single category by ID
router.get('/:id', categoryController.getCategoryById);

// CREATE a new category
router.post('/', upload.array('files', 10), compressFiles, categoryController.createCategory);

// UPDATE a category
router.put('/:id', verifyToken, upload.array('files', 10), compressFiles, categoryController.updateCategory);

// DELETE a category
router.delete('/:id', verifyToken, categoryController.deleteCategory);

export default router;
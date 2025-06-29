import express from 'express';
import {
  createBlogPost,
  getBlogs,
  updateBlogPost,
  deleteBlogPost,
} from '../controllers/blogPost.ct.js';
const router = express.Router();

// GET blogs with filters
router.get('/', getBlogs);

// CREATE a new blog post
router.post('/', createBlogPost);

// UPDATE a blog post by ID
router.put('/:id', updateBlogPost);

// DELETE a blog post by ID
router.delete('/:id', deleteBlogPost);

export default router; 
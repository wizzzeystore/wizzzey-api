import BlogPostModel  from '../models/BlogPost.mo.js';
import { ApiResponse, asyncHandler, ApiError } from '../utils/responseHandler.ut.js';
import mongoose from 'mongoose';

// Get all blog posts with filters
export const getBlogs = asyncHandler(async (req, res) => {
  const { 
    id, 
    title, 
    author, 
    slug, 
    tags,
    page = 1,
    limit = 10,
    sortBy = 'publishedAt',
    sortOrder = 'desc'
  } = req.query;

  // Build filter
  const filter = {};
  if (id && mongoose.Types.ObjectId.isValid(id)) filter._id = id;
  if (title) filter.title = { $regex: title, $options: 'i' };
  if (author && mongoose.Types.ObjectId.isValid(author)) filter.author = author;
  if (slug) filter.slug = slug;
  if (tags) filter.tags = { $in: Array.isArray(tags) ? tags : [tags] };

  // Calculate pagination
  const skip = (Number(page) - 1) * Number(limit);
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  // Get total count
  const total = await BlogPostModel.countDocuments(filter);

  // Get paginated results
  const blogPosts = await BlogPostModel.find(filter)
    .populate('author')
    .sort(sort)
    .skip(skip)
    .limit(Number(limit));

  // Calculate metadata
  const totalPages = Math.ceil(total / Number(limit));
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return ApiResponse.paginated(res, 'Blog posts retrieved successfully', { blogPosts }, {
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages,
    hasNextPage,
    hasPrevPage,
    filters: {
      applied: Object.keys(filter).length > 0 ? filter : null,
      available: {
        id,
        title,
        author,
        slug,
        tags
      }
    },
    sort: {
      by: sortBy,
      order: sortOrder
    }
  });
});

// Create a new blog post
export const createBlogPost = asyncHandler(async (req, res) => {
  const { title, content, author, publishedAt, slug, tags, imageUrl } = req.body;

  if (author && !mongoose.Types.ObjectId.isValid(author)) {
    throw new ApiError(400, 'Invalid author ID');
  }

  const blogPost = new BlogPostModel({
    title,
    content,
    author: author ? new mongoose.Types.ObjectId(author) : undefined,
    publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
    slug,
    tags,
    imageUrl
  });

  const savedBlogPost = await blogPost.save();
  
  return ApiResponse.success(res, 'Blog post created successfully', { blogPost: savedBlogPost }, 201);
});

// Update a blog post
export const updateBlogPost = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid blog post ID');
  }

  const updates = req.body;
  if (updates.author && !mongoose.Types.ObjectId.isValid(updates.author)) {
    throw new ApiError(400, 'Invalid author ID');
  }

  if (updates.author) {
    updates.author = new mongoose.Types.ObjectId(updates.author);
  }

  if (updates.publishedAt) {
    updates.publishedAt = new Date(updates.publishedAt);
  }

  const updatedBlogPost = await BlogPostModel.findByIdAndUpdate(
    id,
    updates,
    { new: true }
  ).populate('author');

  if (!updatedBlogPost) {
    throw new ApiError(404, 'Blog post not found');
  }

  return ApiResponse.success(res, 'Blog post updated successfully', { blogPost: updatedBlogPost });
});

// Delete a blog post
export const deleteBlogPost = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid blog post ID');
  }

  const deletedBlogPost = await BlogPostModel.findByIdAndDelete(id);
  if (!deletedBlogPost) {
    throw new ApiError(404, 'Blog post not found');
  }

  return ApiResponse.success(res, 'Blog post deleted successfully');
}); 
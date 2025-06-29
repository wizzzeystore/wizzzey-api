import { Category } from '../models/Category.mo.js';
import mongoose from 'mongoose';
import { ApiResponse, asyncHandler, ApiError } from '../utils/responseHandler.ut.js';

// Get all categories with filters
export const getCategories = asyncHandler(async (req, res) => {
  const { 
    id, 
    name, 
    parentId,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Build filter
  const filter = {};
  if (id && mongoose.Types.ObjectId.isValid(id)) filter._id = id;
  if (name) filter.name = { $regex: name, $options: 'i' };
  if (parentId && mongoose.Types.ObjectId.isValid(parentId)) filter.parentId = parentId;

  // Calculate pagination
  const skip = (Number(page) - 1) * Number(limit);
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  // Get total count
  const total = await Category.countDocuments(filter);

  // Get paginated results
  const categories = await Category.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(Number(limit));

  // Calculate metadata
  const totalPages = Math.ceil(total / Number(limit));
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return ApiResponse.paginated(res, 'Categories retrieved successfully', { categories }, {
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
        name,
        parentId
      }
    },
    sort: {
      by: sortBy,
      order: sortOrder
    }
  });
});

// Get a single category by ID
export const getCategoryById = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(400, 'Invalid category ID');
  }

  const category = await Category.findById(req.params.id);
  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  return ApiResponse.success(res, 'Category retrieved successfully', { category });
});

// Create a new category
export const createCategory = asyncHandler(async (req, res) => {
  const { 
    name, 
    description, 
    parentId, 
    slug,
    media,
    icon,
    isActive,
    displayOrder,
    seo,
    attributes
  } = req.body;

  if (parentId && !mongoose.Types.ObjectId.isValid(parentId)) {
    throw new ApiError(400, 'Invalid parent category ID');
  }
  
  // Get the file path from the uploaded file
  let imageUrl = null;
  if (req.files && req.files.length > 0) {
    const filePath = req.files[0].path;
    imageUrl = filePath.split('uploads')[1].replace(/\\/g, '/');
    imageUrl = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    imageUrl = `/uploads${imageUrl}`;
  }
  
  const category = new Category({
    name,
    description,
    parentId,
    imageUrl,
    slug,
    media: media || [],
    icon,
    isActive: isActive !== undefined ? isActive : true,
    displayOrder: displayOrder || 0,
    seo: seo || {},
    attributes: attributes || []
  });

  const savedCategory = await category.save();

  return ApiResponse.success(res, 'Category created successfully', { category: savedCategory }, 201);
});

// Update a category
export const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid category ID');
  }

  const updatedCategory = await Category.findByIdAndUpdate(
    id,
    req.body,
    { new: true }
  );

  if (!updatedCategory) {
    throw new ApiError(404, 'Category not found');
  }

  return ApiResponse.success(res, 'Category updated successfully', { category: updatedCategory });
});

// Delete a category
export const  deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.query;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid category ID');
  }

  const deletedCategory = await Category.findByIdAndDelete(id);
  if (!deletedCategory) {
    throw new ApiError(404, 'Category not found');
  }

  return ApiResponse.success(res, 'Category deleted successfully');
});
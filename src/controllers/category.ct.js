import { Category } from '../models/Category.mo.js';
import mongoose from 'mongoose';
import { ApiResponse, asyncHandler, ApiError } from '../utils/responseHandler.ut.js';
import { getBaseUrl } from '../utils/helper.js';
import path from 'path';
import fs from 'fs';

// Validation function for image files
const validateImageFile = (file) => {
  if (!file) {
    return null; // No file uploaded is valid
  }

  const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg'];
  const allowedExtensions = ['.png', '.jpg', '.jpeg'];
  
  const fileExtension = path.extname(file.originalname).toLowerCase();
  const isValidMimeType = allowedMimeTypes.includes(file.mimetype);
  const isValidExtension = allowedExtensions.includes(fileExtension);
  
  if (!isValidMimeType || !isValidExtension) {
    throw new ApiError(400, 'Only PNG and JPEG images are allowed');
  }

  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new ApiError(400, 'File size must be less than 5MB');
  }

  return true;
};

// Helper function to create image object
const createImageObject = (file, baseUrl) => {
  return {
    filename: file.filename,
    originalName: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    url: `/uploads/${file.filename}`
  };
};

// Helper function to delete old image file
const deleteOldImage = async (imageObject) => {
  if (imageObject && imageObject.filename) {
    const filePath = path.join('uploads', imageObject.filename);
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (error) {
      console.warn(`Could not delete old image file: ${error.message}`);
    }
  }
};

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
  
  // Handle image upload
  let image = null;
  if (req.files && req.files.length > 0) {
    const file = req.files[0];
    validateImageFile(file);
    
    const baseUrl = getBaseUrl(req);
    image = createImageObject(file, baseUrl);
  }
  
  const category = new Category({
    name,
    description,
    parentId,
    image,
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

  // Find existing category to handle image deletion
  const existingCategory = await Category.findById(id);
  if (!existingCategory) {
    throw new ApiError(404, 'Category not found');
  }

  // Handle image upload
  let image = existingCategory.image;
  if (req.files && req.files.length > 0) {
    const file = req.files[0];
    validateImageFile(file);
    
    // Delete old image if exists
    if (existingCategory.image) {
      await deleteOldImage(existingCategory.image);
    }
    
    const baseUrl = getBaseUrl(req);
    image = createImageObject(file, baseUrl);
  }

  // Update category with new image
  const updateData = { ...req.body, image };
  const updatedCategory = await Category.findByIdAndUpdate(
    id,
    updateData,
    { new: true }
  );

  return ApiResponse.success(res, 'Category updated successfully', { category: updatedCategory });
});

// Delete a category
export const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.query;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid category ID');
  }

  const category = await Category.findById(id);
  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  // Delete associated image file
  if (category.image) {
    await deleteOldImage(category.image);
  }

  const deletedCategory = await Category.findByIdAndDelete(id);
  return ApiResponse.success(res, 'Category deleted successfully');
});
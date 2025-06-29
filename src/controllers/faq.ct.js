import FAQModel from '../models/Faq.mo.js';
import { ApiResponse, asyncHandler, ApiError } from '../utils/responseHandler.ut.js';
import mongoose from 'mongoose';

// Get all FAQs
export const getAllFAQs = asyncHandler(async (req, res) => {
  const { 
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Calculate pagination
  const skip = (Number(page) - 1) * Number(limit);
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  // Get total count
  const total = await FAQModel.countDocuments();

  // Get paginated results
  const faqs = await FAQModel.find()
    .sort(sort)
    .skip(skip)
    .limit(Number(limit));

  // Calculate metadata
  const totalPages = Math.ceil(total / Number(limit));
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return ApiResponse.paginated(res, 'FAQs retrieved successfully', { faqs }, {
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages,
    hasNextPage,
    hasPrevPage,
    sort: {
      by: sortBy,
      order: sortOrder
    }
  });
});

// Create FAQ
export const createFAQ = asyncHandler(async (req, res) => {
  const faq = new FAQModel(req.body);
  await faq.save();
  return ApiResponse.success(res, 'FAQ created successfully', { faq }, 201);
});

// Update FAQ
export const updateFAQ = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid FAQ ID');
  }

  const updatedFAQ = await FAQModel.findByIdAndUpdate(
    id,
    req.body,
    { new: true }
  );

  if (!updatedFAQ) {
    throw new ApiError(404, 'FAQ not found');
  }

  return ApiResponse.success(res, 'FAQ updated successfully', { faq: updatedFAQ });
});

// Delete FAQ
export const deleteFAQ = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid FAQ ID');
  }

  const deletedFAQ = await FAQModel.findByIdAndDelete(id);
  if (!deletedFAQ) {
    throw new ApiError(404, 'FAQ not found');
  }

  return ApiResponse.success(res, 'FAQ deleted successfully');
});
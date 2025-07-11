import { SizeChart } from '../models/SizeChart.mo.js';
import { ApiResponse, asyncHandler, ApiError } from '../utils/responseHandler.ut.js';
import path from 'path';
import fs from 'fs';

// List all size charts
export const listSizeCharts = asyncHandler(async (req, res) => {
  const sizeCharts = await SizeChart.find().sort({ createdAt: -1 });
  return ApiResponse.success(res, 'Size charts retrieved', { sizeCharts });
});

// Get a size chart by ID
export const getSizeChartById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const sizeChart = await SizeChart.findById(id);
  return ApiResponse.success(res, 'Size chart retrieved', { sizeChart });
});

// Upload a new size chart (expects req.file for image)
export const uploadSizeChart = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  if (!req.file) {
    throw new ApiError(400, 'Image file is required');
  }
  const imagePath = `/uploads/${req.file.filename}`;
  const sizeChart = new SizeChart({
    title,
    description,
    image: imagePath
  });
  await sizeChart.save();
  return ApiResponse.success(res, 'Size chart uploaded', { sizeChart }, 201);
});

// Delete a size chart
export const deleteSizeChart = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const sizeChart = await SizeChart.findById(id);
  if (!sizeChart) {
    throw new ApiError(404, 'Size chart not found');
  }
  // Delete image file from filesystem
  const filePath = path.join(process.cwd(), sizeChart.image.startsWith('/') ? sizeChart.image.substring(1) : sizeChart.image);
  try {
    await fs.promises.unlink(filePath);
  } catch (err) {
    // Ignore if file doesn't exist
  }
  await sizeChart.deleteOne();
  return ApiResponse.success(res, 'Size chart deleted');
}); 
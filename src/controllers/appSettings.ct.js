import AppSettingsModel from '../models/AppSettings.mo.js';
import { ApiResponse, asyncHandler, ApiError } from '../utils/responseHandler.ut.js';
import crypto from 'crypto';
import mongoose from 'mongoose';

const DEFAULT_APP_SETTINGS = {
  storeName: 'Store Admin X',
  defaultStoreEmail: 'contact@example.com',
  maintenanceMode: false,
  darkMode: false,
  themeAccentColor: 'var(--accent)',
  storeLogoUrl: '',
  notifications: {
    newOrderEmails: true,
    lowStockAlerts: true,
    productUpdatesNewsletter: false,
  },
  apiSettings: {},
};

async function getOrCreateSettings() {
  let settings = await AppSettingsModel.findOne();
  if (!settings) {
    settings = new AppSettingsModel(DEFAULT_APP_SETTINGS);
    await settings.save();
  }
  return settings;
}

// Get app settings
export const getAppSettings = asyncHandler(async (req, res) => {
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
  const total = await AppSettingsModel.countDocuments();

  // Get paginated results
  const settings = await AppSettingsModel.find()
    .sort(sort)
    .skip(skip)
    .limit(Number(limit));

  // Calculate metadata
  const totalPages = Math.ceil(total / Number(limit));
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return ApiResponse.paginated(res, 'App settings retrieved successfully', { settings }, {
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

// Create app settings
export const createAppSettings = asyncHandler(async (req, res) => {
  const settings = new AppSettingsModel(req.body);
  await settings.save();
  return ApiResponse.success(res, 'App settings created successfully', { settings }, 201);
});

// Update app settings
export const updateAppSettings = asyncHandler(async (req, res) => {
  const { id } = req.query;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid settings ID');
  }

  const updatedSettings = await AppSettingsModel.findByIdAndUpdate(
    id,
    req.body,
    { new: true }
  );

  if (!updatedSettings) {
    throw new ApiError(404, 'App settings not found');
  }

  return ApiResponse.success(res, 'App settings updated successfully', { settings: updatedSettings });
});

// Delete app settings
export const deleteAppSettings = asyncHandler(async (req, res) => {
  const { id } = req.query;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid settings ID');
  }

  const deletedSettings = await AppSettingsModel.findByIdAndDelete(id);
  if (!deletedSettings) {
    throw new ApiError(404, 'App settings not found');
  }

  return ApiResponse.success(res, 'App settings deleted successfully');
});

// Get app settings by key
export const getAppSettingsByKey = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const settings = await AppSettingsModel.findOne({ key });
  if (!settings) {
    throw new ApiError(404, 'App settings not found');
  }
  return ApiResponse.success(res, 'App settings retrieved successfully', { settings });
});

// Generate and save API key
export const generateApiKey = asyncHandler(async (req, res) => {
  const settings = await getOrCreateSettings();
  const apiKey = crypto.randomBytes(32).toString('hex');
  settings.apiSettings = {
    ...settings.apiSettings,
    apiKey,
    apiKeyLastGenerated: new Date(),
  };
  settings.value = { apiSettings: settings.apiSettings };
  await settings.save();

  return ApiResponse.success(res, 'API key generated successfully', { apiKey });
}); 
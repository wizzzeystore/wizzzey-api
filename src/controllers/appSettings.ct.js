import AppSettingsModel from '../models/AppSettings.mo.js';
import { ApiResponse, asyncHandler, ApiError } from '../utils/responseHandler.ut.js';
import crypto from 'crypto';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';

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

// Validation function for image files
const validateImageFile = (file) => {
  if (!file) {
    throw new ApiError(400, 'No file uploaded');
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
    url: `${baseUrl}/uploads/${file.filename}`
  };
};

// Helper function to delete old image file
const deleteOldImage = async (imageObject) => {
  if (imageObject && imageObject.filename) {
    const filePath = path.join(process.cwd(), 'uploads', imageObject.filename);
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        console.log(`Successfully deleted file: ${filePath}`);
      } else {
        console.warn(`File not found: ${filePath}`);
      }
    } catch (error) {
      console.warn(`Could not delete old image file: ${error.message}`);
    }
  }
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
  // For app settings, we typically want the first (or only) settings record
  let settings = await AppSettingsModel.findOne();
  
  // If no settings exist, create default settings
  if (!settings) {
    settings = new AppSettingsModel(DEFAULT_APP_SETTINGS);
    await settings.save();
  }

  return ApiResponse.success(res, 'App settings retrieved successfully', { settings });
});

// Create app settings
export const createAppSettings = asyncHandler(async (req, res) => {
  // Check if settings already exist
  const existingSettings = await AppSettingsModel.findOne();
  if (existingSettings) {
    throw new ApiError(400, 'App settings already exist. Use update instead.');
  }

  const settings = new AppSettingsModel(req.body);
  await settings.save();
  return ApiResponse.success(res, 'App settings created successfully', { settings }, 201);
});

// Update app settings
export const updateAppSettings = asyncHandler(async (req, res) => {
  // Find the first settings record (there should typically be only one)
  let settings = await AppSettingsModel.findOne();
  
  if (!settings) {
    // If no settings exist, create with default values
    settings = new AppSettingsModel(DEFAULT_APP_SETTINGS);
  }

  // Update the settings with the provided data
  Object.assign(settings, req.body);
  await settings.save();

  return ApiResponse.success(res, 'App settings updated successfully', { settings });
});

// Upload store logo
export const uploadStoreLogo = asyncHandler(async (req, res) => {
  const file = req.file;
  validateImageFile(file);

  const settings = await getOrCreateSettings();
  
  // Delete old logo file if exists
  if (settings.storeLogo) {
    await deleteOldImage(settings.storeLogo);
  }

  // Create new image object
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  settings.storeLogo = createImageObject(file, baseUrl);
  
  await settings.save();

  return ApiResponse.success(res, 'Store logo uploaded successfully', { 
    storeLogo: settings.storeLogo 
  });
});

// Upload hero image
export const uploadHeroImage = asyncHandler(async (req, res) => {
  const file = req.file;
  validateImageFile(file);

  const settings = await getOrCreateSettings();
  
  // Delete old hero image file if exists
  if (settings.heroImage) {
    await deleteOldImage(settings.heroImage);
  }

  // Create new image object
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  settings.heroImage = createImageObject(file, baseUrl);
  
  await settings.save();

  return ApiResponse.success(res, 'Hero image uploaded successfully', { 
    heroImage: settings.heroImage 
  });
});

// Delete store logo
export const deleteStoreLogo = asyncHandler(async (req, res) => {
  const settings = await getOrCreateSettings();
  
  if (settings.storeLogo) {
    await deleteOldImage(settings.storeLogo);
    settings.storeLogo = null;
    await settings.save();
  }

  return ApiResponse.success(res, 'Store logo deleted successfully');
});

// Delete hero image
export const deleteHeroImage = asyncHandler(async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    
    if (settings.heroImage) {
      console.log('Deleting hero image:', settings.heroImage);
      await deleteOldImage(settings.heroImage);
      settings.heroImage = null;
      await settings.save();
      console.log('Hero image deleted from database');
    } else {
      console.log('No hero image found to delete');
    }

    return ApiResponse.success(res, 'Hero image deleted successfully');
  } catch (error) {
    console.error('Error deleting hero image:', error);
    throw error;
  }
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
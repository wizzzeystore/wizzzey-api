import { HardInventory } from '../models/HardInventory.mo.js';
import { ApiResponse, asyncHandler, ApiError } from '../utils/responseHandler.ut.js';
import mongoose from 'mongoose';

// Get all hard inventory items with filters
export const getHardInventoryItems = asyncHandler(async (req, res) => {
  const { 
    page = 1,
    limit = 10,
    sortBy = 'lastUpdated',
    sortOrder = 'desc',
    brandName,
    sku,
    size,
    color,
    platform,
    status,
    platformStatus,
    isActive
  } = req.query;

  // Build filter
  const filter = {};
  if (brandName) filter.brandName = { $regex: brandName, $options: 'i' };
  if (sku) filter.sku = { $regex: sku, $options: 'i' };
  if (size) filter.size = { $regex: size, $options: 'i' };
  if (color) filter.color = { $regex: color, $options: 'i' };
  if (platform) filter.platform = platform;
  if (status) filter.status = status;
  if (platformStatus) filter.platformStatus = platformStatus;
  if (isActive !== undefined) filter.isActive = isActive === 'true';

  // Calculate pagination
  const skip = (Number(page) - 1) * Number(limit);
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  // Get total count
  const total = await HardInventory.countDocuments(filter);

  // Get paginated results
  const items = await HardInventory.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(Number(limit));

  // Calculate metadata
  const totalPages = Math.ceil(total / Number(limit));
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return ApiResponse.paginated(res, 'Hard inventory items retrieved successfully', { hardInventoryItems: items }, {
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages,
    hasNextPage,
    hasPrevPage,
    filters: {
      applied: Object.keys(filter).length > 0 ? filter : null,
      available: {
        brandName,
        sku,
        size,
        color,
        platform,
        status,
        platformStatus,
        isActive
      }
    },
    sort: {
      by: sortBy,
      order: sortOrder
    }
  });
});

// Get a single hard inventory item by ID
export const getHardInventoryItemById = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(400, 'Invalid hard inventory item ID');
  }

  const item = await HardInventory.findById(req.params.id);
  if (!item) {
    throw new ApiError(404, 'Hard inventory item not found');
  }

  return ApiResponse.success(res, 'Hard inventory item retrieved successfully', { hardInventoryItem: item });
});

// Create a new hard inventory item
export const createHardInventoryItem = asyncHandler(async (req, res) => {
  const { 
    brandName, 
    sku, 
    size, 
    color, 
    quantity, 
    platform,
    platformSku,
    platformProductId,
    platformUrl,
    platformPrice,
    platformStatus
  } = req.body;

  // Check if item with same SKU, size, color, and platform already exists
  const existingItem = await HardInventory.findOne({
    sku,
    size,
    color: color || null,
    platform
  });

  if (existingItem) {
    throw new ApiError(400, 'An item with this SKU, size, color, and platform already exists');
  }

  // Determine status based on quantity
  let status = 'in_stock';
  if (quantity === 0) {
    status = 'out_of_stock';
  } else if (quantity <= 10) {
    status = 'low_stock';
  }

  const item = new HardInventory({
    brandName,
    sku,
    size,
    color,
    quantity,
    platform,
    platformSku,
    platformProductId,
    platformUrl,
    platformPrice,
    platformStatus: platformStatus || 'active',
    status
  });

  const savedItem = await item.save();

  return ApiResponse.success(res, 'Hard inventory item created successfully', { hardInventoryItem: savedItem }, 201);
});

// Update a hard inventory item
export const updateHardInventoryItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid hard inventory item ID');
  }

  const { 
    brandName, 
    sku, 
    size, 
    color, 
    quantity, 
    platform,
    platformSku,
    platformProductId,
    platformUrl,
    platformPrice,
    platformStatus
  } = req.body;

  // Check if item exists
  const existingItem = await HardInventory.findById(id);
  if (!existingItem) {
    throw new ApiError(404, 'Hard inventory item not found');
  }

  // Check if updating would create a duplicate
  if (sku || size || color !== undefined || platform) {
    const duplicateCheck = await HardInventory.findOne({
      _id: { $ne: id },
      sku: sku || existingItem.sku,
      size: size || existingItem.size,
      color: color !== undefined ? color : existingItem.color,
      platform: platform || existingItem.platform
    });

    if (duplicateCheck) {
      throw new ApiError(400, 'An item with this SKU, size, color, and platform already exists');
    }
  }

  // Determine status based on quantity
  let status = existingItem.status;
  if (quantity !== undefined) {
    if (quantity === 0) {
      status = 'out_of_stock';
    } else if (quantity <= 10) {
      status = 'low_stock';
    } else {
      status = 'in_stock';
    }
  }

  const updateData = { ...req.body, status };
  const updatedItem = await HardInventory.findByIdAndUpdate(
    id,
    updateData,
    { new: true }
  );

  return ApiResponse.success(res, 'Hard inventory item updated successfully', { hardInventoryItem: updatedItem });
});

// Delete a hard inventory item
export const deleteHardInventoryItem = asyncHandler(async (req, res) => {
  const { id } = req.query;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid hard inventory item ID');
  }

  const deletedItem = await HardInventory.findByIdAndDelete(id);
  if (!deletedItem) {
    throw new ApiError(404, 'Hard inventory item not found');
  }

  return ApiResponse.success(res, 'Hard inventory item deleted successfully');
});

// Get items by platform
export const getItemsByPlatform = asyncHandler(async (req, res) => {
  const { platform } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!platform) {
    throw new ApiError(400, 'Platform parameter is required');
  }

  // Calculate pagination
  const skip = (Number(page) - 1) * Number(limit);

  // Get total count
  const total = await HardInventory.countDocuments({ platform, isActive: true });

  // Get paginated results
  const items = await HardInventory.getByPlatform(platform)
    .skip(skip)
    .limit(Number(limit));

  // Calculate metadata
  const totalPages = Math.ceil(total / Number(limit));
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return ApiResponse.paginated(res, `Hard inventory items for ${platform} retrieved successfully`, { 
    hardInventoryItems: items,
    platform 
  }, {
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages,
    hasNextPage,
    hasPrevPage
  });
});

// Get low stock items by platform
export const getLowStockByPlatform = asyncHandler(async (req, res) => {
  const { platform } = req.params;
  const { threshold = 10 } = req.query;

  if (!platform) {
    throw new ApiError(400, 'Platform parameter is required');
  }

  const items = await HardInventory.getLowStockByPlatform(platform, Number(threshold));

  return ApiResponse.success(res, `Low stock items for ${platform} retrieved successfully`, { 
    lowStockItems: items,
    platform,
    threshold: Number(threshold)
  });
});

// Get out of stock items by platform
export const getOutOfStockByPlatform = asyncHandler(async (req, res) => {
  const { platform } = req.params;

  if (!platform) {
    throw new ApiError(400, 'Platform parameter is required');
  }

  const items = await HardInventory.getOutOfStockByPlatform(platform);

  return ApiResponse.success(res, `Out of stock items for ${platform} retrieved successfully`, { 
    outOfStockItems: items,
    platform
  });
});

// Bulk update quantities
export const bulkUpdateQuantities = asyncHandler(async (req, res) => {
  const { updates } = req.body;

  if (!Array.isArray(updates) || updates.length === 0) {
    throw new ApiError(400, 'Updates array is required and cannot be empty');
  }

  const results = [];
  const errors = [];

  for (const update of updates) {
    try {
      const { id, quantity } = update;
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        errors.push({ id, error: 'Invalid ID format' });
        continue;
      }

      if (typeof quantity !== 'number' || quantity < 0) {
        errors.push({ id, error: 'Quantity must be a non-negative number' });
        continue;
      }

      // Determine status based on quantity
      let status = 'in_stock';
      if (quantity === 0) {
        status = 'out_of_stock';
      } else if (quantity <= 10) {
        status = 'low_stock';
      }

      const updatedItem = await HardInventory.findByIdAndUpdate(
        id,
        { quantity, status },
        { new: true }
      );

      if (updatedItem) {
        results.push(updatedItem);
      } else {
        errors.push({ id, error: 'Item not found' });
      }
    } catch (error) {
      errors.push({ id: update.id, error: error.message });
    }
  }

  return ApiResponse.success(res, 'Bulk update completed', { 
    updatedItems: results,
    errors,
    successCount: results.length,
    errorCount: errors.length
  });
});

// Sync platform data
export const syncPlatformData = asyncHandler(async (req, res) => {
  const { platform } = req.params;
  const { items } = req.body;

  if (!platform) {
    throw new ApiError(400, 'Platform parameter is required');
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'Items array is required and cannot be empty');
  }

  const results = [];
  const errors = [];

  for (const item of items) {
    try {
      const { sku, size, color, quantity, platformSku, platformProductId, platformUrl, platformPrice } = item;

      // Find existing item
      const existingItem = await HardInventory.findOne({
        sku,
        size,
        color: color || null,
        platform
      });

      if (existingItem) {
        // Update existing item
        const status = quantity === 0 ? 'out_of_stock' : quantity <= 10 ? 'low_stock' : 'in_stock';
        
        const updatedItem = await HardInventory.findByIdAndUpdate(
          existingItem._id,
          {
            quantity,
            status,
            platformSku,
            platformProductId,
            platformUrl,
            platformPrice,
            lastSyncAt: new Date()
          },
          { new: true }
        );

        results.push(updatedItem);
      } else {
        // Create new item
        const status = quantity === 0 ? 'out_of_stock' : quantity <= 10 ? 'low_stock' : 'in_stock';
        
        const newItem = new HardInventory({
          brandName: item.brandName || 'Unknown',
          sku,
          size,
          color,
          quantity,
          platform,
          platformSku,
          platformProductId,
          platformUrl,
          platformPrice,
          status
        });

        const savedItem = await newItem.save();
        results.push(savedItem);
      }
    } catch (error) {
      errors.push({ sku: item.sku, error: error.message });
    }
  }

  return ApiResponse.success(res, `Platform sync completed for ${platform}`, { 
    syncedItems: results,
    errors,
    successCount: results.length,
    errorCount: errors.length,
    platform
  });
}); 
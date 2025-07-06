import { SoftInventory } from '../models/SoftInventory.mo.js';
import { ApiResponse, asyncHandler, ApiError } from '../utils/responseHandler.ut.js';
import mongoose from 'mongoose';

// Get all soft inventory items with filters
export const getSoftInventoryItems = asyncHandler(async (req, res) => {
  const { 
    page = 1,
    limit = 10,
    sortBy = 'lastUpdated',
    sortOrder = 'desc',
    brandName,
    sku,
    size,
    color,
    status,
    isActive
  } = req.query;

  // Build filter
  const filter = {};
  if (brandName) filter.brandName = { $regex: brandName, $options: 'i' };
  if (sku) filter.sku = { $regex: sku, $options: 'i' };
  if (size) filter.size = { $regex: size, $options: 'i' };
  if (color) filter.color = { $regex: color, $options: 'i' };
  if (status) filter.status = status;
  if (isActive !== undefined) filter.isActive = isActive === 'true';

  // Calculate pagination
  const skip = (Number(page) - 1) * Number(limit);
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  // Get total count
  const total = await SoftInventory.countDocuments(filter);

  // Get paginated results
  const items = await SoftInventory.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(Number(limit));

  // Calculate metadata
  const totalPages = Math.ceil(total / Number(limit));
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return ApiResponse.paginated(res, 'Soft inventory items retrieved successfully', { softInventoryItems: items }, {
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
        status,
        isActive
      }
    },
    sort: {
      by: sortBy,
      order: sortOrder
    }
  });
});

// Get a single soft inventory item by ID
export const getSoftInventoryItemById = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw new ApiError(400, 'Invalid soft inventory item ID');
  }

  const item = await SoftInventory.findById(req.params.id);
  if (!item) {
    throw new ApiError(404, 'Soft inventory item not found');
  }

  return ApiResponse.success(res, 'Soft inventory item retrieved successfully', { softInventoryItem: item });
});

// Create a new soft inventory item
export const createSoftInventoryItem = asyncHandler(async (req, res) => {
  const { brandName, sku, size, color, quantity } = req.body;

  // Check if item with same SKU, size, and color already exists
  const existingItem = await SoftInventory.findOne({
    sku,
    size,
    color: color || null
  });

  if (existingItem) {
    throw new ApiError(400, 'An item with this SKU, size, and color already exists');
  }

  // Determine status based on quantity
  let status = 'in_stock';
  if (quantity === 0) {
    status = 'out_of_stock';
  } else if (quantity <= 10) {
    status = 'low_stock';
  }

  const item = new SoftInventory({
    brandName,
    sku,
    size,
    color,
    quantity,
    status
  });

  const savedItem = await item.save();

  return ApiResponse.success(res, 'Soft inventory item created successfully', { softInventoryItem: savedItem }, 201);
});

// Update a soft inventory item
export const updateSoftInventoryItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid soft inventory item ID');
  }

  const { brandName, sku, size, color, quantity } = req.body;

  // Check if item exists
  const existingItem = await SoftInventory.findById(id);
  if (!existingItem) {
    throw new ApiError(404, 'Soft inventory item not found');
  }

  // Check if updating would create a duplicate
  if (sku || size || color !== undefined) {
    const duplicateCheck = await SoftInventory.findOne({
      _id: { $ne: id },
      sku: sku || existingItem.sku,
      size: size || existingItem.size,
      color: color !== undefined ? color : existingItem.color
    });

    if (duplicateCheck) {
      throw new ApiError(400, 'An item with this SKU, size, and color already exists');
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
  const updatedItem = await SoftInventory.findByIdAndUpdate(
    id,
    updateData,
    { new: true }
  );

  return ApiResponse.success(res, 'Soft inventory item updated successfully', { softInventoryItem: updatedItem });
});

// Delete a soft inventory item
export const deleteSoftInventoryItem = asyncHandler(async (req, res) => {
  const { id } = req.query;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid soft inventory item ID');
  }

  const deletedItem = await SoftInventory.findByIdAndDelete(id);
  if (!deletedItem) {
    throw new ApiError(404, 'Soft inventory item not found');
  }

  return ApiResponse.success(res, 'Soft inventory item deleted successfully');
});

// Get low stock items
export const getLowStockItems = asyncHandler(async (req, res) => {
  const { threshold = 10 } = req.query;

  const items = await SoftInventory.getLowStockItems(Number(threshold));

  return ApiResponse.success(res, 'Low stock items retrieved successfully', { 
    lowStockItems: items,
    threshold: Number(threshold)
  });
});

// Get out of stock items
export const getOutOfStockItems = asyncHandler(async (req, res) => {
  const items = await SoftInventory.getOutOfStockItems();

  return ApiResponse.success(res, 'Out of stock items retrieved successfully', { 
    outOfStockItems: items
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

      const updatedItem = await SoftInventory.findByIdAndUpdate(
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
import { Inventory } from '../models/Inventory.mo.js';
import { ApiResponse, asyncHandler, ApiError } from '../utils/responseHandler.ut.js';
import mongoose from 'mongoose';

// Get all inventory items with filtering and pagination
export const getInventoryItems = asyncHandler(async (req, res) => {
  const { 
    productId,
    warehouseId,
    brandName,
    type,
    platform,
    status,
    minQuantity,
    maxQuantity,
    searchTerm,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Build filter
  const filter = {};
  if (productId && mongoose.Types.ObjectId.isValid(productId)) filter.productId = productId;
  if (warehouseId && mongoose.Types.ObjectId.isValid(warehouseId)) filter.warehouseId = warehouseId;
  if (brandName) filter.brandName = { $regex: brandName, $options: 'i' };
  if (type) filter.type = type;
  if (platform) filter.platform = { $regex: platform, $options: 'i' };
  if (status) filter.status = status;
  if (minQuantity || maxQuantity) {
    filter.quantity = {};
    if (minQuantity) filter.quantity.$gte = Number(minQuantity);
    if (maxQuantity) filter.quantity.$lte = Number(maxQuantity);
  }
  if (searchTerm) {
    filter.$or = [
      { brandName: { $regex: searchTerm, $options: 'i' } },
      { sku: { $regex: searchTerm, $options: 'i' } },
      { productName: { $regex: searchTerm, $options: 'i' } }
    ];
  }

  // Calculate pagination
  const skip = (Number(page) - 1) * Number(limit);
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  // Get total count
  const total = await Inventory.countDocuments(filter);

  // Get paginated results with populated fields
  const items = await Inventory.find(filter)
    .populate('productId', 'name description')
    .populate('warehouseId', 'name location')
    .sort(sort)
    .skip(skip)
    .limit(Number(limit));

  // Calculate metadata
  const totalPages = Math.ceil(total / Number(limit));
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return ApiResponse.paginated(res, 'Inventory items retrieved successfully', { items }, {
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages,
    hasNextPage,
    hasPrevPage,
    filters: {
      applied: Object.keys(filter).length > 0 ? filter : null,
      available: {
        productId,
        warehouseId,
        brandName,
        type,
        platform,
        status,
        minQuantity,
        maxQuantity,
        searchTerm
      }
    },
    sort: {
      by: sortBy,
      order: sortOrder
    }
  });
});

// Get a single inventory item
export const getInventoryItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid inventory item ID');
  }

  const item = await Inventory.findById(id)
    .populate('productId', 'name description')
    .populate('warehouseId', 'name location');

  if (!item) {
    throw new ApiError(404, 'Inventory item not found');
  }

  return ApiResponse.success(res, 'Inventory item retrieved successfully', { item });
});

// Create a new inventory item
export const createInventoryItem = asyncHandler(async (req, res) => {
  const {
    productId,
    productName,
    brandName,
    sku,
    size,
    color,
    quantity,
    type,
    platform,
    location,
    warehouseId,
    costPrice,
    supplier,
    batchNumber,
    expirationDate,
    notes
  } = req.body;

  // Validate required fields
  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    throw new ApiError(400, 'Valid product ID is required');
  }
  if (!warehouseId || !mongoose.Types.ObjectId.isValid(warehouseId)) {
    throw new ApiError(400, 'Valid warehouse ID is required');
  }

  const inventoryItem = new Inventory({
    productId,
    productName,
    brandName,
    sku,
    size,
    color,
    quantity,
    type,
    platform,
    location,
    warehouseId,
    costPrice,
    supplier,
    batchNumber,
    expirationDate,
    notes
  });

  const savedItem = await inventoryItem.save();
  return ApiResponse.success(res, 'Inventory item created successfully', { item: savedItem }, 201);
});

// Update an inventory item
export const updateInventoryItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid inventory item ID');
  }

  const updates = req.body;
  if (updates.productId && !mongoose.Types.ObjectId.isValid(updates.productId)) {
    throw new ApiError(400, 'Invalid product ID');
  }
  if (updates.warehouseId && !mongoose.Types.ObjectId.isValid(updates.warehouseId)) {
    throw new ApiError(400, 'Invalid warehouse ID');
  }

  const updatedItem = await Inventory.findByIdAndUpdate(
    id,
    updates,
    { new: true }
  ).populate('productId', 'name description')
   .populate('warehouseId', 'name location');

  if (!updatedItem) {
    throw new ApiError(404, 'Inventory item not found');
  }

  return ApiResponse.success(res, 'Inventory item updated successfully', { item: updatedItem });
});

// Delete an inventory item
export const deleteInventoryItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid inventory item ID');
  }

  const deletedItem = await Inventory.findByIdAndDelete(id);
  if (!deletedItem) {
    throw new ApiError(404, 'Inventory item not found');
  }

  return ApiResponse.success(res, 'Inventory item deleted successfully');
});

// Get inventory summary
export const getInventorySummary = asyncHandler(async (req, res) => {
  const [typeSummary, statusSummary, warehouseSummary] = await Promise.all([
    // Summary by type
    Inventory.aggregate([
      { $group: { 
        _id: '$type',
        totalItems: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        totalValue: { $sum: { $multiply: ['$quantity', '$costPrice'] } }
      }}
    ]),
    // Summary by status
    Inventory.aggregate([
      { $group: { 
        _id: '$status',
        totalItems: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' }
      }}
    ]),
    // Summary by warehouse
    Inventory.aggregate([
      { $group: { 
        _id: '$warehouseId',
        totalItems: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' }
      }}
    ])
  ]);

  return ApiResponse.success(res, 'Inventory summary retrieved successfully', {
    summary: {
      byType: typeSummary.reduce((acc, curr) => {
        acc[curr._id] = {
          totalItems: curr.totalItems,
          totalQuantity: curr.totalQuantity,
          totalValue: curr.totalValue
        };
        return acc;
      }, {}),
      byStatus: statusSummary.reduce((acc, curr) => {
        acc[curr._id] = {
          totalItems: curr.totalItems,
          totalQuantity: curr.totalQuantity
        };
        return acc;
      }, {}),
      byWarehouse: warehouseSummary.reduce((acc, curr) => {
        acc[curr._id] = {
          totalItems: curr.totalItems,
          totalQuantity: curr.totalQuantity
        };
        return acc;
      }, {})
    }
  });
}); 
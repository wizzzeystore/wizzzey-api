import { Brand } from '../models/Brand.mo.js';
import { ApiResponse } from '../utils/responseHandler.ut.js';

// Get all brands
export const getBrands = async (req, res) => {
  try {
    const { searchTerm } = req.query;
    const filter = {};

    if (searchTerm) {
      filter.name = { $regex: searchTerm, $options: 'i' };
    }

    const brands = await Brand.find(filter).sort({ name: 1 });
    return ApiResponse.success(res, 'Brands retrieved successfully', { brands });
  } catch (error) {
    return ApiResponse.error(res, 'Failed to retrieve brands');
  }
};

// Get a single brand
export const getBrand = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) {
      return ApiResponse.notFound(res, 'Brand not found');
    }
    return ApiResponse.success(res, 'Brand retrieved successfully', { brand });
  } catch (error) {
    return ApiResponse.error(res, 'Failed to retrieve brand');
  }
};

// Create a new brand
export const createBrand = async (req, res) => {
  try {
    const { name, description, isActive } = req.body;
    
    // Handle logo upload
    let logoUrl = null;
    if (req.file) {
      // Convert absolute path to relative path for storage and normalize slashes
      let imagePath = req.file.path.split('uploads')[1].replace(/\\/g, '/');
      // Ensure path starts with /
      imagePath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
      // Prepend /uploads to make it a proper URL path
      logoUrl = `/uploads${imagePath}`;
    }

    const brand = new Brand({
      name,
      description,
      logo: logoUrl ? { url: logoUrl } : undefined,
      isActive: isActive === 'true' || isActive === true
    });

    await brand.save();
    return ApiResponse.success(res, 'Brand created successfully', { brand }, 201);
  } catch (error) {
    console.error('Create brand error:', error);
    if (error.code === 11000) {
      return ApiResponse.error(res, 'Brand with this name already exists', 400);
    }
    return ApiResponse.error(res, 'Failed to create brand');
  }
};

// Update a brand
export const updateBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    // Handle logo upload
    if (req.file) {
      // Convert absolute path to relative path for storage and normalize slashes
      let imagePath = req.file.path.split('uploads')[1].replace(/\\/g, '/');
      // Ensure path starts with /
      imagePath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
      // Prepend /uploads to make it a proper URL path
      updates.logo = { url: `/uploads${imagePath}` };
    }

    // Convert isActive to boolean if it exists
    if (updates.isActive !== undefined) {
      updates.isActive = updates.isActive === 'true' || updates.isActive === true;
    }

    const brand = await Brand.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!brand) {
      return ApiResponse.notFound(res, 'Brand not found');
    }
    return ApiResponse.success(res, 'Brand updated successfully', { brand });
  } catch (error) {
    console.error('Update brand error:', error);
    if (error.code === 11000) {
      return ApiResponse.error(res, 'Brand with this name already exists', 400);
    }
    return ApiResponse.error(res, 'Failed to update brand');
  }
};

// Delete a brand
export const deleteBrand = async (req, res) => {
  try {
    const brand = await Brand.findByIdAndDelete(req.params.id);
    if (!brand) {
      return ApiResponse.notFound(res, 'Brand not found');
    }
    return ApiResponse.success(res, 'Brand deleted successfully');
  } catch (error) {
    return ApiResponse.error(res, 'Failed to delete brand');
  }
};

// Add an order placed
export const addOrderPlaced = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) {
      return ApiResponse.notFound(res, 'Brand not found');
    }

    brand.orderPlaced.push(req.body);
    await brand.save();

    return ApiResponse.success(res, 'Order added successfully', { brand }, 201);
  } catch (error) {
    return ApiResponse.error(res, 'Failed to add order');
  }
};

// Update order placed status
export const updateOrderPlacedStatus = async (req, res) => {
  try {
    const { brandId, orderId } = req.params;
    const { status, deliveryDate, notes } = req.body;

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return ApiResponse.notFound(res, 'Brand not found');
    }

    const order = brand.orderPlaced.id(orderId);
    if (!order) {
      return ApiResponse.notFound(res, 'Order not found');
    }

    order.status = status;
    if (deliveryDate) order.deliveryDate = deliveryDate;
    if (notes) order.notes = notes;

    await brand.save();
    return ApiResponse.success(res, 'Order status updated successfully', { brand });
  } catch (error) {
    return ApiResponse.error(res, 'Failed to update order status');
  }
};

// Add an out of stock order
export const addOutOfStockOrder = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);
    if (!brand) {
      return ApiResponse.notFound(res, 'Brand not found');
    }

    brand.outOfStockOrders.push(req.body);
    await brand.save();

    return ApiResponse.success(res, 'Out of stock order added successfully', { brand }, 201);
  } catch (error) {
    return ApiResponse.error(res, 'Failed to add out of stock order');
  }
};

// Update out of stock order status
export const updateOutOfStockOrderStatus = async (req, res) => {
  try {
    const { brandId, orderId } = req.params;
    const { status, notes } = req.body;

    const brand = await Brand.findById(brandId);
    if (!brand) {
      return ApiResponse.notFound(res, 'Brand not found');
    }

    const order = brand.outOfStockOrders.id(orderId);
    if (!order) {
      return ApiResponse.notFound(res, 'Order not found');
    }

    order.status = status;
    if (status === 'submitted') {
      order.submittedAt = new Date();
    }
    if (notes) order.notes = notes;

    await brand.save();
    return ApiResponse.success(res, 'Out of stock order status updated successfully', { brand });
  } catch (error) {
    return ApiResponse.error(res, 'Failed to update out of stock order status');
  }
}; 
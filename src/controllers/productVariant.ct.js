import { ProductVariant } from '../models/ProductVariant.mo.js';
import { Product } from '../models/Product.mo.js';
import mongoose from 'mongoose';
import { ApiResponse, asyncHandler, ApiError } from '../utils/responseHandler.ut.js';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { parsePossiblyStringifiedArray } from '../utils/helper.js';

// Get variants by product ID
export const getVariantsByProduct = asyncHandler(async (req, res) => {
  const { productId } = req.query;
  
  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    throw new ApiError(400, 'Valid product ID is required');
  }

  const variants = await ProductVariant.findByProduct(productId);
  
  return ApiResponse.success(res, 'Variants retrieved successfully', { variants });
});

// Get variants by color
export const getVariantsByColor = asyncHandler(async (req, res) => {
  const { productId, colorName } = req.query;
  
  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    throw new ApiError(400, 'Valid product ID is required');
  }
  
  if (!colorName) {
    throw new ApiError(400, 'Color name is required');
  }

  const variants = await ProductVariant.findByColor(productId, colorName);
  
  return ApiResponse.success(res, 'Variants retrieved successfully', { variants });
});

// Get default variant
export const getDefaultVariant = asyncHandler(async (req, res) => {
  const { productId } = req.query;
  
  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    throw new ApiError(400, 'Valid product ID is required');
  }

  const variant = await ProductVariant.findDefault(productId);
  
  if (!variant) {
    throw new ApiError(404, 'Default variant not found');
  }
  
  return ApiResponse.success(res, 'Default variant retrieved successfully', { variant });
});

// Create a new variant
export const createVariant = async (req, res) => {
  try {
    const { 
      productId, 
      color, 
      size, 
      sku, 
      price, 
      compareAtPrice, 
      costPrice, 
      stock, 
      lowStockThreshold,
      barcode,
      weight,
      dimensions,
      isDefault
    } = req.body;
    
    const files = req.files;

    if (!productId || !color || !size || !sku || !price) {
      return res.status(400).json({
        type: 'ERROR',
        message: 'Missing required fields: productId, color, size, sku, price',
        data: null
      });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        type: 'ERROR',
        message: 'Product not found',
        data: null
      });
    }

    // Parse color if it's a string
    const parsedColor = parsePossiblyStringifiedArray(color);
    const parsedWeight = parsePossiblyStringifiedArray(weight);
    const parsedDimensions = parsePossiblyStringifiedArray(dimensions);

    let images = [];
    if (files && files.length > 0) {
      const compressedImages = await Promise.all(files.map(async (file) => {
        const ext = path.extname(file.filename).toLowerCase();
        const filePath = file.path;
        const compressedPath = filePath.replace(ext, `-compressed${ext}`);

        try {
          await sharp(filePath)
            .resize({ width: 1200 })
            .jpeg({ quality: 70 })
            .toFile(compressedPath);

          await fs.promises.unlink(filePath).catch(err => {
            console.warn(`Could not delete original file ${filePath}: ${err.message}`);
          });

          return compressedPath;
        } catch (err) {
          console.error(`Error processing image ${filePath}: ${err.message}`);
          return filePath;
        }
      }));

      images = compressedImages.map(image => ({
        url: image,
        type: 'image',
        alt: ''
      }));
    }

    const variant = new ProductVariant({
      productId,
      color: parsedColor,
      size,
      sku,
      price,
      compareAtPrice,
      costPrice,
      stock: stock || 0,
      lowStockThreshold,
      images,
      barcode,
      weight: parsedWeight,
      dimensions: parsedDimensions,
      isDefault: isDefault || false
    });

    await variant.save();

    // Update product to indicate it has variants
    await Product.findByIdAndUpdate(productId, {
      hasVariants: true,
      defaultVariantId: isDefault ? variant._id : product.defaultVariantId
    });

    return res.status(201).json({
      type: 'OK',
      message: 'Variant created successfully',
      data: variant
    });
  } catch (error) {
    return res.status(500).json({
      type: 'ERROR',
      message: error.message,
      data: null
    });
  }
};

// Update a variant
export const updateVariant = asyncHandler(async (req, res) => {
  const { id } = req.query;
  
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid variant ID');
  }

  const updates = { ...req.body };
  
  // Parse color if it's a string
  if (updates.color) {
    if (typeof updates.color === 'string') {
      try {
        updates.color = JSON.parse(updates.color);
      } catch (e) {
        throw new ApiError(400, 'Invalid color format. Must be an object.');
      }
    }
  }

  // Handle image deletions if requested
  if (updates.deletedImages && Array.isArray(updates.deletedImages)) {
    const variant = await ProductVariant.findById(id);
    if (variant) {
      variant.images = variant.images.filter(img => !updates.deletedImages.includes(img.url));
      
      for (const url of updates.deletedImages) {
        const filePath = path.join(process.cwd(), url.startsWith('/') ? url.substring(1) : url);
        try {
          await fs.promises.unlink(filePath);
        } catch (err) {
          // Ignore if file doesn't exist
        }
      }
      await variant.save();
    }
    delete updates.deletedImages;
  }

  // Handle file uploads if present
  if (req.files && req.files.length > 0) {
    const variant = await ProductVariant.findById(id);
    let existingImages = variant && Array.isArray(variant.images) ? variant.images : [];

    const newImages = [];
    for (let i = 0; i < req.files.length; i++) {
      const filePath = req.files[i].path;
      let imagePath = filePath.split('uploads')[1];
      imagePath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
      newImages.push({ url: `uploads${imagePath}`, type: 'image', alt: '' });
    }

    const combinedImages = [...existingImages, ...newImages];
    const uniqueImages = [];
    const seenUrls = new Set();
    for (const img of combinedImages) {
      if (!seenUrls.has(img.url)) {
        uniqueImages.push(img);
        seenUrls.add(img.url);
      }
    }
    updates.images = uniqueImages;
  }

  // Parse numeric values
  if (updates.price) updates.price = parseFloat(updates.price);
  if (updates.stock) updates.stock = parseInt(updates.stock);
  if (updates.lowStockThreshold) updates.lowStockThreshold = parseFloat(updates.lowStockThreshold);

  const updatedVariant = await ProductVariant.findByIdAndUpdate(
    id,
    updates,
    { new: true }
  );

  if (!updatedVariant) {
    throw new ApiError(404, 'Variant not found');
  }

  return ApiResponse.success(res, 'Variant updated successfully', { variant: updatedVariant });
});

// Delete a variant
export const deleteVariant = asyncHandler(async (req, res) => {
  const { id } = req.query;
  
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid variant ID');
  }

  const deletedVariant = await ProductVariant.findByIdAndDelete(id);
  if (!deletedVariant) {
    throw new ApiError(404, 'Variant not found');
  }

  // Check if this was the default variant and update product accordingly
  if (deletedVariant.isDefault) {
    const product = await Product.findById(deletedVariant.productId);
    if (product) {
      const remainingVariants = await ProductVariant.find({ productId: deletedVariant.productId });
      if (remainingVariants.length === 0) {
        // No variants left, update product
        await Product.findByIdAndUpdate(deletedVariant.productId, {
          hasVariants: false,
          defaultVariantId: null
        });
      } else {
        // Set first remaining variant as default
        await Product.findByIdAndUpdate(deletedVariant.productId, {
          defaultVariantId: remainingVariants[0]._id
        });
        await ProductVariant.findByIdAndUpdate(remainingVariants[0]._id, { isDefault: true });
      }
    }
  }

  return ApiResponse.success(res, 'Variant deleted successfully');
});

// Get all variants with pagination
export const getVariants = asyncHandler(async (req, res) => {
  const { 
    productId,
    color,
    size,
    status,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const filter = {};
  if (productId && mongoose.Types.ObjectId.isValid(productId)) filter.productId = productId;
  if (color) filter['color.name'] = { $regex: color, $options: 'i' };
  if (size) filter.size = { $regex: size, $options: 'i' };
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  const total = await ProductVariant.countDocuments(filter);
  const variants = await ProductVariant.find(filter)
    .populate('productId', 'name description')
    .sort(sort)
    .skip(skip)
    .limit(Number(limit));

  const totalPages = Math.ceil(total / Number(limit));
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return ApiResponse.paginated(res, 'Variants retrieved successfully', { variants }, {
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages,
    hasNextPage,
    hasPrevPage,
    filters: {
      applied: Object.keys(filter).length > 0 ? filter : null,
      available: { productId, color, size, status }
    },
    sort: {
      by: sortBy,
      order: sortOrder
    }
  });
}); 
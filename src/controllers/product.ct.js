import { Product } from '../models/Product.mo.js';
import mongoose from 'mongoose';
import { ApiResponse, asyncHandler, ApiError } from '../utils/responseHandler.ut.js';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { parsePossiblyStringifiedArray } from '../utils/helper.js';

// Get products with filters or a single product by ID
export const getProducts = asyncHandler(async (req, res) => {
  const { 
    id, 
    name, 
    categoryId,
    minPrice,
    maxPrice,
    inStock,
    brandId,
    size,
    color,
    product_ids,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    term = '',
    random = false
  } = req.query;

  // If ID is provided, return single product
  if (id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid product ID');
    }

    const product = await Product.findById(id);
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    return ApiResponse.success(res, 'Product retrieved successfully', { product });
  }

  // If product_ids is provided, return products for those specific IDs
  if (product_ids) {
    let productIdsArray;
    
    // Handle both string and array formats
    if (typeof product_ids === 'string') {
      try {
        productIdsArray = JSON.parse(product_ids);
      } catch (e) {
        // If parsing fails, treat as comma-separated string
        productIdsArray = product_ids.split(',').map(id => id.trim());
      }
    } else if (Array.isArray(product_ids)) {
      productIdsArray = product_ids;
    } else {
      throw new ApiError(400, 'Invalid product_ids format. Must be an array of IDs or comma-separated string.');
    }

    // Validate all IDs
    const validIds = productIdsArray.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      throw new ApiError(400, 'No valid product IDs provided');
    }

    const products = await Product.find({ _id: { $in: validIds } });
    
    return ApiResponse.success(res, 'Products retrieved successfully', { 
      products,
      requestedIds: productIdsArray,
      foundIds: products.map(p => p._id.toString()),
      missingIds: productIdsArray.filter(id => !products.some(p => p._id.toString() === id))
    });
  }

  // Build filter for list operation
  const filter = {};
  if (name) filter.name = { $regex: name, $options: 'i' };
  if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) filter.categoryId = categoryId;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  if (inStock !== undefined) filter.inStock = inStock === 'true';
  if (brandId && mongoose.Types.ObjectId.isValid(brandId)) filter.brandId = brandId;
  if (size) filter.availableSizes = { $in: size.split(',') };
  if (color) filter['colors.name'] = { $in: color.split(',') };
  // Add isFeatured filter
  if (typeof req.query.isFeatured !== 'undefined') {
    if (req.query.isFeatured === 'true') filter.isFeatured = true;
    else if (req.query.isFeatured === 'false') filter.isFeatured = false;
  }
  if (term) {
    filter.$or = [
      { name: { $regex: term, $options: 'i' } },
      { description: { $regex: term, $options: 'i' } },
      { tags: { $in: [new RegExp(term, 'i')] } }
    ];
  }

  // Handle random products
  if (random === 'true') {
    // For random products, exclude featured products and use aggregation
    filter.isFeatured = { $ne: true };
    
    const products = await Product.aggregate([
      { $match: filter },
      { $sample: { size: Number(limit) } }
    ]);

    return ApiResponse.paginated(res, 'Random products retrieved successfully', { products }, {
      total: products.length,
      page: 1,
      limit: Number(limit),
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
      filters: {
        applied: { random: true, ...filter },
        available: {
          id,
          name,
          categoryId,
          minPrice,
          maxPrice,
          inStock,
          product_ids,
          brandId,
          size,
          color
        }
      },
      sort: {
        by: 'random',
        order: 'random'
      }
    });
  }

  // Calculate pagination
  const skip = (Number(page) - 1) * Number(limit);
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  // Get total count
  const total = await Product.countDocuments(filter);

  // Get paginated results
  const products = await Product.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(Number(limit));

  // Calculate metadata
  const totalPages = Math.ceil(total / Number(limit));
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return ApiResponse.paginated(res, 'Products retrieved successfully', { products }, {
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
        categoryId,
        minPrice,
        maxPrice,
        inStock,
        product_ids,
        brandId,
        size,
        color
      }
    },
    sort: {
      by: sortBy,
      order: sortOrder
    }
  });
});

// Create a new product
export const createProduct = async (req, res) => {
  try {
    const { name, description, price, sku, categoryId, brandId, compareAtPrice, costPrice, stock, lowStockThreshold, availableSizes, colors, weight, dimensions, tags, status, isFeatured, seo, ratings, sizeChart } = req.body;
    const files = req.files;

    if (!name || !description || !price || !sku || !categoryId) {
      return res.status(400).json({
        type: 'ERROR',
        message: 'Missing required fields: name, description, price, sku, categoryId',
        data: null
      });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({
        type: 'ERROR',
        message: 'No image files uploaded',
        data: null
      });
    }

    // Parse colors if it is a string
    const parsedColors = parsePossiblyStringifiedArray(colors);
    const parsedWeight = parsePossiblyStringifiedArray(weight);
    const parsedDimensions = parsePossiblyStringifiedArray(dimensions);
    const parsedSeo = parsePossiblyStringifiedArray(seo);
    const parsedRatings = parsePossiblyStringifiedArray(ratings);

    const compressedImages = await Promise.all(files.map(async (file) => {
      const ext = path.extname(file.filename).toLowerCase();
      const filePath = file.path;
      const compressedPath = filePath.replace(ext, `-compressed${ext}`);

      try {
        await sharp(filePath)
          .resize({ width: 1200 }) // Resize to max width 1200px
          .jpeg({ quality: 70 }) // Compress JPEG quality
          .toFile(compressedPath);

        // Remove the original file
        await fs.promises.unlink(filePath).catch(err => {
          console.warn(`Could not delete original file ${filePath}: ${err.message}`);
        });

        return compressedPath;
      } catch (err) {
        console.error(`Error processing image ${filePath}: ${err.message}`);
        return filePath; // Fallback to original file if compression fails
      }
    }));

    const mediaArr = compressedImages.map(image => ({
      url: image,
      type: 'image',
      alt: ''
    }));
    const uniqueMediaArr = [];
    const seenUrls = new Set();
    for (const img of mediaArr) {
      if (!seenUrls.has(img.url)) {
        uniqueMediaArr.push(img);
        seenUrls.add(img.url);
      }
    }

    const product = new Product({
      name,
      description,
      price,
      sku,
      categoryId,
      brandId,
      compareAtPrice,
      costPrice,
      stock,
      lowStockThreshold,
      availableSizes,
      colors: parsedColors,
      weight: parsedWeight,
      dimensions: parsedDimensions,
      tags,
      status,
      isFeatured,
      seo: parsedSeo,
      ratings: parsedRatings,
      imageUrl: uniqueMediaArr[0]?.url || '',
      media: uniqueMediaArr,
      sizeChart: (sizeChart && mongoose.Types.ObjectId.isValid(sizeChart)) ? sizeChart : null
    });

    await product.save();

    return res.status(201).json({
      type: 'OK',
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    return res.status(500).json({
      type: 'ERROR',
      message: error.message,
      data: null
    });
  }
};

// Update a product
export const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.query;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid product ID');
  }

  const updates = { ...req.body };
  
  // Parse colors if it is a string or array of strings
  if (updates.colors) {
    if (typeof updates.colors === 'string') {
      try {
        updates.colors = JSON.parse(updates.colors);
      } catch (e) {
        return res.status(400).json({
          type: 'ERROR',
          message: 'Invalid colors format. Must be an array of objects.',
          data: null
        });
      }
    }
    if (Array.isArray(updates.colors)) {
      try {
        updates.colors = updates.colors.map(c => {
          if (typeof c === 'string') {
            return JSON.parse(c);
          }
          return c;
        });
      } catch (e) {
        return res.status(400).json({
          type: 'ERROR',
          message: 'Invalid colors format. Each color must be an object or a valid JSON string.',
          data: null
        });
      }
    }
  }

  // Handle image deletions if requested
  if (updates.deletedImages && Array.isArray(updates.deletedImages)) {
    const product = await Product.findById(id);
    if (product) {
      // Remove images from media array
      product.media = product.media.filter(m => !updates.deletedImages.includes(m.url));
      // Remove main image if it's in deletedImages
      if (updates.deletedImages.includes(product.imageUrl)) {
        product.imageUrl = '';
      }
      // Delete files from filesystem
      for (const url of updates.deletedImages) {
        const filePath = path.join(process.cwd(), url.startsWith('/') ? url.substring(1) : url);
        try {
          await fs.promises.unlink(filePath);
        } catch (err) {
          // Ignore if file doesn't exist
        }
      }
      await product.save();

      // If all images are deleted, ensure updates reflect this
      if (!product.imageUrl && (!product.media || product.media.length === 0)) {
        updates.imageUrl = '';
        updates.media = [];
      }
    }
    // Remove deletedImages from updates so it doesn't get set as a field
    delete updates.deletedImages;
  }

  // Handle file uploads if present
  if (req.files && req.files.length > 0) {
    // Fetch current product to get existing media
    const product = await Product.findById(id);
    let existingMedia = product && Array.isArray(product.media) ? product.media : [];

    // Prepare new media objects from uploaded files
    const newMediaArr = [];
    for (let i = 0; i < req.files.length; i++) {
      const filePath = req.files[i].path;
      let mediaPath = filePath.split('uploads')[1];
      mediaPath = mediaPath.startsWith('/') ? mediaPath : `/${mediaPath}`;
      newMediaArr.push({ url: `uploads${mediaPath}`, type: 'image', alt: '' });
    }

    // Combine existing and new media, then deduplicate by url
    const combinedMedia = [...existingMedia, ...newMediaArr];
    const uniqueMediaArr = [];
    const seenUrls = new Set();
    for (const img of combinedMedia) {
      if (!seenUrls.has(img.url)) {
        uniqueMediaArr.push(img);
        seenUrls.add(img.url);
      }
    }
    updates.media = uniqueMediaArr;
    updates.imageUrl = uniqueMediaArr[0]?.url || '';
  } else {
    // If no new files uploaded, do not overwrite media array
    if ('media' in updates) {
      delete updates.media;
    }
  }

  if (updates.categoryId && !mongoose.Types.ObjectId.isValid(updates.categoryId)) {
    throw new ApiError(400, 'Invalid category ID');
  }

  // Parse numeric values if they exist in the updates
  if (updates.price) updates.price = parseFloat(updates.price);
  if (updates.stock) updates.stock = parseInt(updates.stock);
  if (updates.lowStockThreshold) updates.lowStockThreshold = parseFloat(updates.lowStockThreshold);
  
  // Parse availableSizes if it's an array in form data
  if (updates.availableSizes) {
    if (Array.isArray(updates.availableSizes)) {
      // Keep as is if it's already an array
    } else {
      updates.availableSizes = [updates.availableSizes];
    }
  }

  if (updates.sizeChart) {
    if (mongoose.Types.ObjectId.isValid(updates.sizeChart)) {
      updates.sizeChart = updates.sizeChart;
    } else {
      updates.sizeChart = null;
    }
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    id,
    updates,
    { new: true }
  );

  if (!updatedProduct) {
    throw new ApiError(404, 'Product not found');
  }

  return ApiResponse.success(res, 'Product updated successfully', { product: updatedProduct });
});

// Delete a product
export const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.query;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid product ID');
  }

  const deletedProduct = await Product.findByIdAndDelete(id);
  if (!deletedProduct) {
    throw new ApiError(404, 'Product not found');
  }

  return ApiResponse.success(res, 'Product deleted successfully');
});
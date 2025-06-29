import mongoose, { Schema } from 'mongoose';

const ProductSchema = new Schema(
  {
    name: { 
      type: String, 
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [2, 'Product name must be at least 2 characters long'],
      maxlength: [100, 'Product name cannot exceed 100 characters']
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true
    },
    description: { 
      type: String, 
      required: [true, 'Product description is required'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    price: { 
      type: Number, 
      required: [true, 'Product price is required'],
      min: [0, 'Price cannot be negative']
    },
    compareAtPrice: {
      type: Number,
      min: [0, 'Compare at price cannot be negative']
    },
    costPrice: {
      type: Number,
      min: [0, 'Cost price cannot be negative']
    },
    imageUrl: {
      type: String,
      trim: true
    },
    media: [{
      url: { type: String, required: true },
      type: { type: String, enum: ['image', 'video'], default: 'image' },
      alt: { type: String }
    }],
    stock: { 
      type: Number, 
      required: true, 
      default: 0,
      min: [0, 'Stock cannot be negative']
    },
    categoryId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Category', 
      required: [true, 'Category is required'],
      index: true 
    },
    brandId: {
      type: Schema.Types.ObjectId,
      ref: 'Brand',
      index: true
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      trim: true
    },
    barcode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },
    lowStockThreshold: { 
      type: Number,
      min: [0, 'Low stock threshold cannot be negative']
    },
    availableSizes: [{ 
      type: String,
      trim: true
    }],
    colors: [{
      name: { type: String, required: true },
      code: { type: String, required: true }
    }],
    weight: {
      value: { type: Number, min: 0 },
      unit: { type: String, enum: ['g', 'kg', 'lb', 'oz'], default: 'g' }
    },
    dimensions: {
      length: { type: Number, min: 0 },
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
      unit: { type: String, enum: ['cm', 'm', 'in'], default: 'cm' }
    },
    tags: [{
      type: String,
      trim: true
    }],
    status: {
      type: String,
      enum: ['draft', 'active', 'archived', 'out_of_stock'],
      default: 'draft'
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    seo: {
      title: { type: String, trim: true },
      description: { type: String, trim: true },
      keywords: [{ type: String, trim: true }]
    },
    ratings: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0, min: 0 }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for id
ProductSchema.virtual('id').get(function () {
  return this._id.toString();
});

// Virtual for categoryName
ProductSchema.virtual('categoryName').get(function () {
  if (this.populated('categoryId') && this.categoryId?.name) {
    return this.categoryId.name;
  }
  return undefined;
});

// Virtual for brandName
ProductSchema.virtual('brandName').get(function () {
  if (this.populated('brandId') && this.brandId?.name) {
    return this.brandId.name;
  }
  return undefined;
});

// Virtual for discount percentage
ProductSchema.virtual('discountPercentage').get(function () {
  if (this.compareAtPrice && this.price) {
    return Math.round(((this.compareAtPrice - this.price) / this.compareAtPrice) * 100);
  }
  return 0;
});

// Pre-save middleware to generate slug
ProductSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Pre-save middleware to update status based on stock
ProductSchema.pre('save', function(next) {
  if (this.isModified('stock')) {
    if (this.stock <= 0) {
      this.status = 'out_of_stock';
    } else if (this.status === 'out_of_stock') {
      this.status = 'active';
    }
  }
  next();
});

// Static method to find products by category
ProductSchema.statics.findByCategory = function(categoryId) {
  return this.find({ categoryId, status: 'active' })
    .populate('categoryId', 'name')
    .populate('brandId', 'name');
};

// Static method to find featured products
ProductSchema.statics.findFeatured = function(limit = 10) {
  return this.find({ isFeatured: true, status: 'active' })
    .populate('categoryId', 'name')
    .populate('brandId', 'name')
    .limit(limit);
};

// Static method to search products
ProductSchema.statics.search = function(query) {
  return this.find({
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { sku: { $regex: query, $options: 'i' } },
      { tags: { $in: [new RegExp(query, 'i')] } }
    ],
    status: 'active'
  })
  .populate('categoryId', 'name')
  .populate('brandId', 'name');
};

// Create indexes
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });
ProductSchema.index({ name: 1 });
ProductSchema.index({ createdAt: -1 });
ProductSchema.index({ status: 1 });
ProductSchema.index({ isFeatured: 1 });
ProductSchema.index({ 'ratings.average': -1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ slug: 1 });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

export { Product };
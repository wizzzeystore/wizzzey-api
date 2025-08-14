import mongoose, { Schema } from 'mongoose';

const ProductVariantSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
      index: true
    },
    color: {
      name: { 
        type: String, 
        required: [true, 'Color name is required'],
        trim: true
      },
      code: { 
        type: String, 
        required: [true, 'Color code is required'],
        trim: true
      }
    },
    size: {
      type: String,
      required: [true, 'Size is required'],
      trim: true
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      trim: true
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
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
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Stock cannot be negative']
    },
    lowStockThreshold: {
      type: Number,
      min: [0, 'Low stock threshold cannot be negative']
    },
    images: [{
      url: { type: String, required: true },
      type: { type: String, enum: ['image', 'video'], default: 'image' },
      alt: { type: String }
    }],
    barcode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },
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
    status: {
      type: String,
      enum: ['active', 'inactive', 'out_of_stock'],
      default: 'active'
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for id
ProductVariantSchema.virtual('id').get(function () {
  return this._id.toString();
});

// Virtual for discount percentage
ProductVariantSchema.virtual('discountPercentage').get(function () {
  if (this.compareAtPrice && this.price) {
    return Math.round(((this.compareAtPrice - this.price) / this.compareAtPrice) * 100);
  }
  return 0;
});

// Virtual for inStock
ProductVariantSchema.virtual('inStock').get(function () {
  return this.stock > 0;
});

// Pre-save middleware to update status based on stock
ProductVariantSchema.pre('save', function(next) {
  if (this.isModified('stock')) {
    if (this.stock <= 0) {
      this.status = 'out_of_stock';
    } else if (this.status === 'out_of_stock') {
      this.status = 'active';
    }
  }
  next();
});

// Static method to find variants by product
ProductVariantSchema.statics.findByProduct = function(productId) {
  return this.find({ productId, status: 'active' })
    .populate('productId', 'name description categoryId brandId');
};

// Static method to find variants by color
ProductVariantSchema.statics.findByColor = function(productId, colorName) {
  return this.find({ 
    productId, 
    'color.name': colorName,
    status: 'active' 
  });
};

// Static method to find default variant
ProductVariantSchema.statics.findDefault = function(productId) {
  return this.findOne({ productId, isDefault: true });
};

// Create indexes
ProductVariantSchema.index({ productId: 1, 'color.name': 1, size: 1 });
ProductVariantSchema.index({ sku: 1 });
ProductVariantSchema.index({ barcode: 1 });
ProductVariantSchema.index({ status: 1 });
ProductVariantSchema.index({ isDefault: 1 });

const ProductVariant = mongoose.models.ProductVariant || mongoose.model('ProductVariant', ProductVariantSchema);

export { ProductVariant }; 
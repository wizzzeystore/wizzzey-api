import mongoose, { Schema } from 'mongoose';

const HardInventorySchema = new Schema(
  {
    brandName: {
      type: String,
      required: [true, 'Brand name is required'],
      trim: true,
      index: true
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      trim: true,
      index: true
    },
    size: {
      type: String,
      required: [true, 'Size is required'],
      trim: true
    },
    color: {
      type: String,
      trim: true,
      default: null
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      default: 0
    },
    platform: {
      type: String,
      required: [true, 'Platform is required'],
      enum: ['amazon', 'myntra', 'flipkart', 'nykaa', 'other'],
      index: true
    },
    platformSku: {
      type: String,
      trim: true,
      default: null
    },
    platformProductId: {
      type: String,
      trim: true,
      default: null
    },
    platformUrl: {
      type: String,
      trim: true,
      default: null
    },
    platformPrice: {
      type: Number,
      min: 0,
      default: null
    },
    platformStatus: {
      type: String,
      enum: ['active', 'inactive', 'pending', 'suspended'],
      default: 'active'
    },
    status: {
      type: String,
      enum: ['in_stock', 'low_stock', 'out_of_stock'],
      default: 'in_stock'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    lastSyncAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for id
HardInventorySchema.virtual('id').get(function() {
  return this._id.toString();
});

// Compound indexes for efficient filtering
HardInventorySchema.index({ brandName: 1, sku: 1, size: 1, color: 1 });
HardInventorySchema.index({ platform: 1, platformSku: 1 });
HardInventorySchema.index({ platform: 1, status: 1 });
HardInventorySchema.index({ status: 1 });
HardInventorySchema.index({ isActive: 1 });
HardInventorySchema.index({ lastUpdated: -1 });
HardInventorySchema.index({ lastSyncAt: -1 });

// Pre-save middleware to update lastUpdated
HardInventorySchema.pre('save', function(next) {
  if (this.isModified('quantity')) {
    this.lastUpdated = new Date();
  }
  next();
});

// Static method to get items by platform
HardInventorySchema.statics.getByPlatform = function(platform) {
  return this.find({
    platform: platform,
    isActive: true
  }).sort({ lastUpdated: -1 });
};

// Static method to get low stock items by platform
HardInventorySchema.statics.getLowStockByPlatform = function(platform, threshold = 10) {
  return this.find({
    platform: platform,
    quantity: { $lte: threshold },
    status: { $ne: 'out_of_stock' },
    isActive: true
  }).sort({ quantity: 1 });
};

// Static method to get out of stock items by platform
HardInventorySchema.statics.getOutOfStockByPlatform = function(platform) {
  return this.find({
    platform: platform,
    quantity: 0,
    isActive: true
  }).sort({ lastUpdated: -1 });
};

const HardInventory = mongoose.models.HardInventory || mongoose.model('HardInventory', HardInventorySchema);

export { HardInventory }; 
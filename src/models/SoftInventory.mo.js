import mongoose, { Schema } from 'mongoose';

const SoftInventorySchema = new Schema(
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
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for id
SoftInventorySchema.virtual('id').get(function() {
  return this._id.toString();
});

// Compound index for efficient filtering
SoftInventorySchema.index({ brandName: 1, sku: 1, size: 1, color: 1 });
SoftInventorySchema.index({ status: 1 });
SoftInventorySchema.index({ isActive: 1 });
SoftInventorySchema.index({ lastUpdated: -1 });

// Pre-save middleware to update lastUpdated
SoftInventorySchema.pre('save', function(next) {
  if (this.isModified('quantity')) {
    this.lastUpdated = new Date();
  }
  next();
});

// Static method to get low stock items
SoftInventorySchema.statics.getLowStockItems = function(threshold = 10) {
  return this.find({
    quantity: { $lte: threshold },
    status: { $ne: 'out_of_stock' },
    isActive: true
  }).sort({ quantity: 1 });
};

// Static method to get out of stock items
SoftInventorySchema.statics.getOutOfStockItems = function() {
  return this.find({
    quantity: 0,
    isActive: true
  }).sort({ lastUpdated: -1 });
};

const SoftInventory = mongoose.models.SoftInventory || mongoose.model('SoftInventory', SoftInventorySchema);

export { SoftInventory }; 
import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  // Product Information
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true, 
    index: true 
  },
  productName: { 
    type: String,
    required: true,
    trim: true
  },
  brandName: {
    type: String,
    required: true,
    trim: true
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  size: {
    type: String,
    required: true,
    trim: true
  },
  color: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  type: {
    type: String,
    enum: ['soft', 'hard'],
    required: true
  },
  platform: {
    type: String,
    required: function() {
      return this.type === 'hard';
    },
    trim: true
  },
  // Location and Supplier Information
  location: { 
    type: String,
    required: true
  },
  warehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  costPrice: { 
    type: Number,
    required: true
  },
  supplier: { 
    type: String,
    required: true
  },
  batchNumber: { 
    type: String 
  },
  expirationDate: { 
    type: Date 
  },
  notes: { 
    type: String 
  },
  // Status and Tracking
  status: {
    type: String,
    enum: ['in_stock', 'low_stock', 'out_of_stock', 'discontinued'],
    default: 'in_stock'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastStockUpdatedAt: { 
    type: Date, 
    default: Date.now, 
    required: true 
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for id
inventorySchema.virtual('id').get(function() {
  return this._id.toString();
});

// Indexes for efficient querying
inventorySchema.index({ brandName: 1, sku: 1 });
inventorySchema.index({ type: 1 });
inventorySchema.index({ platform: 1 });
inventorySchema.index({ productId: 1 });
inventorySchema.index({ warehouseId: 1 });
inventorySchema.index({ status: 1 });

// Pre-save middleware to update lastStockUpdatedAt
inventorySchema.pre('save', function(next) {
  if (this.isModified('quantity')) {
    this.lastStockUpdatedAt = new Date();
  }
  next();
});

const Inventory = mongoose.models.Inventory || mongoose.model('Inventory', inventorySchema);

export { Inventory }; 
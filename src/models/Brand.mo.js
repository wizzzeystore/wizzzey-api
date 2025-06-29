import mongoose, { Schema } from 'mongoose';

const brandSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Brand name is required'],
    unique: true,
    trim: true,
    minlength: [2, 'Brand name must be at least 2 characters long'],
    maxlength: [50, 'Brand name cannot exceed 50 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  logo: {
    url: {
      type: String,
      validate: {
        validator: function(v) {
          // Allow both full URLs and relative paths starting with /uploads/
          return !v || v.startsWith('http://') || v.startsWith('https://') || v.startsWith('/uploads/');
        },
        message: 'Logo URL must be a valid URL or a relative path starting with /uploads/'
      }
    },
    alt: { type: String }
  },
  website: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || v.startsWith('http://') || v.startsWith('https://');
      },
      message: 'Website URL must be a valid URL'
    }
  },
  contact: {
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function(v) {
          return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Invalid email address'
      }
    },
    phone: {
      type: String,
      trim: true
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String
    }
  },
  socialMedia: {
    facebook: String,
    twitter: String,
    instagram: String,
    linkedin: String
  },
  orderPlaced: [{
    orderId: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'cancelled'],
      default: 'pending'
    },
    deliveryDate: Date,
    notes: String,
    items: [{
      productId: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: 1
      },
      price: {
        type: Number,
        required: true,
        min: 0
      }
    }],
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  outOfStockOrders: [{
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    status: {
      type: String,
      enum: ['pending', 'submitted', 'received', 'cancelled'],
      default: 'pending'
    },
    submittedAt: Date,
    expectedDeliveryDate: Date,
    notes: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  seo: {
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    keywords: [{ type: String, trim: true }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for id
brandSchema.virtual('id').get(function() {
  return this._id.toString();
});

// Virtual for product count
brandSchema.virtual('productCount', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'brandId',
  count: true
});

// Virtual for active orders count
brandSchema.virtual('activeOrdersCount').get(function() {
  return this.orderPlaced.filter(order => 
    ['pending', 'processing'].includes(order.status)
  ).length;
});

// Virtual for pending out of stock orders count
brandSchema.virtual('pendingOutOfStockOrdersCount').get(function() {
  return this.outOfStockOrders.filter(order => 
    order.status === 'pending'
  ).length;
});

// Pre-save middleware to generate slug
brandSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Pre-save middleware to update timestamps for orders
brandSchema.pre('save', function(next) {
  if (this.isModified('orderPlaced')) {
    this.orderPlaced.forEach(order => {
      if (order.isModified) {
        order.updatedAt = new Date();
      }
    });
  }
  if (this.isModified('outOfStockOrders')) {
    this.outOfStockOrders.forEach(order => {
      if (order.isModified) {
        order.updatedAt = new Date();
      }
    });
  }
  next();
});

// Static method to find active brands
brandSchema.statics.findActive = function() {
  return this.find({ isActive: true })
    .sort({ displayOrder: 1, name: 1 });
};

// Static method to find brands with pending orders
brandSchema.statics.findWithPendingOrders = function() {
  return this.find({
    'orderPlaced.status': { $in: ['pending', 'processing'] }
  }).populate('orderPlaced.items.productId', 'name sku');
};

// Create indexes
brandSchema.index({ name: 'text', description: 'text' });
brandSchema.index({ slug: 1 });
brandSchema.index({ isActive: 1 });
brandSchema.index({ displayOrder: 1 });
brandSchema.index({ 'orderPlaced.status': 1 });
brandSchema.index({ 'orderPlaced.createdAt': -1 });
brandSchema.index({ 'outOfStockOrders.status': 1 });
brandSchema.index({ 'outOfStockOrders.createdAt': -1 });
brandSchema.index({ createdAt: -1 });

const Brand = mongoose.models.Brand || mongoose.model('Brand', brandSchema);

export { Brand }; 
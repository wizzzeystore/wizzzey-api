import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const UserSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['Admin', 'Customer', 'Moderator', 'BrandPartner'],
    default: 'Customer'
  },
  // Brand assignment for BrandPartner role (salesmen)
  assignedBrand: {
    type: Schema.Types.ObjectId,
    ref: 'Brand',
    required: function() {
      return this.role === 'BrandPartner';
    }
  },
  // Permissions for different roles
  permissions: {
    canManageUsers: {
      type: Boolean,
      default: false
    },
    canManageProducts: {
      type: Boolean,
      default: false
    },
    canManageOrders: {
      type: Boolean,
      default: false
    },
    canManageInventory: {
      type: Boolean,
      default: false
    },
    canManageBrands: {
      type: Boolean,
      default: false
    },
    canViewAnalytics: {
      type: Boolean,
      default: false
    },
    canManageReturnExchange: {
      type: Boolean,
      default: false
    }
  },
  phone: {
    type: String,
    trim: true
  },
  shippingAddress: {
    type: Object,
    trim: true
  },
  billingAddress: {
    type: Object,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  verificationToken: String,
  verificationTokenExpires: Date,
  isVerified: {
    type: Boolean,
    default: false
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  lastLogin: Date,
  // Additional fields for brand partner workflow
  lastOrderProcessed: Date,
  totalOrdersProcessed: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
  return `${this.name}`;
});

// Virtual for role display name
UserSchema.virtual('roleDisplayName').get(function() {
  const roleNames = {
    'Admin': 'Administrator',
    'Customer': 'Customer',
    'Moderator': 'Moderator',
    'BrandPartner': 'Brand Partner'
  };
  return roleNames[this.role] || this.role;
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to set default permissions based on role
UserSchema.pre('save', function(next) {
  if (this.isModified('role')) {
    switch (this.role) {
      case 'Admin':
        this.permissions = {
          canManageUsers: true,
          canManageProducts: true,
          canManageOrders: true,
          canManageInventory: true,
          canManageBrands: true,
          canViewAnalytics: true,
          canManageReturnExchange: true
        };
        break;
      case 'Moderator':
        this.permissions = {
          canManageUsers: false,
          canManageProducts: true,
          canManageOrders: true,
          canManageInventory: true,
          canManageBrands: false,
          canViewAnalytics: true,
          canManageReturnExchange: false
        };
        break;
      case 'BrandPartner':
        this.permissions = {
          canManageUsers: false,
          canManageProducts: false,
          canManageOrders: true,
          canManageInventory: false,
          canManageBrands: false,
          canViewAnalytics: false,
          canManageReturnExchange: false
        };
        break;
      case 'Customer':
        this.permissions = {
          canManageUsers: false,
          canManageProducts: false,
          canManageOrders: false,
          canManageInventory: false,
          canManageBrands: false,
          canViewAnalytics: false,
          canManageReturnExchange: false
        };
        break;
    }
  }
  next();
});

// Method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate password reset token
UserSchema.methods.generatePasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return resetToken;
};

// Generate email verification token
UserSchema.methods.generateEmailVerificationToken = function() {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  this.verificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  this.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return verificationToken;
};

// Method to check if user has specific permission
UserSchema.methods.hasPermission = function(permission) {
  return this.permissions[permission] || false;
};

// Method to check if user can access brand-specific data
UserSchema.methods.canAccessBrand = function(brandId) {
  if (this.role === 'Admin' || this.role === 'Moderator') {
    return true;
  }
  if (this.role === 'BrandPartner') {
    return this.assignedBrand && this.assignedBrand.toString() === brandId.toString();
  }
  return false;
};

// Additional indexes
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ assignedBrand: 1 });
UserSchema.index({ email: 1 });

const User = mongoose.model('User', UserSchema);

export default User;
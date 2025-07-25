import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';
import path from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Define User Schema (matching User.mo.js)
const userSchema = new mongoose.Schema({
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
    type: mongoose.Schema.Types.ObjectId,
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
    canManageReturns: {
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

// Create User model
const User = mongoose.models.User || mongoose.model('User', userSchema);

// Admin permissions object
const ADMIN_PERMISSIONS = {
  canManageUsers: true,
  canManageProducts: true,
  canManageOrders: true,
  canManageInventory: true,
  canManageBrands: true,
  canViewAnalytics: true,
  canManageReturnExchange: true
};

async function createAdminUser(email, password) {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      console.log('Admin user already exists with this email');
      process.exit(0);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create admin user with all permissions
    const adminUser = new User({
      name: 'Admin',
      email,
      password: hashedPassword,
      role: 'Admin',
      permissions: ADMIN_PERMISSIONS,
      isActive: true
    });

    await adminUser.save();
    console.log('Admin user created successfully');
    console.log('Email:', email);
    console.log('Role: Admin');
    console.log('Permissions: All admin permissions granted');
    console.log('Permissions granted:');
    Object.entries(ADMIN_PERMISSIONS).forEach(([permission, value]) => {
      console.log(`  - ${permission}: ${value}`);
    });

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Get command line arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.log('Usage: node create-admin.js <email> <password>');
  process.exit(1);
}

const [email, password] = args;

// Validate email format
const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
if (!emailRegex.test(email)) {
  console.error('Invalid email format');
  process.exit(1);
}

// Validate password length
if (password.length < 6) {
  console.error('Password must be at least 6 characters long');
  process.exit(1);
}

// Create admin user
createAdminUser(email, password); 
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

// Define User Schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  role: {
    type: String,
    enum: ['Admin', 'Editor', 'Viewer'],
    default: 'Viewer'
  },
  permissions: {
    type: [String],
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create User model
const User = mongoose.models.User || mongoose.model('User', userSchema);

// All available permissions
const ALL_PERMISSIONS = [
  // General
  'general:view_dashboard',

  // Product Permissions
  'product:view_list',
  'product:view_details',
  'product:create',
  'product:edit',
  'product:delete',

  // Category Permissions
  'category:view_list',
  'category:create',
  'category:edit',
  'category:delete',

  // Order Permissions
  'order:view_list',
  'order:view_details',
  'order:edit_status',

  // Customer Permissions
  'customer:view_list',
  'customer:create',
  'customer:edit',
  'customer:delete',

  // Inventory Permissions
  'inventory:view_list',
  'inventory:create',
  'inventory:edit',
  'inventory:delete',

  // Discount Permissions
  'discount:view_list',
  'discount:create',
  'discount:edit',
  'discount:delete',

  // Blog Permissions
  'blog:view_list',
  'blog:create',
  'blog:edit',
  'blog:delete',

  // CMS Page Permissions
  'cms_page:view_list',
  'cms_page:create',
  'cms_page:edit',
  'cms_page:delete',

  // Task Permissions
  'task:view_list',
  'task:create',
  'task:edit',
  'task:delete',
  'task:assign',

  // Activity Log Permissions
  'activity_log:view_list',

  // User Management Permissions
  'user:view_list',
  'user:create',
  'user:edit',
  'user:delete',
  'user:edit_roles',

  // FAQ Permissions
  'faq:view_list',
  'faq:create',
  'faq:edit',
  'faq:delete',

  // Settings Permissions
  'settings:view',
  'settings:edit',
  'settings:edit_api',

  // Brand Permissions
  'brand:view_list',
  'brand:create',
  'brand:edit',
  'brand:delete',
];

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
      permissions: ALL_PERMISSIONS,
      isActive: true
    });

    await adminUser.save();
    console.log('Admin user created successfully');
    console.log('Email:', email);
    console.log('Role: Admin');
    console.log('Permissions: All permissions granted');

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
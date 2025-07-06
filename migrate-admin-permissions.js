import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Define User Schema (same as in User.mo.js)
const UserSchema = new mongoose.Schema({
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
const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function migrateAdminPermissions() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all admin users
    const adminUsers = await User.find({ role: 'Admin' });
    console.log(`Found ${adminUsers.length} admin users to migrate`);

    if (adminUsers.length === 0) {
      console.log('No admin users found to migrate');
      return;
    }

    // Update each admin user with proper permissions
    for (const user of adminUsers) {
      console.log(`Migrating admin user: ${user.email}`);
      
      // Set all admin permissions to true
      const updatedPermissions = {
        canManageUsers: true,
        canManageProducts: true,
        canManageOrders: true,
        canManageInventory: true,
        canManageBrands: true,
        canViewAnalytics: true
      };

      // Update the user with new permissions
      await User.findByIdAndUpdate(user._id, {
        $set: {
          permissions: updatedPermissions
        }
      }, { new: true });

      console.log(`✅ Successfully migrated admin user: ${user.email}`);
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log(`Updated ${adminUsers.length} admin users with proper permissions`);

  } catch (error) {
    console.error('❌ Error during migration:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the migration
migrateAdminPermissions(); 
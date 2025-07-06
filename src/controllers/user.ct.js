import UserModel from '../models/User.mo.js';
import mongoose from 'mongoose';
import { ApiResponse, ApiError, asyncHandler } from '../utils/responseHandler.ut.js';
import { Brand } from '../models/Brand.mo.js';

// Get all users with enhanced filtering and role-based access
export const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, role, isActive, id, assignedBrand } = req.query;
  const query = {};

  // Role-based filtering - BrandPartner can only see their own brand's users
  if (req.user.role === 'BrandPartner') {
    query.assignedBrand = req.user.assignedBrand._id;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  if (role) {
    query.role = role;
  }

  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  if (id) {
    query._id = id;
  }

  if (assignedBrand) {
    query.assignedBrand = assignedBrand;
  }

  const users = await UserModel.find(query)
    .select('-password')
    .populate('assignedBrand', 'name slug')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await UserModel.countDocuments(query);

  return ApiResponse.success(res, 'Users retrieved successfully', {
    users: users.map(user => user.toJSON()),
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit)
    }
  });
});

// Get users with pagination and filtering
export const getUsers = asyncHandler(async (req, res) => {
  const { 
    id, 
    name, 
    email,
    role,
    assignedBrand,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  if (id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid user ID');
    }

    const user = await UserModel.findById(id)
      .select('-password')
      .populate('assignedBrand', 'name slug');
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Check brand access for BrandPartner role
    if (req.user.role === 'BrandPartner' && user.assignedBrand) {
      if (user.assignedBrand._id.toString() !== req.user.assignedBrand._id.toString()) {
        throw new ApiError(403, 'Access denied to this user');
      }
    }

    return ApiResponse.success(res, 'User retrieved successfully', { user });
  }

  const filter = {};
  
  // Role-based filtering
  if (req.user.role === 'BrandPartner') {
    filter.assignedBrand = req.user.assignedBrand._id;
  }
  
  if (name) filter.name = { $regex: name, $options: 'i' };
  if (email) filter.email = { $regex: email, $options: 'i' };
  if (role) filter.role = role;
  if (assignedBrand) filter.assignedBrand = assignedBrand;

  const skip = (Number(page) - 1) * Number(limit);
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  const total = await UserModel.countDocuments(filter);

  const users = await UserModel.find(filter)
    .select('-password')
    .populate('assignedBrand', 'name slug')
    .sort(sort)
    .skip(skip)
    .limit(Number(limit));

  const totalPages = Math.ceil(total / Number(limit));
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return ApiResponse.paginated(res, 'Users retrieved successfully', { users }, {
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages,
    hasNextPage,
    hasPrevPage,
    filters: {
      applied: Object.keys(filter).length > 0 ? filter : null,
      available: { id, name, email, role, assignedBrand }
    },
    sort: { by: sortBy, order: sortOrder }
  });
});

// Create a new user
export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, assignedBrand, phone, permissions } = req.body;

  // Validate role permissions
  if (role === 'BrandPartner' && !assignedBrand) {
    throw new ApiError(400, 'Brand assignment is required for BrandPartner role');
  }

  if (assignedBrand && !mongoose.Types.ObjectId.isValid(assignedBrand)) {
    throw new ApiError(400, 'Invalid brand ID');
  }

  // Check if brand exists if assigned
  if (assignedBrand) {
    const brand = await Brand.findById(assignedBrand);
    if (!brand) {
      throw new ApiError(400, 'Assigned brand not found');
    }
  }

  // Check if user already exists
  const existingUser = await UserModel.findOne({ email });
  if (existingUser) {
    throw new ApiError(400, 'Email already exists');
  }

  // Role-based restrictions
  if (req.user.role === 'BrandPartner') {
    throw new ApiError(403, 'Brand partners cannot create users');
  }

  if (req.user.role === 'Moderator' && role === 'Admin') {
    throw new ApiError(403, 'Moderators cannot create admin users');
  }

  const userData = {
    name,
    email,
    password,
    role: role || 'Customer',
    phone
  };

  if (assignedBrand) {
    userData.assignedBrand = assignedBrand;
  }

  // Only allow custom permissions for Admin role
  if (permissions && req.user.role === 'Admin') {
    userData.permissions = permissions;
  }

  const user = new UserModel(userData);
  await user.save();

  const savedUser = await UserModel.findById(user._id)
    .select('-password')
    .populate('assignedBrand', 'name slug');

  return ApiResponse.success(res, 'User created successfully', { user: savedUser }, 201);
});

// Update user
export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid user ID');
  }

  const updates = req.body;
  delete updates.password; // Password updates handled separately
  
  const userToUpdate = await UserModel.findById(id);
  if (!userToUpdate) {
    throw new ApiError(404, 'User not found');
  }

  // Role-based access control
  if (req.user.role === 'BrandPartner') {
    if (userToUpdate.assignedBrand && userToUpdate.assignedBrand.toString() !== req.user.assignedBrand._id.toString()) {
      throw new ApiError(403, 'Access denied to this user');
    }
  }

  // Prevent role escalation
  if (updates.role) {
    if (req.user.role === 'Moderator' && updates.role === 'Admin') {
      throw new ApiError(403, 'Moderators cannot promote users to admin');
    }
    if (req.user.role === 'BrandPartner') {
      throw new ApiError(403, 'Brand partners cannot change user roles');
    }
  }

  // Validate brand assignment
  if (updates.assignedBrand) {
    if (!mongoose.Types.ObjectId.isValid(updates.assignedBrand)) {
      throw new ApiError(400, 'Invalid brand ID');
    }
    
    const brand = await Brand.findById(updates.assignedBrand);
    if (!brand) {
      throw new ApiError(400, 'Assigned brand not found');
    }
  }

  // Only allow permission updates for Admin role
  if (updates.permissions && req.user.role !== 'Admin') {
    delete updates.permissions;
  }

  const updatedUser = await UserModel.findByIdAndUpdate(
    id, 
    updates, 
    { new: true, runValidators: true }
  )
  .select('-password')
  .populate('assignedBrand', 'name slug');

  return ApiResponse.success(res, 'User updated successfully', { user: updatedUser });
});

// Delete user
export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.query;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid user ID');
  }

  const userToDelete = await UserModel.findById(id);
  if (!userToDelete) {
    throw new ApiError(404, 'User not found');
  }

  // Prevent self-deletion
  if (userToDelete._id.toString() === req.user.id) {
    throw new ApiError(400, 'Cannot delete your own account');
  }

  // Role-based access control
  if (req.user.role === 'BrandPartner') {
    if (userToDelete.assignedBrand && userToDelete.assignedBrand.toString() !== req.user.assignedBrand._id.toString()) {
      throw new ApiError(403, 'Access denied to this user');
    }
  }

  // Prevent deletion of admin users by non-admin
  if (userToDelete.role === 'Admin' && req.user.role !== 'Admin') {
    throw new ApiError(403, 'Only admins can delete admin users');
  }

  const deletedUser = await UserModel.findByIdAndDelete(id);
  return ApiResponse.success(res, 'User deleted successfully');
});

// Update own profile
export const updateOwnProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const updates = req.body;

  // Only allow certain fields to be updated by user
  const allowedUpdates = ['name', 'phone', 'shippingAddress', 'billingAddress'];
  const filteredUpdates = Object.keys(updates)
    .filter(key => allowedUpdates.includes(key))
    .reduce((obj, key) => {
      obj[key] = updates[key];
      return obj;
    }, {});

  const updatedUser = await UserModel.findByIdAndUpdate(
    userId, 
    filteredUpdates, 
    { new: true }
  )
  .select('-password')
  .populate('assignedBrand', 'name slug');

  if (!updatedUser) {
    throw new ApiError(404, 'User not found');
  }

  return ApiResponse.success(res, 'Profile updated successfully', { user: updatedUser });
});

// Get user statistics
export const getUserStats = asyncHandler(async (req, res) => {
  const stats = await UserModel.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
        activeCount: {
          $sum: { $cond: ['$isActive', 1, 0] }
        }
      }
    }
  ]);

  const totalUsers = await UserModel.countDocuments();
  const activeUsers = await UserModel.countDocuments({ isActive: true });

  return ApiResponse.success(res, 'User statistics retrieved successfully', {
    stats,
    total: totalUsers,
    active: activeUsers
  });
});

// Get users by role
export const getUsersByRole = asyncHandler(async (req, res) => {
  const { role } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const filter = { role };
  
  // BrandPartner can only see users from their assigned brand
  if (req.user.role === 'BrandPartner') {
    filter.assignedBrand = req.user.assignedBrand._id;
  }

  const users = await UserModel.find(filter)
    .select('-password')
    .populate('assignedBrand', 'name slug')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await UserModel.countDocuments(filter);

  return ApiResponse.success(res, `${role} users retrieved successfully`, {
    users,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit)
    }
  });
});

// Toggle user active status
export const toggleUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid user ID');
  }

  const user = await UserModel.findById(id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Prevent self-deactivation
  if (user._id.toString() === req.user.id) {
    throw new ApiError(400, 'Cannot deactivate your own account');
  }

  // Role-based access control
  if (req.user.role === 'BrandPartner') {
    if (user.assignedBrand && user.assignedBrand.toString() !== req.user.assignedBrand._id.toString()) {
      throw new ApiError(403, 'Access denied to this user');
    }
  }

  user.isActive = !user.isActive;
  await user.save();

  const updatedUser = await UserModel.findById(id)
    .select('-password')
    .populate('assignedBrand', 'name slug');

  return ApiResponse.success(res, `User ${user.isActive ? 'activated' : 'deactivated'} successfully`, { 
    user: updatedUser 
  });
});

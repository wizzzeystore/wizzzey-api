import UserModel from '../models/User.mo.js';
import mongoose from 'mongoose';
import { ApiResponse, ApiError } from '../utils/responseHandler.ut.js';

export const getAllUsers = async (req, res) => {
  const { page = 1, limit = 10, search, role, isActive, id } = req.query;
  const query = {};

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

  const users = await UserModel.find(query)
    .select('-password')
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
};

export const getUsers = async (req, res) => {
  const { 
    id, 
    name, 
    email,
    role,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  if (id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid user ID');
    }

    const user = await UserModel.findById(id);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return ApiResponse.success(res, 'User retrieved successfully', { user });
  }

  const filter = {};
  if (name) filter.name = { $regex: name, $options: 'i' };
  if (email) filter.email = { $regex: email, $options: 'i' };
  if (role) filter.role = role;

  const skip = (Number(page) - 1) * Number(limit);
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  const total = await UserModel.countDocuments(filter);

  const users = await UserModel.find(filter)
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
      available: { id, name, email, role }
    },
    sort: { by: sortBy, order: sortOrder }
  });
};

export const createUser = async (req, res) => {
  const { name, email, password, role } = req.body;

  const existingUser = await UserModel.findOne({ email });
  if (existingUser) {
    throw new ApiError(400, 'Email already exists');
  }

  const user = new UserModel({
    name,
    email,
    password,
    role: role || 'Customer'
  });

  await user.save();

  return ApiResponse.success(res, 'User created successfully', { user: user.toJSON() }, 201);
};

export const updateUser = async (req, res) => {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid user ID');
  }

  const updates = req.body;
  delete updates.password;
  
  const updatedUser = await UserModel.findByIdAndUpdate(
    id, 
    updates, 
    { new: true, runValidators: true }
  ).select('-password');

  if (!updatedUser) {
    throw new ApiError(404, 'User not found');
  }

  return ApiResponse.success(res, 'User updated successfully', { user: updatedUser });
};

export const deleteUser = async (req, res) => {
  const { id } = req.query;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid user ID');
  }

  const deletedUser = await UserModel.findByIdAndDelete(id);
  if (!deletedUser) {
    throw new ApiError(404, 'User not found');
  }

  return ApiResponse.success(res, 'User deleted successfully');
};

export const updateOwnProfile = async (req, res) => {
  const userId = req.user.id;
  const updates = req.body;

  const allowedUpdates = ['name', 'shippingAddress'];
  const filteredUpdates = Object.keys(updates)
    .filter(key => allowedUpdates.includes(key))
    .reduce((obj, key) => {
      obj[key] = updates[key];
      return obj;
    }, {});

  const updatedUser = await UserModel.findByIdAndUpdate(userId, filteredUpdates, { new: true });

  if (!updatedUser) {
    throw new ApiError(404, 'User not found');
  }

  return ApiResponse.success(res, 'Profile updated successfully', { user: updatedUser });
};

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import UserModel from '../models/User.mo.js';
import { ApiResponse, ApiError, asyncHandler } from '../utils/responseHandler.ut.js';
import crypto from 'crypto';

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user._id,
      role: user.role,
      assignedBrand: user.assignedBrand
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Send verification email
const sendVerificationEmail = async (email, token) => {
  // TODO: Implement email sending logic
  console.log(`Verification email would be sent to ${email} with token ${token}`);
};

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, shippingAddress, billingAddress } = req.body;

  // Check if user already exists
  const existingUser = await UserModel.findOne({ email });
  if (existingUser) {
    throw new ApiError(400, 'Email already registered');
  }

  // Create new user
  const user = new UserModel({
    name,
    email,
    password,
    role: 'Customer',
    phone,
    shippingAddress,
    billingAddress
  });

  // Generate email verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  user.verificationToken = verificationToken;
  user.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  await user.save();

  // Generate JWT token
  const token = generateToken(user);

  // Send verification email
  await sendVerificationEmail(email, verificationToken);

  return ApiResponse.success(res, 'Registration successful', {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      shippingAddress: user.shippingAddress,
      billingAddress: user.billingAddress
    },
    token
  }, 201);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  // Find user and include password
  const user = await UserModel.findOne({ email: email.toString() })
    .select('+password')
    .populate('assignedBrand', 'name slug');
    
  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }

  // Check if user is active
  if (!user.isActive) {
    throw new ApiError(401, 'Account is inactive');
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid credentials');
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Generate JWT token
  const token = generateToken(user);

  // Remove password from user object
  const userResponse = user.toJSON();
  delete userResponse.password;

  // Determine redirect URL based on role
  let redirectUrl = '/dashboard';
  
  if (user.role === 'BrandPartner' && user.assignedBrand) {
    redirectUrl = `/brands/${user.assignedBrand.slug}/orders`;
  } else if (user.role === 'Admin') {
    redirectUrl = '/admin/dashboard';
  } else if (user.role === 'Moderator') {
    redirectUrl = '/moderator/dashboard';
  } else if (user.role === 'Customer') {
    redirectUrl = '/profile';
  }

  return ApiResponse.success(res, 'Login successful', {
    user: userResponse,
    token,
    redirectUrl
  });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const user = await UserModel.findOne({
    verificationToken: token,
    verificationTokenExpires: { $gt: Date.now() },
    isVerified: false
  });

  if (!user) {
    throw new ApiError(400, 'Invalid or expired verification token');
  }

  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpires = undefined;
  await user.save();

  return ApiResponse.success(res, 'Email verified successfully');
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await UserModel.findOne({ email });
  if (!user) {
    throw new ApiError(404, 'No account found with this email');
  }

  // Generate reset token
  const resetToken = user.generatePasswordResetToken();
  await user.save();

  // TODO: Send reset password email
  console.log(`Password reset email would be sent to ${email} with token ${resetToken}`);

  return ApiResponse.success(res, 'Password reset instructions sent to your email');
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const user = await UserModel.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    throw new ApiError(400, 'Invalid or expired reset token');
  }

  // Update password
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  return ApiResponse.success(res, 'Password reset successful');
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await UserModel.findById(req.user.id).select('+password');

  // Verify current password
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    throw new ApiError(400, 'Current password is incorrect');
  }

  // Update password
  user.password = newPassword;
  await user.save();

  return ApiResponse.success(res, 'Password changed successfully');
});

export const getProfile = asyncHandler(async (req, res) => {
  const user = await UserModel.findById(req.user.id)
    .select('-password')
    .populate('assignedBrand', 'name slug');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return ApiResponse.success(res, 'Profile retrieved successfully', { user });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, shippingAddress, billingAddress } = req.body;

  const user = await UserModel.findById(req.user.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Update allowed fields
  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (shippingAddress) user.shippingAddress = shippingAddress;
  if (billingAddress) user.billingAddress = billingAddress;

  await user.save();

  const updatedUser = await UserModel.findById(req.user.id)
    .select('-password')
    .populate('assignedBrand', 'name slug');

  return ApiResponse.success(res, 'Profile updated successfully', { user: updatedUser });
});

// Get current user's permissions and access info
export const getCurrentUserInfo = asyncHandler(async (req, res) => {
  const user = await UserModel.findById(req.user.id)
    .select('-password')
    .populate('assignedBrand', 'name slug');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Determine available routes based on role and permissions
  const availableRoutes = [];
  
  if (user.role === 'Admin') {
    availableRoutes.push(
      '/admin/dashboard',
      '/admin/users',
      '/admin/products',
      '/admin/orders',
      '/admin/inventory',
      '/admin/brands',
      '/admin/analytics'
    );
  } else if (user.role === 'Moderator') {
    availableRoutes.push(
      '/moderator/dashboard',
      '/moderator/products',
      '/moderator/orders',
      '/moderator/inventory',
      '/moderator/analytics'
    );
  } else if (user.role === 'BrandPartner' && user.assignedBrand) {
    availableRoutes.push(
      `/brands/${user.assignedBrand.slug}/orders`,
      `/brands/${user.assignedBrand.slug}/out-of-stock`,
      `/brands/${user.assignedBrand.slug}/order-placed`
    );
  } else if (user.role === 'Customer') {
    availableRoutes.push(
      '/profile',
      '/orders',
      '/cart'
    );
  }

  return ApiResponse.success(res, 'User info retrieved successfully', {
    user,
    availableRoutes,
    permissions: user.permissions
  });
});

// Logout (client-side token removal)
export const logout = asyncHandler(async (req, res) => {
  // In a more sophisticated setup, you might want to blacklist the token
  // For now, we'll just return a success response
  return ApiResponse.success(res, 'Logout successful');
});
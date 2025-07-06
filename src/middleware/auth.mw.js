import jwt from 'jsonwebtoken';
import { ApiResponse, ApiError } from '../utils/responseHandler.ut.js';
import UserModel from '../models/User.mo.js';

export const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      throw new ApiError(401, 'No token provided');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user with populated assignedBrand
    const user = await UserModel.findById(decoded.userId).populate('assignedBrand', 'name slug');
    if (!user) {
      throw new ApiError(401, 'User not found');
    }

    if (!user.isActive) {
      throw new ApiError(401, 'User account is deactivated');
    }

    // Add user info to request
    req.user = {
      id: user._id,
      role: user.role,
      permissions: user.permissions,
      assignedBrand: user.assignedBrand,
      email: user.email,
      name: user.name
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return ApiResponse.error(res, 'Invalid token', 401);
    }
    if (error.name === 'TokenExpiredError') {
      return ApiResponse.error(res, 'Token expired', 401);
    }
    return ApiResponse.error(res, error.message, error.statusCode || 500);
  }
};

export const authorize = (roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          type: 'ERROR',
          message: 'Authentication required',
          data: null
        });
      }

      // Convert single role to array for consistency
      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          type: 'ERROR',
          message: `${allowedRoles.join(' or ')} access required`,
          data: null
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        type: 'ERROR',
        message: 'Server error',
        data: null
      });
    }
  }
};

// Middleware to check specific permissions
export const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          type: 'ERROR',
          message: 'Authentication required',
          data: null
        });
      }

      if (!req.user.permissions[permission]) {
        return res.status(403).json({
          type: 'ERROR',
          message: `Permission '${permission}' required`,
          data: null
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        type: 'ERROR',
        message: 'Server error',
        data: null
      });
    }
  }
};

// Middleware to check brand access for BrandPartner role
export const requireBrandAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        type: 'ERROR',
        message: 'Authentication required',
        data: null
      });
    }

    // Admin and Moderator can access all brands
    if (req.user.role === 'Admin' || req.user.role === 'Moderator') {
      return next();
    }

    // BrandPartner can only access their assigned brand
    if (req.user.role === 'BrandPartner') {
      const brandId = req.params.brandId || req.body.brandId || req.query.brandId;
      
      if (!brandId) {
        return res.status(400).json({
          type: 'ERROR',
          message: 'Brand ID required',
          data: null
        });
      }

      if (!req.user.assignedBrand || req.user.assignedBrand._id.toString() !== brandId.toString()) {
        return res.status(403).json({
          type: 'ERROR',
          message: 'Access denied to this brand',
          data: null
        });
      }
    }

    next();
  } catch (error) {
    return res.status(500).json({
      type: 'ERROR',
      message: 'Server error',
      data: null
    });
  }
};

// Middleware to update last login
export const updateLastLogin = async (req, res, next) => {
  try {
    if (req.user && req.user.id) {
      await UserModel.findByIdAndUpdate(req.user.id, { 
        lastLogin: new Date() 
      });
    }
    next();
  } catch (error) {
    // Don't block the request if last login update fails
    next();
  }
};

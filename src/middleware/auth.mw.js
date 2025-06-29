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
    
    // Get user
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      throw new ApiError(401, 'User not found');
    }

    // Add user info to request
    req.user = {
      id: user._id,
      role: user.role
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

export const authorize = (role) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          type: 'ERROR',
          message: 'Authentication required',
          data: null
        });
      }

      if (req.user.role !== role) {
        return res.status(403).json({
          type: 'ERROR',
          message: `${role} access required`,
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

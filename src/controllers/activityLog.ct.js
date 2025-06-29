import mongoose from 'mongoose';
import { ApiResponse, asyncHandler, ApiError } from '../utils/responseHandler.ut.js';
import ActivityLogModel from '../models/ActivityLog.mo.js';

export class ActivityLogController {
  async logActivity(req, res) {
    try {
      const { action, entityType, entityId, details } = req.body;
      const userId = req.user._id;

      const activityLog = new ActivityLogModel({
        userId,
        action,
        entityType,
        entityId,
        details,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      await activityLog.save();

      return ApiResponse.success(res, 'Activity logged successfully', {
        activityLog: activityLog.toJSON()
      }, 201);
    } catch (error) {
      console.error('Log activity error:', error);
      return ApiResponse.error(res, 'Failed to log activity');
    }
  }

  async getActivityLogs(req, res) {
    try {
      const { page = 1, limit = 10, userId, action, entityType, startDate, endDate } = req.query;
      const query = {};

      // Build filters
      if (userId) query.userId = userId;
      if (action) query.action = action;
      if (entityType) query.entityType = entityType;
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      // Execute query with pagination
      const logs = await ActivityLogModel.find(query)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      // Get total count for pagination
      const total = await ActivityLogModel.countDocuments(query);

      return ApiResponse.success(res, 'Activity logs retrieved successfully', {
        logs: logs.map(log => log.toJSON()),
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get activity logs error:', error);
      return ApiResponse.error(res, 'Failed to retrieve activity logs');
    }
  }

  async getActivityLogById(req, res) {
    try {
      const log = await ActivityLogModel.findById(req.params.id)
        .populate('userId', 'name email');

      if (!log) {
        return ApiResponse.error(res, 'Activity log not found', 404);
      }

      return ApiResponse.success(res, 'Activity log retrieved successfully', {
        log: log.toJSON()
      });
    } catch (error) {
      console.error('Get activity log by ID error:', error);
      return ApiResponse.error(res, 'Failed to retrieve activity log');
    }
  }

  async getUserActivityLogs(req, res) {
    try {
      const { page = 1, limit = 10, action, entityType, startDate, endDate } = req.query;
      const query = { userId: req.params.userId };

      // Add filters
      if (action) query.action = action;
      if (entityType) query.entityType = entityType;
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      // Execute query with pagination
      const logs = await ActivityLogModel.find(query)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      // Get total count for pagination
      const total = await ActivityLogModel.countDocuments(query);

      return ApiResponse.success(res, 'User activity logs retrieved successfully', {
        logs: logs.map(log => log.toJSON()),
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get user activity logs error:', error);
      return ApiResponse.error(res, 'Failed to retrieve user activity logs');
    }
  }

  async getActivityStats(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const matchStage = {};

      if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) matchStage.createdAt.$gte = new Date(startDate);
        if (endDate) matchStage.createdAt.$lte = new Date(endDate);
      }

      const stats = await ActivityLogModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              action: '$action',
              entityType: '$entityType'
            },
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: '$_id.entityType',
            actions: {
              $push: {
                action: '$_id.action',
                count: '$count'
              }
            },
            total: { $sum: '$count' }
          }
        }
      ]);

      return ApiResponse.success(res, 'Activity statistics retrieved successfully', {
        stats: stats.reduce((acc, curr) => {
          acc[curr._id] = {
            actions: curr.actions.reduce((actionAcc, action) => {
              actionAcc[action.action] = action.count;
              return actionAcc;
            }, {}),
            total: curr.total
          };
          return acc;
        }, {})
      });
    } catch (error) {
      console.error('Get activity stats error:', error);
      return ApiResponse.error(res, 'Failed to retrieve activity statistics');
    }
  }

  // Get all activity logs
  async getAllActivityLogs(req, res) {
    const { 
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Get total count
    const total = await ActivityLogModel.countDocuments();

    // Get paginated results
    const activityLogs = await ActivityLogModel.find()
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    // Calculate metadata
    const totalPages = Math.ceil(total / Number(limit));
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return ApiResponse.paginated(res, 'Activity logs retrieved successfully', { activityLogs }, {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages,
      hasNextPage,
      hasPrevPage,
      sort: {
        by: sortBy,
        order: sortOrder
      }
    });
  }

  // Create activity log
  async createActivityLog(req, res) {
    const activityLog = new ActivityLogModel(req.body);
    await activityLog.save();
    return ApiResponse.success(res, 'Activity log created successfully', { activityLog }, 201);
  }

  // Update activity log
  async updateActivityLog(req, res) {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid activity log ID');
    }

    const updatedActivityLog = await ActivityLogModel.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );

    if (!updatedActivityLog) {
      throw new ApiError(404, 'Activity log not found');
    }

    return ApiResponse.success(res, 'Activity log updated successfully', { activityLog: updatedActivityLog });
  }

  // Delete activity log
  async deleteActivityLog(req, res) {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid activity log ID');
    }

    const deletedActivityLog = await ActivityLogModel.findByIdAndDelete(id);
    if (!deletedActivityLog) {
      throw new ApiError(404, 'Activity log not found');
    }

    return ApiResponse.success(res, 'Activity log deleted successfully');
  }
} 
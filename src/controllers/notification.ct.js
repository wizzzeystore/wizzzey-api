import NotificationModel from '../models/Notification.mo.js';
import { ApiResponse, asyncHandler, ApiError } from '../utils/responseHandler.ut.js';
import mongoose from 'mongoose';

// Get all notifications with filters
export const getNotifications = asyncHandler(async (req, res) => {
  const { 
    id,
    userId,
    type,
    isRead,
    startDate,
    endDate,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Build filter
  const filter = {};
  if (id && mongoose.Types.ObjectId.isValid(id)) filter._id = id;
  if (userId && mongoose.Types.ObjectId.isValid(userId)) filter.userId = userId;
  if (type) filter.type = type;
  if (isRead !== undefined) filter.isRead = isRead === 'true';
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  // Calculate pagination
  const skip = (Number(page) - 1) * Number(limit);
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  // Get total count
  const total = await NotificationModel.countDocuments(filter);

  // Get paginated results
  const notifications = await NotificationModel.find(filter)
    .populate('userId')
    .sort(sort)
    .skip(skip)
    .limit(Number(limit));

  // Calculate metadata
  const totalPages = Math.ceil(total / Number(limit));
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return ApiResponse.paginated(res, 'Notifications retrieved successfully', { notifications }, {
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages,
    hasNextPage,
    hasPrevPage,
    sort: {
      by: sortBy,
      order: sortOrder
    },
    filters: {
      applied: Object.keys(filter).length > 0 ? filter : null,
      available: {
        id,
        userId,
        type,
        isRead,
        startDate,
        endDate
      }
    }
  });
});

// Get notifications for a specific user
export const getNotificationsForUser = asyncHandler(async (req, res) => {
  const { 
    type,
    isRead,
    startDate,
    endDate,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
    throw new ApiError(400, 'Invalid user ID');
  }

  // Build filter
  const filter = { userId: req.user.id };
  if (type) filter.type = type;
  if (isRead !== undefined) filter.isRead = isRead === 'true';
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  // Calculate pagination
  const skip = (Number(page) - 1) * Number(limit);
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  // Get total count
  const total = await NotificationModel.countDocuments(filter);

  // Get paginated results
  const notifications = await NotificationModel.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(Number(limit));

  // Calculate metadata
  const totalPages = Math.ceil(total / Number(limit));
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return ApiResponse.paginated(res, 'Notifications retrieved successfully', { notifications }, {
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages,
    hasNextPage,
    hasPrevPage,
    sort: {
      by: sortBy,
      order: sortOrder
    },
    filters: {
      applied: Object.keys(filter).length > 0 ? filter : null,
      available: {
        type,
        isRead,
        startDate,
        endDate
      }
    }
  });
});

// Create a new notification
export const createNotification = asyncHandler(async (req, res) => {
  const notification = new NotificationModel(req.body);
  await notification.save();
  return ApiResponse.success(res, 'Notification created successfully', { notification }, 201);
});

// Update a notification
export const updateNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid notification ID');
  }

  const updatedNotification = await NotificationModel.findByIdAndUpdate(
    id,
    req.body,
    { new: true }
  );

  if (!updatedNotification) {
    throw new ApiError(404, 'Notification not found');
  }

  return ApiResponse.success(res, 'Notification updated successfully', { notification: updatedNotification });
});

// Delete a notification
export const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid notification ID');
  }

  const deletedNotification = await NotificationModel.findByIdAndDelete(id);
  if (!deletedNotification) {
    throw new ApiError(404, 'Notification not found');
  }

  return ApiResponse.success(res, 'Notification deleted successfully');
});

// Get user notifications
export const getUserNotifications = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const notifications = await NotificationModel.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await NotificationModel.countDocuments({ userId: req.user._id });

  return ApiResponse.paginated(res, 'Notifications retrieved successfully', {
    notifications: notifications.map(n => n.toJSON())
  }, {
    total,
    page,
    limit
  });
});

// Mark notification as read
export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await NotificationModel.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  return ApiResponse.success(res, 'Notification marked as read', {
    notification: notification.toJSON()
  });
});

// Mark all notifications as read
export const markAllAsRead = asyncHandler(async (req, res) => {
  await NotificationModel.updateMany(
    { userId: req.user._id, isRead: false },
    { isRead: true }
  );

  return ApiResponse.success(res, 'All notifications marked as read');
});

// Get unread notification count
export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await NotificationModel.countDocuments({
    userId: req.user._id,
    isRead: false
  });

  return ApiResponse.success(res, 'Unread notification count retrieved', { count });
});

// Create notification (internal use)
export const createNotificationInternal = async (userId, title, message, type, data = {}) => {
  try {
    const notification = new NotificationModel({
      userId,
      title,
      message,
      type,
      data
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};
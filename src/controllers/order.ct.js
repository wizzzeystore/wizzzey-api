import { Order } from '../models/Order.mo.js';
import { createNotificationInternal } from '../controllers/notification.ct.js';
import { ApiResponse, asyncHandler, ApiError } from '../utils/responseHandler.ut.js';
import mongoose from 'mongoose';
import UserModel from '../models/User.mo.js';

// Get all orders
export const getAllOrders = asyncHandler(async (req, res) => {
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
  const total = await Order.countDocuments();

  // Get paginated results
  const orders = await Order.find()
    .sort(sort)
    .skip(skip)
    .limit(Number(limit));

  // Calculate metadata
  const totalPages = Math.ceil(total / Number(limit));
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return ApiResponse.paginated(res, 'Orders retrieved successfully', { orders }, {
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
});

// Get orders by current user ID
export const getOrdersByUserId = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  // Get total count of orders for this user
  const total = await Order.countDocuments({ 'customerInfo.customerId': req.user.id });

  // Get paginated orders for this user
  const orders = await Order.find({ 'customerInfo.customerId': req.user.id })
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  const totalPages = Math.ceil(total / limit);

  return ApiResponse.success(res, 'Orders retrieved successfully', {
    orders,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    },
    filters: {
      applied: {},
      available: {}
    },
    sort: {
      by: sortBy,
      order: sortOrder
    }
  });
});

// Get a single order by ID
export const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }
  return ApiResponse.success(res, 'Order retrieved successfully', { order });
});

// Helper function to send order notifications
const sendOrderNotifications = async (order) => {
  try {
    const notifications = [];

    // Notify the customer
    if (order.customerInfo.customerId) {
      await createNotificationInternal(
        order.customerInfo.customerId,
        'Order Placed Successfully',
        `Your order #${order._id} has been placed successfully`,
        'order',
        {
          orderId: order._id,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount
        }
      );
      notifications.push('customer');
    }

    // Notify the admin
    const admin = await UserModel.findOne({ role: 'Admin' });
    if (admin) {
      await createNotificationInternal(
        admin._id,
        'New Order Received',
        `New order #${order._id} has been placed`,
        'order',
        {
          orderId: order._id,
          orderNumber: order.orderNumber,
          customerInfo: order.customerInfo
        }
      );
      notifications.push('admin');
    }

    return notifications;
  } catch (error) {
    console.error('Error sending notifications:', error);
    return [];
  }
};

// Create a new order
export const createOrder = asyncHandler(async (req, res) => {
  const { customerInfo, items, totalAmount, status, notes } = req.body;
  const files = req.files;

  // Validate that each item includes productImage and selectedColor (optional, but recommended)
  // items.forEach(item => {
  //   if (!item.productImage) throw new ApiError(400, 'Each order item must include productImage');
  // });

  // Create order with user ID
  const order = new Order({
    customerInfo: {
      ...customerInfo,
      customerId: req.user.id // Use user ID as customer ID
    },
    items, // productImage and selectedColor will be stored if present
    totalAmount,
    status: status || "Pending",
    notes,
    media: files ? files.map(file => ({
      url: file.path,
      type: file.mimetype.startsWith('image/') ? 'image' : 'document',
      alt: file.originalname
    })) : [],
    statusHistory: [{
      status: status || "Pending",
      changedAt: new Date(),
      userId: req.user ? req.user._id : undefined
    }]
  });

  await order.save();

  // Send notifications
  const notifications = await sendOrderNotifications(order);

  return ApiResponse.success(res, 'Order created successfully', {
    order,
    notifications: {
      sent: notifications
    }
  }, 201);
});

// Update an order by ID
export const updateOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid order ID');
  }

  const order = await Order.findById(id);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  const prevStatus = order.status;
  const updates = req.body;

  // If status is being updated and is different, push to statusHistory
  if (updates.status && updates.status !== prevStatus) {
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status: updates.status,
      changedAt: new Date(),
      userId: req.user ? req.user._id : undefined
    });
    order.status = updates.status;
    // Remove status from updates so it doesn't get set again below
    delete updates.status;
  }

  // Update other fields
  Object.keys(updates).forEach(key => {
    order[key] = updates[key];
  });

  await order.save();

  return ApiResponse.success(res, 'Order updated successfully', { order });
});

// Delete an order by ID
export const deleteOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid order ID');
  }

  const deletedOrder = await Order.findByIdAndDelete(id);
  if (!deletedOrder) {
    throw new ApiError(404, 'Order not found');
  }

  return ApiResponse.success(res, 'Order deleted successfully');
});

// Get today's orders
export const getTodayOrders = asyncHandler(async (req, res) => {
  const { brandId } = req.query;
  console.log(brandId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const filter = {
    createdAt: {
      $gte: today,
      $lt: tomorrow
    }
  };

  if (brandId) {
    filter["items.brandId"] = brandId;
  }

  console.log(filter);

  const orders = await Order.find(filter)
    .populate('customerId')
    .populate('items.productId')
    .populate('items.brandId')
    .sort({ createdAt: -1 });

  const total = orders.length;
  const totalAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0);

  return ApiResponse.success(res, 'Today\'s orders retrieved successfully', {
    orders,
    summary: {
      total,
      totalAmount
    }
  });
});

// Get order summary
export const getOrderSummary = asyncHandler(async (req, res) => {
  const summary = await Order.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' }
      }
    }
  ]);

  return ApiResponse.success(res, 'Order summary retrieved successfully', {
    summary: {
      total: summary[0]?.total || 0,
      totalAmount: summary[0]?.totalAmount || 0
    }
  });
});

// Create a return/exchange request for an order item
export const createReturnRequest = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { itemId, type, reason, quantity, exchangeForSize, exchangeForColor } = req.body;
  if (!itemId || !type || !reason) {
    return ApiResponse.error(res, 'Missing required fields for return/exchange request', 400);
  }
  const order = await Order.findById(orderId);
  if (!order) return ApiResponse.error(res, 'Order not found', 404);
  const newReturn = {
    itemId,
    type,
    reason,
    quantity: quantity || 1,
    exchangeForSize,
    exchangeForColor,
    status: 'requested',
    requestedAt: new Date(),
  };
  order.returns.push(newReturn);
  await order.save();
  return ApiResponse.success(res, 'Return/exchange request created', { returns: order.returns }, 201);
});

// List all return/exchange requests for an order
export const getReturnRequests = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const order = await Order.findById(orderId);
  if (!order) return ApiResponse.error(res, 'Order not found', 404);
  return ApiResponse.success(res, 'Return/exchange requests retrieved', { returns: order.returns });
});

// Update a return/exchange request (admin)
export const updateReturnRequest = asyncHandler(async (req, res) => {
  const { orderId, returnId } = req.params;
  const { status, adminNotes } = req.body;
  const order = await Order.findById(orderId);
  if (!order) return ApiResponse.error(res, 'Order not found', 404);
  const ret = order.returns.id(returnId);
  if (!ret) return ApiResponse.error(res, 'Return/exchange request not found', 404);
  if (status) ret.status = status;
  if (adminNotes !== undefined) ret.adminNotes = adminNotes;
  if (status === 'approved' || status === 'rejected' || status === 'completed') {
    ret.processedAt = new Date();
  }
  await order.save();
  return ApiResponse.success(res, 'Return/exchange request updated', { return: ret });
});

// List all return/exchange requests across all orders (admin)
export const listAllReturnRequests = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, type, sortBy = 'requestedAt', sortOrder = 'desc' } = req.query;

  // Build match for filtering
  const match = {};
  if (status) match['returns.status'] = status;
  if (type) match['returns.type'] = type;

  // Unwind returns array, filter, and paginate
  const pipeline = [
    { $unwind: '$returns' },
    { $match: Object.keys(match).length ? match : {} },
    {
      $sort: {
        [`returns.${sortBy}`]: sortOrder === 'desc' ? -1 : 1
      }
    },
    {
      $facet: {
        data: [
          { $skip: (Number(page) - 1) * Number(limit) },
          { $limit: Number(limit) },
          {
            $project: {
              _id: 0,
              orderId: '$_id',
              orderNumber: 1,
              customerInfo: 1,
              returnRequest: '$returns',
              createdAt: 1,
              status: 1
            }
          }
        ],
        totalCount: [ { $count: 'count' } ]
      }
    }
  ];

  const result = await Order.aggregate(pipeline);
  const data = result[0]?.data || [];
  const total = result[0]?.totalCount?.[0]?.count || 0;
  const totalPages = Math.ceil(total / Number(limit));

  return ApiResponse.paginated(res, 'Return/exchange requests retrieved successfully', { requests: data }, {
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  });
});
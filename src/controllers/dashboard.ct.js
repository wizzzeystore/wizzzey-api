import {Order} from '../models/Order.mo.js';
import UserModel from '../models/User.mo.js';
import { ApiResponse, asyncHandler } from '../utils/responseHandler.ut.js';
import mongoose from 'mongoose';

// Get dashboard statistics
export const getDashboardStats = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get today's orders
  const todayOrders = await Order.find({
    createdAt: {
      $gte: today,
      $lt: tomorrow
    }
  }).populate('items.productId');

  // Calculate today's revenue
  const todayRevenue = todayOrders.reduce((sum, order) => sum + order.totalAmount, 0);

  // Get total orders and revenue
  const orderStats = await Order.aggregate([
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' }
      }
    }
  ]);

  // Get total customers
  const totalCustomers = await UserModel.find({role: 'Customer'}).countDocuments();

  // Get sales overview for the last 7 days
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);
  
  const salesOverview = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: last7Days }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        revenue: { $sum: '$totalAmount' },
        orders: { $sum: 1 }
      }
    },
    {
      $sort: { '_id': 1 }
    }
  ]);

  // Get top selling products
  const topSellingProducts = await Order.aggregate([
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        totalQuantity: { $sum: '$items.quantity' },
        totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        productName: { $first: '$items.productName' }
      }
    },
    { $sort: { totalQuantity: -1 } },
    { $limit: 5 }
  ]);

  return ApiResponse.success(res, 'Dashboard statistics retrieved successfully', {
    todayStats: {
      orders: todayOrders.length,
      revenue: todayRevenue
    },
    overallStats: {
      totalOrders: orderStats[0]?.totalOrders || 0,
      totalRevenue: orderStats[0]?.totalRevenue || 0,
      totalCustomers
    },
    salesOverview: salesOverview.map(day => ({
      date: day._id,
      revenue: day.revenue,
      orders: day.orders
    })),
    topSellingProducts: topSellingProducts.map(product => ({
      productId: product._id,
      productName: product.productName,
      totalQuantity: product.totalQuantity,
      totalRevenue: product.totalRevenue
    }))
  });
}); 
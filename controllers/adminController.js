const Product = require("../models/product");
const Category = require("../models/category");
const Order = require("../models/order");
const User = require("../models/user");
const Analytics = require("../models/analytics");
const mongoose = require("mongoose");

// Dashboard analytics
exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    // Get current month stats
    const currentMonthOrders = await Order.find({
      createdAt: { $gte: startOfMonth }
    });

    // Get last month stats for comparison
    const lastMonthOrders = await Order.find({
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
    });

    // Calculate current month revenue
    const currentMonthRevenue = currentMonthOrders.reduce((sum, order) => 
      order.payment.status === 'completed' ? sum + order.pricing.total : sum, 0
    );

    // Calculate last month revenue
    const lastMonthRevenue = lastMonthOrders.reduce((sum, order) => 
      order.payment.status === 'completed' ? sum + order.pricing.total : sum, 0
    );

    // Calculate growth percentages
    const revenueGrowth = lastMonthRevenue === 0 ? 100 : 
      ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
    
    const ordersGrowth = lastMonthOrders.length === 0 ? 100 :
      ((currentMonthOrders.length - lastMonthOrders.length) / lastMonthOrders.length) * 100;

    // Get total counts
    const totalProducts = await Product.countDocuments({ isActive: true });
    const totalUsers = await User.countDocuments({ role: 'user' });

    // Get recent orders
    const recentOrders = await Order.find()
      .populate('customer', 'name email')
      .populate('items.product', 'title')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get top products this month
    const topProducts = await Order.aggregate([
      { $match: { createdAt: { $gte: startOfMonth } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: '$productInfo' }
    ]);

    // Get daily sales data for the last 30 days
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const dailySales = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          'payment.status': 'completed'
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          revenue: { $sum: '$pricing.total' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get category performance
    const categoryPerformance = await Order.aggregate([
      { $match: { createdAt: { $gte: startOfMonth } } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: '$productInfo' },
      {
        $lookup: {
          from: 'categories',
          localField: 'productInfo.category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      { $unwind: '$categoryInfo' },
      {
        $group: {
          _id: '$categoryInfo._id',
          name: { $first: '$categoryInfo.name' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
          orders: { $sum: 1 }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          revenue: {
            current: currentMonthRevenue,
            growth: revenueGrowth
          },
          orders: {
            current: currentMonthOrders.length,
            growth: ordersGrowth
          },
          products: totalProducts,
          users: totalUsers
        },
        recentOrders,
        topProducts,
        dailySales,
        categoryPerformance
      }
    });

  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard statistics"
    });
  }
};

// Get all products for admin with enhanced filtering
exports.getAdminProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      status,
      stockStatus,
      sort = 'createdAt',
      order = 'desc'
    } = req.query;

    // Build query
    const query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (status && status !== 'all') {
      query.isActive = status === 'active';
    }

    if (stockStatus && stockStatus !== 'all') {
      if (stockStatus === 'outOfStock') {
        query.stock = 0;
      } else if (stockStatus === 'lowStock') {
        query.stock = { $gt: 0, $lte: 10 };
      } else if (stockStatus === 'inStock') {
        query.stock = { $gt: 10 };
      }
    }

    // Execute query
    const products = await Product.find(query)
      .populate('category', 'name')
      .sort({ [sort]: order === 'desc' ? -1 : 1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Product.countDocuments(query);

    // Add additional stats for each product
    const productsWithStats = await Promise.all(
      products.map(async (product) => {
        const orderStats = await Order.aggregate([
          { $unwind: '$items' },
          { $match: { 'items.product': product._id } },
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              totalQuantity: { $sum: '$items.quantity' },
              totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
            }
          }
        ]);

        const stats = orderStats[0] || { totalOrders: 0, totalQuantity: 0, totalRevenue: 0 };

        return {
          ...product.toObject(),
          stats
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        products: productsWithStats,
        pagination: {
          current: Number(page),
          pages: Math.ceil(total / Number(limit)),
          total,
          hasNext: Number(page) < Math.ceil(total / Number(limit)),
          hasPrev: Number(page) > 1
        }
      }
    });

  } catch (error) {
    console.error("Get admin products error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching products"
    });
  }
};

// Get all orders for admin with enhanced filtering
exports.getAdminOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      paymentStatus,
      dateFrom,
      dateTo,
      sort = 'createdAt',
      order = 'desc'
    } = req.query;

    // Build query
    const query = {};

    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'customerInfo.name': { $regex: search, $options: 'i' } },
        { 'customerInfo.email': { $regex: search, $options: 'i' } }
      ];
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (paymentStatus && paymentStatus !== 'all') {
      query['payment.status'] = paymentStatus;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    // Execute query
    const orders = await Order.find(query)
      .populate('customer', 'name email phone')
      .populate('items.product', 'title images')
      .sort({ [sort]: order === 'desc' ? -1 : 1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: {
          current: Number(page),
          pages: Math.ceil(total / Number(limit)),
          total,
          hasNext: Number(page) < Math.ceil(total / Number(limit)),
          hasPrev: Number(page) > 1
        }
      }
    });

  } catch (error) {
    console.error("Get admin orders error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching orders"
    });
  }
};

// Get single order details for admin
exports.getAdminOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }

    const order = await Order.findById(id)
      .populate('customer', 'name email phone')
      .populate('items.product', 'title images sku price stock');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Compute derived metrics
    const itemsSummary = order.items.map(i => ({
      productId: i.product?._id,
      title: i.productInfo?.title || i.product?.title,
      quantity: i.quantity,
      price: i.price,
      total: i.price * i.quantity,
      size: i.size,
      variants: i.variants
    }));

    res.status(200).json({
      success: true,
      data: {
        order,
        summary: {
          itemCount: order.items.length,
          subtotal: order.pricing?.subtotal || 0,
          total: order.pricing?.total || 0,
          paymentStatus: order.payment?.status,
          status: order.status,
          items: itemsSummary
        }
      }
    });
  } catch (error) {
    console.error('Get admin order by id error:', error);
    res.status(500).json({ success: false, message: 'Error fetching order details' });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, trackingNumber } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Update order
    const updateData = { status };
    if (adminNotes) updateData.adminNotes = adminNotes;
    if (trackingNumber) updateData['shipping.trackingNumber'] = trackingNumber;

    // Set shipped date if status is shipped
    if (status === 'shipped') {
      updateData['shipping.shippedAt'] = new Date();
    }

    // Set delivered date if status is delivered
    if (status === 'delivered') {
      updateData['shipping.deliveredAt'] = new Date();
      // Also set payment.status to completed
      updateData['payment.status'] = 'completed';
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      {
        $set: updateData,
        $push: {
          statusHistory: {
            status,
            updatedBy: req.user.id,
            updatedAt: new Date(),
            note: adminNotes
          }
        }
      },
      { new: true }
    ).populate('customer', 'name email');

    res.status(200).json({
      success: true,
      data: updatedOrder
    });

  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating order status"
    });
  }
};

// Get all customers for admin
exports.getAdminCustomers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      sort = 'createdAt',
      order = 'desc'
    } = req.query;

    // Build query
    const query = { role: 'user' };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { 'businessDetails.companyName': { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query
    const customers = await User.find(query)
      .select('-password')
      .sort({ [sort]: order === 'desc' ? -1 : 1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await User.countDocuments(query);

    // Add order statistics for each customer
    const customersWithStats = await Promise.all(
      customers.map(async (customer) => {
        const orderStats = await Order.aggregate([
          { $match: { customer: customer._id } },
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              totalSpent: { $sum: '$pricing.total' },
              lastOrderDate: { $max: '$createdAt' }
            }
          }
        ]);

        const stats = orderStats[0] || { totalOrders: 0, totalSpent: 0, lastOrderDate: null };

        return {
          ...customer.toObject(),
          stats: {
            ...stats,
            avgOrderValue: stats.totalOrders > 0 ? stats.totalSpent / stats.totalOrders : 0
          }
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        customers: customersWithStats,
        pagination: {
          current: Number(page),
          pages: Math.ceil(total / Number(limit)),
          total,
          hasNext: Number(page) < Math.ceil(total / Number(limit)),
          hasPrev: Number(page) > 1
        }
      }
    });

  } catch (error) {
    console.error("Get admin customers error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching customers"
    });
  }
};

// Get all categories for admin
exports.getAdminCategories = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      sort = 'name',
      order = 'asc'
    } = req.query;

    // Build query
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query
    const categories = await Category.find(query)
      .sort({ [sort]: order === 'desc' ? -1 : 1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Category.countDocuments(query);

    // Add statistics for each category
    const categoriesWithStats = await Promise.all(
      categories.map(async (category) => {
        const productCount = await Product.countDocuments({ 
          category: category._id, 
          isActive: true 
        });

        // Get sales data for this category
        const salesStats = await Order.aggregate([
          { $unwind: '$items' },
          {
            $lookup: {
              from: 'products',
              localField: 'items.product',
              foreignField: '_id',
              as: 'product'
            }
          },
          { $unwind: '$product' },
          { $match: { 'product.category': category._id } },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
              totalOrders: { $sum: 1 }
            }
          }
        ]);

        const stats = salesStats[0] || { totalRevenue: 0, totalOrders: 0 };

        return {
          ...category.toObject(),
          stats: {
            productCount,
            totalRevenue: stats.totalRevenue,
            totalOrders: stats.totalOrders
          }
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        categories: categoriesWithStats,
        pagination: {
          current: Number(page),
          pages: Math.ceil(total / Number(limit)),
          total,
          hasNext: Number(page) < Math.ceil(total / Number(limit)),
          hasPrev: Number(page) > 1
        }
      }
    });

  } catch (error) {
    console.error("Get admin categories error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching categories"
    });
  }
};

// Bulk update products
exports.bulkUpdateProducts = async (req, res) => {
  try {
    const { productIds, updates } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Product IDs are required"
      });
    }

    const result = await Product.updateMany(
      { _id: { $in: productIds } },
      { $set: updates }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} products updated successfully`,
      data: result
    });

  } catch (error) {
    console.error("Bulk update products error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating products"
    });
  }
};

// Export data
exports.exportData = async (req, res) => {
  try {
    const { type, dateFrom, dateTo } = req.query;
    
    let data = [];
    const dateQuery = {};
    
    if (dateFrom) dateQuery.$gte = new Date(dateFrom);
    if (dateTo) dateQuery.$lte = new Date(dateTo);
    
    switch (type) {
      case 'orders':
        data = await Order.find(dateQuery.hasOwnProperty('$gte') || dateQuery.hasOwnProperty('$lte') 
          ? { createdAt: dateQuery } : {})
          .populate('customer', 'name email')
          .populate('items.product', 'title')
          .lean();
        break;
        
      case 'products':
        data = await Product.find({})
          .populate('category', 'name')
          .lean();
        break;
        
      case 'customers':
        data = await User.find({ role: 'user' })
          .select('-password')
          .lean();
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: "Invalid export type"
        });
    }

    res.status(200).json({
      success: true,
      data,
      count: data.length
    });

  } catch (error) {
    console.error("Export data error:", error);
    res.status(500).json({
      success: false,
      message: "Error exporting data"
    });
  }
};

// Approve B2B customer
exports.approveCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;

    // Find the customer
    const customer = await User.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    // Check if customer is B2B
    if (customer.customerType !== 'B2B') {
      return res.status(400).json({
        success: false,
        message: "Only B2B customers require approval"
      });
    }

    // Update approval status
    customer.approvalStatus = 'approved';
    customer.approvedAt = new Date();
    customer.approvedBy = req.user._id;
    await customer.save();

    res.status(200).json({
      success: true,
      message: "Customer approved successfully",
      data: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        approvalStatus: customer.approvalStatus,
        approvedAt: customer.approvedAt
      }
    });

  } catch (error) {
    console.error("Approve customer error:", error);
    res.status(500).json({
      success: false,
      message: "Error approving customer"
    });
  }
};

// Reject B2B customer
exports.rejectCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { reason } = req.body;

    // Find the customer
    const customer = await User.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    // Check if customer is B2B
    if (customer.customerType !== 'B2B') {
      return res.status(400).json({
        success: false,
        message: "Only B2B customers require approval"
      });
    }

    // Update approval status
    customer.approvalStatus = 'rejected';
    customer.rejectedAt = new Date();
    customer.rejectedBy = req.user._id;
    customer.rejectionReason = reason || 'No reason provided';
    await customer.save();

    res.status(200).json({
      success: true,
      message: "Customer rejected successfully",
      data: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        approvalStatus: customer.approvalStatus,
        rejectedAt: customer.rejectedAt,
        rejectionReason: customer.rejectionReason
      }
    });

  } catch (error) {
    console.error("Reject customer error:", error);
    res.status(500).json({
      success: false,
      message: "Error rejecting customer"
    });
  }
};

// Get customer details by ID
exports.getCustomerById = async (req, res) => {
  try {
    const { customerId } = req.params;

    const customer = await User.findById(customerId).select('-password');
    if (!customer || customer.role !== 'user') {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    // Get order statistics
    const orderStats = await Order.aggregate([
      { $match: { customer: customer._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$pricing.total' },
          lastOrderDate: { $max: '$createdAt' }
        }
      }
    ]);

    const stats = orderStats[0] || { totalOrders: 0, totalSpent: 0, lastOrderDate: null };

    // Get recent orders
    const recentOrders = await Order.find({ customer: customer._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('_id orderNumber totalAmount status createdAt');

    res.status(200).json({
      success: true,
      data: {
        customer: {
          ...customer.toObject(),
          stats: {
            ...stats,
            avgOrderValue: stats.totalOrders > 0 ? stats.totalSpent / stats.totalOrders : 0
          }
        },
        recentOrders
      }
    });

  } catch (error) {
    console.error("Get customer by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching customer details"
    });
  }
};

// User Management Functions
exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const role = req.query.role || '';
    const skip = (page - 1) * limit;

    // Build query
    let query = {};
    
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }

    if (role && role !== 'all') {
      query.role = role;
    }

    // Get users with pagination
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalUsers = await User.countDocuments(query);
    const totalPages = Math.ceil(totalUsers / limit);

    // Get role statistics
    const roleStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    const stats = {
      total: totalUsers,
      admin: roleStats.find(stat => stat._id === 'admin')?.count || 0,
      user: roleStats.find(stat => stat._id === 'user')?.count || 0
    };

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: page,
          totalPages,
          totalUsers,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        stats
      }
    });
  } catch (error) {
    console.error("Error getting users:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: error.message
    });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    // Validate role
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be 'user' or 'admin'"
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Prevent self-demotion from admin
    if (user._id.toString() === req.user.id && role === 'user') {
      return res.status(400).json({
        success: false,
        message: "You cannot remove admin privileges from yourself"
      });
    }

    // Update user role
    user.role = role;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User role updated to ${role} successfully`,
      data: {
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({
      success: false,
      message: "Error updating user role",
      error: error.message
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Prevent self-deletion
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account"
      });
    }

    // Delete user
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: "User deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting user",
      error: error.message
    });
  }
};

// Clean up orphaned cart and wishlist items
exports.cleanupOrphanedItems = async (req, res) => {
  try {
    const Cart = require("../models/cart");
    const Wishlist = require("../models/wishlist");
    
    // Get all valid product IDs
    const validProducts = await Product.find({}, '_id');
    const validProductIds = validProducts.map(p => p._id.toString());
    
    // Clean up cart items
    const cartResult = await Cart.updateMany(
      {},
      {
        $pull: {
          items: {
            product: { $nin: validProductIds }
          }
        }
      }
    );
    
    // Clean up wishlist items
    const wishlistResult = await Wishlist.updateMany(
      {},
      {
        $pull: {
          items: {
            product: { $nin: validProductIds }
          }
        }
      }
    );
    
    res.json({
      success: true,
      message: "Cleanup completed successfully",
      data: {
        cartsUpdated: cartResult.modifiedCount,
        wishlistsUpdated: wishlistResult.modifiedCount
      }
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    res.status(500).json({
      success: false,
      message: "Error during cleanup",
      error: error.message
    });
  }
};

module.exports = exports;

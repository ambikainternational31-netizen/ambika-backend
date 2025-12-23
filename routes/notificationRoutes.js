const express = require("express");
const router = express.Router();
const Notification = require("../models/notification");
const NotificationService = require("../services/notificationService");
const { protect, admin } = require("../middleware/auth");

// @route   GET /api/notifications
// @desc    Get all notifications for admin
// @access  Admin
router.get("/", protect, admin, async (req, res) => {
  try {
    const { 
      filter = 'all', 
      search = '', 
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query = {};
    
    // Filter by type or read status
    if (filter === 'unread') {
      query.isRead = false;
    } else if (filter !== 'all') {
      query.type = filter;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
        { user: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get notifications with pagination
    const notifications = await Notification.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ isRead: false });

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / parseInt(limit)),
          count: notifications.length,
          totalCount: total
        },
        unreadCount
      }
    });

  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications"
    });
  }
});

// @route   GET /api/notifications/stats
// @desc    Get notification statistics
// @access  Admin
router.get("/stats", protect, admin, async (req, res) => {
  try {
    const stats = await Notification.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          unread: { $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] } },
          high_priority: { $sum: { $cond: [{ $eq: ["$priority", "high"] }, 1, 0] } },
          critical_priority: { $sum: { $cond: [{ $eq: ["$priority", "critical"] }, 1, 0] } }
        }
      }
    ]);

    const typeStats = await Notification.aggregate([
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          unread: { $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] } }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || { total: 0, unread: 0, high_priority: 0, critical_priority: 0 },
        byType: typeStats
      }
    });

  } catch (error) {
    console.error("Error fetching notification stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notification statistics"
    });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Admin
router.put("/:id/read", protect, admin, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    await notification.markAsRead(req.user.id);

    res.json({
      success: true,
      message: "Notification marked as read",
      data: notification
    });

  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read"
    });
  }
});

// @route   PUT /api/notifications/mark-all-read
// @desc    Mark all notifications as read
// @access  Admin
router.put("/mark-all-read", protect, admin, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { isRead: false },
      { 
        isRead: true, 
        readAt: new Date(),
        readBy: req.user.id
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
      data: { modifiedCount: result.modifiedCount }
    });

  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read"
    });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Admin
router.delete("/:id", protect, admin, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    res.json({
      success: true,
      message: "Notification deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete notification"
    });
  }
});

// @route   DELETE /api/notifications/bulk-delete
// @desc    Delete multiple notifications
// @access  Admin
router.delete("/bulk-delete", protect, admin, async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification IDs provided"
      });
    }

    const result = await Notification.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: `${result.deletedCount} notifications deleted successfully`,
      data: { deletedCount: result.deletedCount }
    });

  } catch (error) {
    console.error("Error bulk deleting notifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete notifications"
    });
  }
});

// @route   POST /api/notifications/test
// @desc    Create test notifications for development
// @access  Admin
router.post("/test", protect, admin, async (req, res) => {
  try {
    // Create a few test notifications
    const testNotifications = [
      {
        type: 'quote_request',
        title: 'New Quote Request - Test',
        message: 'Test Corp requested a quote for Premium Coffee Maker (25 units)',
        user: 'Test Corp',
        priority: 'high',
        data: {
          quoteId: 'TEST123',
          productName: 'Premium Coffee Maker',
          quantity: 25,
          customerName: 'Test Corp'
        }
      },
      {
        type: 'low_stock',
        title: 'Low Stock Alert - Test',
        message: 'Test Product is running low on stock (only 3 units left)',
        user: 'System',
        priority: 'high',
        data: {
          productName: 'Test Product',
          currentStock: 3,
          minThreshold: 10
        }
      }
    ];

    const createdNotifications = [];
    for (const notifData of testNotifications) {
      const notification = await Notification.createNotification(notifData);
      createdNotifications.push(notification);
    }

    res.json({
      success: true,
      message: `${createdNotifications.length} test notifications created`,
      data: createdNotifications
    });

  } catch (error) {
    console.error("Error creating test notifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create test notifications"
    });
  }
});

module.exports = router;

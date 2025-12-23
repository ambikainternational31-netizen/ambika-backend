const Notification = require("../models/notification");

class NotificationService {
  
  // Create a general notification
  static async createNotification({
    type,
    title,
    message,
    data = {},
    priority = 'medium',
    forAdmin = false,
    user = 'System'
  }) {
    try {
      const notification = await Notification.create({
        type,
        title,
        message,
        data,
        priority,
        forAdmin,
        user,
        isRead: false,
        createdAt: new Date()
      });
      
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Create notification for new quote request
  static async createQuoteRequestNotification(quotation, user) {
    try {
      const notification = await Notification.create({
        type: 'quote_request',
        title: 'New Quotation Request',
        message: `${user.name} from ${user.businessDetails?.name || 'Business'} requested quotation for ${quotation.quantity} units`,
        user: user.name,
        priority: 'high',
        data: {
          quotationId: quotation._id,
          productId: quotation.product,
          customerPhone: user.phone,
          customerEmail: user.email,
          businessName: user.businessDetails?.name,
          quantity: quotation.quantity,
          specifications: quotation.specifications || 'Not specified'
        },
        relatedModel: 'QuoteRequest',
        relatedId: quotation._id,
        isGeneral: true
      });
      
      return notification;
    } catch (error) {
      console.error('Error creating quote request notification:', error);
      throw error;
    }
  }

  // Create notification for new order
  static async createOrderNotification(order, user) {
    try {
      const notification = await Notification.createNotification({
        type: 'new_order',
        title: 'New Order Placed',
        message: `Order #${order.orderNumber} worth ₹${order.pricing.total.toLocaleString()} placed by ${user.company || user.name}`,
        user: user.company || user.name,
        priority: order.pricing.total > 50000 ? 'high' : 'medium',
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          customerId: user._id,
          customerName: user.company || user.name,
          amount: order.pricing.total,
          itemCount: order.items.length,
          paymentMethod: order.payment.method
        },
        relatedModel: 'Order',
        relatedId: order._id
      });
      
      return notification;
    } catch (error) {
      console.error('Error creating order notification:', error);
    }
  }

  // Create notification for B2B registration
  static async createB2BRegistrationNotification(user) {
    try {
      const notification = await Notification.createNotification({
        type: 'b2b_registration',
        title: 'New B2B Registration',
        message: `${user.company} has registered for B2B account and needs approval`,
        user: user.company,
        priority: 'medium',
        data: {
          userId: user._id,
          companyName: user.company,
          businessType: user.businessType,
          contactPerson: user.name,
          email: user.email,
          phone: user.phone
        },
        relatedModel: 'User',
        relatedId: user._id
      });
      
      return notification;
    } catch (error) {
      console.error('Error creating B2B registration notification:', error);
    }
  }

  // Create notification for low stock
  static async createLowStockNotification(product, currentStock, minThreshold = 10) {
    try {
      const notification = await Notification.createNotification({
        type: 'low_stock',
        title: 'Low Stock Alert',
        message: `${product.title} is running low on stock (only ${currentStock} units left)`,
        user: 'System',
        priority: currentStock <= 5 ? 'high' : 'medium',
        data: {
          productId: product._id,
          productName: product.title,
          productCode: product.productCode,
          currentStock: currentStock,
          minThreshold: minThreshold,
          category: product.category
        },
        relatedModel: 'Product',
        relatedId: product._id
      });
      
      return notification;
    } catch (error) {
      console.error('Error creating low stock notification:', error);
    }
  }

  // Create notification for payment received
  static async createPaymentNotification(order, paymentData) {
    try {
      const notification = await Notification.createNotification({
        type: 'payment_received',
        title: 'Payment Received',
        message: `Payment of ₹${order.pricing.total.toLocaleString()} received for Order #${order.orderNumber}`,
        user: order.customerInfo.name,
        priority: 'low',
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          amount: order.pricing.total,
          paymentMethod: paymentData.method || order.payment.method,
          transactionId: paymentData.transactionId || order.payment.transactionId,
          customerName: order.customerInfo.name
        },
        relatedModel: 'Order',
        relatedId: order._id
      });
      
      return notification;
    } catch (error) {
      console.error('Error creating payment notification:', error);
    }
  }

  // Create notification for order status update
  static async createOrderStatusNotification(order, newStatus, updatedBy) {
    try {
      const statusMessages = {
        confirmed: 'has been confirmed',
        processing: 'is being processed',
        shipped: 'has been shipped',
        delivered: 'has been delivered',
        cancelled: 'has been cancelled'
      };

      const message = statusMessages[newStatus] || `status updated to ${newStatus}`;

      const notification = await Notification.createNotification({
        type: 'order_status_update',
        title: 'Order Status Update',
        message: `Order #${order.orderNumber} ${message}`,
        user: updatedBy?.name || 'System',
        priority: newStatus === 'cancelled' ? 'medium' : 'low',
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          oldStatus: order.status,
          newStatus: newStatus,
          customerName: order.customerInfo.name,
          updatedBy: updatedBy?.name || 'System'
        },
        relatedModel: 'Order',
        relatedId: order._id
      });
      
      return notification;
    } catch (error) {
      console.error('Error creating order status notification:', error);
    }
  }

  // Create system alert notification
  static async createSystemAlert(title, message, priority = 'medium', data = {}) {
    try {
      const notification = await Notification.createNotification({
        type: 'system_alert',
        title: title,
        message: message,
        user: 'System',
        priority: priority,
        data: data
      });
      
      return notification;
    } catch (error) {
      console.error('Error creating system alert notification:', error);
    }
  }

  // Get notification statistics
  static async getNotificationStats() {
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

      return stats[0] || { total: 0, unread: 0, high_priority: 0, critical_priority: 0 };
    } catch (error) {
      console.error('Error getting notification stats:', error);
      return { total: 0, unread: 0, high_priority: 0, critical_priority: 0 };
    }
  }

  // Clean up old notifications (older than 30 days)
  static async cleanupOldNotifications(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await Notification.deleteMany({
        createdAt: { $lt: cutoffDate },
        isRead: true
      });

  // console.log(`Cleaned up ${result.deletedCount} old notifications`);
      return result.deletedCount;
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      return 0;
    }
  }
}

module.exports = NotificationService;

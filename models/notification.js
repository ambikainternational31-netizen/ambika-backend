const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'quote_request',
      'new_order', 
      'b2b_registration',
      'low_stock',
      'payment_received',
      'order_status_update',
      'stock_alert',
      'system_alert'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  user: {
    type: String,
    default: 'System'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Reference to related documents
  relatedModel: {
    type: String,
    enum: ['Order', 'QuoteRequest', 'User', 'Product', null]
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId
  },
  // Admin who should receive this notification
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // For general admin notifications, leave recipient empty
  isGeneral: {
    type: Boolean,
    default: true
  },
  readAt: {
    type: Date
  },
  readBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { 
  timestamps: true 
});

// Index for efficient queries
notificationSchema.index({ isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1, isRead: 1 });
notificationSchema.index({ priority: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

// Static method to create notification
notificationSchema.statics.createNotification = async function(notificationData) {
  try {
    const notification = new this(notificationData);
    return await notification.save();
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Method to mark as read
notificationSchema.methods.markAsRead = async function(userId = null) {
  this.isRead = true;
  this.readAt = new Date();
  if (userId) {
    this.readBy = userId;
  }
  return await this.save();
};

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;

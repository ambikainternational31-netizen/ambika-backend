const Order = require("../models/order");
const Product = require("../models/product");
const User = require("../models/user");
const NotificationService = require("../services/notificationService");
const { validationResult } = require("express-validator");

// Create a new order
exports.createOrder = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const {
      items,
      customerInfo,
      shipping,
      payment,
      notes,
      pricing, // Allow pricing to be passed for consistency
    } = req.body;

    // Validate items and calculate pricing
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product with ID ${item.product} not found`,
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product ${product.title}`,
        });
      }

      const itemPrice = item.price || product.discountPrice || product.price;
      const itemTotal = itemPrice * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product: product._id,
        productInfo: {
          title: product.title,
          price: itemPrice,
          image: product.images[0] || "",
        },
        quantity: item.quantity,
        price: itemPrice,
        size: item.size,
        variants: item.variants || [],
      });
    }

    // Calculate total pricing (use provided pricing if available, otherwise calculate)
    let finalPricing;
    if (pricing) {
      finalPricing = pricing;
    } else {
      const tax = 0; // GST disabled
      const shippingCost =
        shipping?.method === "express"
          ? 150
          : shipping?.method === "priority"
          ? 300
          : 0;
      finalPricing = {
        subtotal,
        tax,
        shipping: shippingCost,
        total: subtotal + shippingCost, // tax removed
      };
    }

    let paymentMethod = payment?.method || "cod";

    // Generate order number manually to ensure it's set
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    const orderNumber = `AMB${year}${month}${random}`;

    // Create order
    const order = await Order.create({
      orderNumber,
      customer: req.user.id,
      customerInfo: customerInfo || {
        name: req.user.name || req.user.username,
        email: req.user.email,
        phone: req.user.phone || "",
      },
      items: orderItems,
      pricing: finalPricing,
      payment: {
        method: paymentMethod,
        status: "pending",
      },
      shipping,
      notes,
    });

    // Only update stock if payment method is COD or if order is confirmed
    if (paymentMethod === "cod" || paymentMethod === "bank_transfer") {
      for (const item of items) {
        const product = await Product.findById(item.product);

        // Update product stock and check for low stock
        await Product.findByIdAndUpdate(product._id, {
          $inc: { stock: -item.quantity },
        });

        // Check for low stock after updating
        const updatedProduct = await Product.findById(product._id);
        if (updatedProduct.stock <= 10) {
          // Low stock threshold
          try {
            await NotificationService.createLowStockNotification(
              updatedProduct,
              updatedProduct.stock,
              10
            );
          } catch (notificationError) {
            console.error(
              "Error creating low stock notification:",
              notificationError
            );
          }
        }
      }
    }

    const populatedOrder = await Order.findById(order._id)
      .populate("customer", "name email")
      .populate("items.product", "title images");

    // Create notification for new order
    try {
      const user = await User.findById(req.user.id);
      await NotificationService.createOrderNotification(order, user);
    } catch (notificationError) {
      console.error("Error creating order notification:", notificationError);
      // Don't fail the order creation if notification fails
    }

    res.status(201).json({
      success: true,
      data: populatedOrder,
    });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating order",
    });
  }
};

// Get user's orders
exports.getUserOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const query = { customer: req.user.id };

    if (status && status !== "all") {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate("items.product", "title images")
      .sort({ createdAt: -1 })
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
        },
      },
    });
  } catch (error) {
    console.error("Get user orders error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching orders",
    });
  }
};

// Get single order
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("customer", "name email phone")
      .populate("items.product", "title images description");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if user owns this order or is admin
    if (
      order.customer._id.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching order",
    });
  }
};

// Cancel order (user can cancel only if status is pending or confirmed)
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if user owns this order
    if (order.customer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Check if order can be cancelled
    if (!["pending", "confirmed"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: "Order cannot be cancelled at this stage",
      });
    }

    // Restore product stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity },
      });
    }

    // Update order status
    order.status = "cancelled";
    order.statusHistory.push({
      status: "cancelled",
      updatedAt: new Date(),
      note: "Cancelled by customer",
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      data: order,
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(500).json({
      success: false,
      message: "Error cancelling order",
    });
  }
};

// Track order
exports.trackOrder = async (req, res) => {
  try {
    const { orderNumber } = req.params;

    const order = await Order.findOne({ orderNumber })
      .populate("items.product", "title images")
      .select("orderNumber status shipping statusHistory createdAt");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Track order error:", error);
    res.status(500).json({
      success: false,
      message: "Error tracking order",
    });
  }
};

// Get order statistics for user
exports.getUserOrderStats = async (req, res) => {
  try {
    const stats = await Order.aggregate([
      { $match: { customer: req.user._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: "$pricing.total" },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          deliveredOrders: {
            $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
          },
        },
      },
    ]);

    const result = stats[0] || {
      totalOrders: 0,
      totalSpent: 0,
      pendingOrders: 0,
      deliveredOrders: 0,
    };

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get user order stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching order statistics",
    });
  }
};

// Verify UPI Payment
exports.verifyUPIPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { upiTransactionId, upiId, upiProvider } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Verify if the user owns this order
    if (order.customer.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Update payment details
    order.payment.status = "completed";
    order.payment.transactionId = upiTransactionId;
    order.payment.upiTransactionId = upiTransactionId;
    order.payment.upiId = upiId;
    order.payment.upiProvider = upiProvider;
    order.payment.paidAt = new Date();

    // Update order status
    order.status = "confirmed";
    order.statusHistory.push({
      status: "confirmed",
      updatedAt: new Date(),
      note: "Payment completed via UPI",
    });

    await order.save();

    // Update product stock after successful payment
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      });
    }

    // Create notification for payment received
    try {
      await NotificationService.createPaymentNotification(order, {
        method: "upi",
        transactionId: upiTransactionId,
      });
    } catch (notificationError) {
      console.error("Error creating payment notification:", notificationError);
    }

    res.status(200).json({
      success: true,
      message: "UPI payment verified successfully",
      data: order,
    });
  } catch (error) {
    console.error("Verify UPI payment error:", error);
    res.status(500).json({
      success: false,
      message: "Error verifying UPI payment",
    });
  }
};

// Update payment status (for payment gateway webhook)
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { orderId, paymentId, status, signature } = req.body;

    // Verify payment signature here (implement based on your payment gateway)

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Update payment details
    order.payment.status = status;
    order.payment.transactionId = paymentId;

    if (status === "completed") {
      order.payment.paidAt = new Date();
      order.status = "confirmed";
      order.statusHistory.push({
        status: "confirmed",
        updatedAt: new Date(),
        note: "Payment completed",
      });

      // Create notification for payment received
      try {
        await NotificationService.createPaymentNotification(order, {
          method: order.payment.method,
          transactionId: paymentId,
        });
      } catch (notificationError) {
        console.error(
          "Error creating payment notification:",
          notificationError
        );
      }
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: "Payment status updated successfully",
    });
  } catch (error) {
    console.error("Update payment status error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating payment status",
    });
  }
};

module.exports = exports;

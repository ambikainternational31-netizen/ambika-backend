const QuotationRequest = require("../models/quotationRequest");
const User = require("../models/user");
const Product = require("../models/product");
const NotificationService = require("../services/notificationService");
const emailService = require("../utils/emailService");

exports.createQuotationRequest = async (req, res) => {
  try {
    const { productId, quantity, specifications, notes } = req.body;

    // Verify user is B2B
    const user = await User.findById(req.user.id);
    if (user.customerType !== "B2B") {
      return res.status(403).json({
        success: false,
        message: "Only B2B customers can request quotations"
      });
    }

    // Create quotation request
    const quotation = await QuotationRequest.create({
      customer: req.user.id,
      product: productId,
      quantity,
      specifications,
      notes,
      status: 'pending'
    });

    // Populate product details
    const populatedQuotation = await QuotationRequest.findById(quotation._id)
      .populate("product", "title images price")
      .populate("customer", "name email phone businessDetails");

    // Create notification for admin
    await NotificationService.createQuoteRequestNotification(quotation, user);

    // Send email notification to admin
    await emailService.sendQuotationRequestNotification(populatedQuotation);

    res.status(201).json({
      success: true,
      data: populatedQuotation
    });

  } catch (error) {
    console.error("Create quotation request error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating quotation request"
    });
  }
};

exports.getQuotationRequests = async (req, res) => {
  try {
    const quotations = await QuotationRequest.find({ customer: req.user.id })
      .populate("product", "title images")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: quotations
    });

  } catch (error) {
    console.error("Get quotation requests error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching quotation requests"
    });
  }
};

// Admin endpoints
exports.getAllQuotationRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const query = {};
    if (status && status !== "all") {
      query.status = status;
    }

    const quotations = await QuotationRequest.find(query)
      .populate("customer", "name email phone businessDetails")
      .populate("product", "title images price")
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await QuotationRequest.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        quotations,
        pagination: {
          current: Number(page),
          pages: Math.ceil(total / Number(limit)),
          total
        }
      }
    });

  } catch (error) {
    console.error("Get all quotation requests error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching quotation requests"
    });
  }
};

exports.getQuotationById = async (req, res) => {
  try {
    const { id } = req.params;

    const quotation = await QuotationRequest.findById(id)
      .populate("customer", "name email phone businessDetails")
      .populate("product", "title images price");

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation request not found"
      });
    }

    res.status(200).json({
      success: true,
      data: {
        quotation: {
          ...quotation.toObject(),
          customerName: quotation.customer.name,
          customerEmail: quotation.customer.email,
          customerPhone: quotation.customer.phone,
          productName: quotation.product.title,
          message: quotation.notes
        }
      }
    });

  } catch (error) {
    console.error("Get quotation by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching quotation details"
    });
  }
};

exports.respondToQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, unitPrice, validityDays = 7, adminNotes } = req.body;

    console.log('Responding to quotation:', { id, status, unitPrice, validityDays, adminNotes });

    const quotation = await QuotationRequest.findById(id);
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation request not found"
      });
    }

    // Validate status
    if (!["pending", "approved", "quoted", "rejected", "expired"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value"
      });
    }

    // Update quotation
    quotation.status = status;
    quotation.adminNotes = adminNotes;
    
    if (status === "approved" || status === "quoted") {
      quotation.quotedPrice = {
        unitPrice: unitPrice || quotation.product.price,
        totalPrice: (unitPrice || quotation.product.price) * quotation.quantity,
        validUntil: new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000)
      };
    }

    const savedQuotation = await quotation.save();

    // Send email notification to customer
    const populatedQuotation = await QuotationRequest.findById(id)
      .populate("customer", "name email phone businessDetails")
      .populate("product", "title images");

    await emailService.sendQuotationResponseNotification(populatedQuotation);

    res.status(200).json({
      success: true,
      data: populatedQuotation
    });

  } catch (error) {
    console.error("Respond to quotation error:", error);
    res.status(500).json({
      success: false,
      message: "Error responding to quotation",
      error: error.message
    });
  }
};

module.exports = exports;
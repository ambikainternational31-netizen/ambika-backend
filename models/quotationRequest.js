const mongoose = require("mongoose");

const quotationRequestSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  specifications: {
    type: String,
    required: false
  },
  status: {
    type: String,
    enum: ["pending", "approved", "quoted", "rejected", "expired"],
    default: "pending"
  },
  notes: String,
  adminNotes: String,
  quotedPrice: {
    unitPrice: Number,
    totalPrice: Number,
    validUntil: Date
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 30 * 24 * 60 * 60 // Automatically delete after 30 days if not handled
  }
});

const QuotationRequest = mongoose.model("QuotationRequest", quotationRequestSchema);

module.exports = QuotationRequest;
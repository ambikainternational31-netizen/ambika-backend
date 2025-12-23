const mongoose = require("mongoose");

const quoteRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  items: [
    {
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
      size: String,
      customRequirements: String,
      urgency: {
        type: String,
        enum: ["Standard", "Urgent", "Emergency"],
        default: "Standard"
      }
    }
  ],
  totalEstimatedValue: {
    type: Number,
    default: 0
  },
  deliveryAddress: {
    type: String,
    required: true
  },
  deliveryTimeline: {
    type: String,
    required: true
  },
  additionalRequirements: String,
  businessJustification: String,
  budgetRange: {
    min: Number,
    max: Number
  },
  status: {
    type: String,
    enum: ["pending", "processing", "quoted", "accepted", "rejected", "expired"],
    default: "pending"
  },
  adminNotes: String,
  quotedPrice: Number,
  quotedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  quotedAt: Date,
  validUntil: Date,
  responseMessage: String,
  priority: {
    type: String,
    enum: ["Low", "Medium", "High", "Critical"],
    default: "Medium"
  }
}, { timestamps: true });

// Index for efficient queries
quoteRequestSchema.index({ user: 1, status: 1 });
quoteRequestSchema.index({ status: 1, createdAt: -1 });

const QuoteRequest = mongoose.model("QuoteRequest", quoteRequestSchema);

module.exports = QuoteRequest;

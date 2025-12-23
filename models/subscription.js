const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    plan: {
      type: String,
      enum: ["basic", "professional", "enterprise"],
      default: "professional"
    },
    planDetails: {
      name: String,
      price: Number,
      currency: {
        type: String,
        default: "INR"
      },
      duration: {
        type: Number,
        default: 30 // days
      },
      features: [String]
    },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled", "pending"],
      default: "pending"
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      required: true
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending"
    },
    paymentDate: Date,
    amount: {
      type: Number,
      required: true
    },
    // Auto-renewal settings
    autoRenew: {
      type: Boolean,
      default: true
    },
    // Payment history
    paymentHistory: [{
      date: {
        type: Date,
        default: Date.now
      },
      amount: Number,
      status: String,

      description: String
    }]
  },
  { 
    timestamps: true 
  }
);

// Check if subscription is active
subscriptionSchema.methods.isActive = function() {
  return this.status === 'active' && this.endDate > new Date();
};

// Check if subscription is expiring soon (within 3 days)
subscriptionSchema.methods.isExpiringSoon = function() {
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  return this.endDate <= threeDaysFromNow && this.endDate > new Date();
};

// Get days remaining
subscriptionSchema.methods.getDaysRemaining = function() {
  const today = new Date();
  const diffTime = this.endDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const Subscription = mongoose.model("Subscription", subscriptionSchema);

module.exports = Subscription;

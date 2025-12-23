const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    // Customer type for B2B/B2C differentiation
    customerType: {
      type: String,
      enum: ["B2C", "B2B"],
      default: "B2C",
    },
    // Business details for B2B customers
    businessDetails: {
      companyName: String,
      businessType: {
        type: String,
        enum: ["Hotel", "Resort", "Restaurant", "Inn", "Office", "Other"]
      },
      gstNumber: String,
      businessAddress: String,
      contactPerson: String,
      designation: String,
      businessPhone: String,
      businessEmail: String,
      annualRequirement: String,
      registrationCertificate: String, // URL to uploaded document
      isVerified: {
        type: Boolean,
        default: false
      },
      verificationDate: Date,
      creditLimit: {
        type: Number,
        default: 0
      }
    },
    // Optional fields for profile
    name: String,
    phone: String,
    address: String,
    // Multiple addresses for delivery
    addresses: [{
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true
      },
      name: {
        type: String,
        enum: ['Home', 'Office', 'Other'],
        required: true,
        default: 'Home'
      },
      customName: {
        type: String,
        required: function() {
          return this.name === 'Other';
        }
      },
      fullName: {
        type: String,
        required: true
      },
      phone: {
        type: String,
        required: true
      },
      street: {
        type: String,
        required: true
      },
      city: {
        type: String,
        required: true
      },
      state: {
        type: String,
        required: true
      },
      zipCode: {
        type: String,
        required: true
      },
      landmark: String,
      isDefault: {
        type: Boolean,
        default: false
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    // B2B approval status
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved" // B2C users are auto-approved, B2B needs manual approval
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    approvedAt: Date,
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    rejectedAt: Date,
    rejectionReason: String,
    approvalDate: Date,
    // Subscription fields for admin users
    subscriptionStatus: {
      type: String,
      enum: ["active", "expired", "cancelled", "pending"],
      default: function() {
        return this.role === 'admin' ? 'pending' : undefined;
      }
    },
    subscriptionEndDate: Date,
    lastPaymentDate: Date,
    // Password reset fields
    resetPasswordOTP: String,
    resetPasswordExpires: Date,
    resetPasswordAttempts: {
      type: Number,
      default: 0
    },
    lastOTPRequest: Date
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

module.exports = User;

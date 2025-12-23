const mongoose = require("mongoose");

const analyticsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true
  },
  revenue: {
    total: { type: Number, default: 0 },
    orders: { type: Number, default: 0 },
    cod: { type: Number, default: 0 },
    online: { type: Number, default: 0 }
  },
  orders: {
    total: { type: Number, default: 0 },
    pending: { type: Number, default: 0 },
    confirmed: { type: Number, default: 0 },
    processing: { type: Number, default: 0 },
    shipped: { type: Number, default: 0 },
    delivered: { type: Number, default: 0 },
    cancelled: { type: Number, default: 0 },
    returned: { type: Number, default: 0 }
  },
  customers: {
    total: { type: Number, default: 0 },
    new: { type: Number, default: 0 },
    returning: { type: Number, default: 0 }
  },
  products: {
    total: { type: Number, default: 0 },
    active: { type: Number, default: 0 },
    outOfStock: { type: Number, default: 0 },
    lowStock: { type: Number, default: 0 }
  },
  categories: [{
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category"
    },
    name: String,
    orders: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    products: { type: Number, default: 0 }
  }],
  topProducts: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product"
    },
    title: String,
    orders: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    quantity: { type: Number, default: 0 }
  }],
  topCustomers: [{
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    name: String,
    orders: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 }
  }]
}, { 
  timestamps: true 
});

// Create index for efficient queries
analyticsSchema.index({ date: -1 });

const Analytics = mongoose.model("Analytics", analyticsSchema);

module.exports = Analytics;

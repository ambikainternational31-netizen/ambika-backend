const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true
  },
  images: [{
    type: String,
    required: true
  }],
  
  // Pricing
  price: {
    type: Number,
    required: true,
    min: 0
  },
  discountPrice: {
    type: Number,
    min: 0
  },
  
  // Inventory
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  minOrderQuantity: {
    type: Number,
    default: 1,
    min: 1
  },
  
  // Product Features (array of strings)
  features: [{
    type: String,
    trim: true
  }],
  
  // Product Specifications (array of key-value pairs)
  specifications: [{
    key: {
      type: String,
      trim: true
    },
    value: {
      type: String,
      trim: true
    }
  }],
  
  // Warranty Information
  warranty: {
    type: String,
    trim: true
  },
  
  // Status & Features
  status: {
    type: String,
    enum: ["active", "inactive", "draft"],
    default: "active"
  },
  featured: {
    type: Boolean,
    default: false
  },
  
  // Analytics (auto-managed)
  avgRating: {
    type: Number,
    default: 0
  },
  numReviews: {
    type: Number,
    default: 0
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for checking if product is on sale
productSchema.virtual('isOnSale').get(function() {
  return this.discountPrice && this.discountPrice < this.price;
});

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function() {
  if (this.isOnSale) {
    return Math.round(((this.price - this.discountPrice) / this.price) * 100);
  }
  return 0;
});

// Virtual for final price
productSchema.virtual('finalPrice').get(function() {
  return this.discountPrice || this.price;
});

// Virtual for stock status
productSchema.virtual('stockStatus').get(function() {
  if (this.stock === 0) return 'out_of_stock';
  if (this.stock < 10) return 'low_stock';
  return 'in_stock';
});

// Index for search
productSchema.index({ title: 'text', description: 'text' });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ price: 1, discountPrice: 1 });

const Product = mongoose.model("Product", productSchema);

module.exports = Product;

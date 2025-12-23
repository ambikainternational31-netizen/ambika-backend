const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

// Ensure a user can only have one wishlist
wishlistSchema.index({ user: 1 }, { unique: true });

// Add a method to check if product exists in wishlist
wishlistSchema.methods.hasProduct = function (productId) {
  return this.items.some(item => item.product.toString() === productId.toString());
};

const Wishlist = mongoose.model("Wishlist", wishlistSchema);

module.exports = Wishlist;

const express = require("express");
const { check } = require("express-validator");
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} = require("../controllers/cartController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// All cart routes require authentication
router.use(protect);

// Get user's cart
router.get("/", getCart);

// Add item to cart
router.post(
  "/add",
  [
    check("productId", "Product ID is required").notEmpty(),
    check("quantity", "Quantity must be a positive number").optional().isInt({ min: 1 }),
  ],
  addToCart
);

// Update cart item quantity
router.put(
  "/item/:itemId",
  [
    check("quantity", "Quantity must be a positive number").isInt({ min: 1 }),
  ],
  updateCartItem
);

// Remove item from cart
router.delete("/item/:itemId", removeFromCart);

// Clear entire cart
router.delete("/", clearCart);

module.exports = router;

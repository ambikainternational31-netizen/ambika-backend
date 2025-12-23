const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { protect } = require("../middleware/auth");
const { body } = require("express-validator");

// Order validation rules
const orderValidation = [
  body("items")
    .isArray({ min: 1 })
    .withMessage("At least one item is required"),
  body("items.*.product")
    .isMongoId()
    .withMessage("Valid product ID is required"),
  body("items.*.quantity")
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1"),
  body("customerInfo.name")
    .notEmpty()
    .withMessage("Customer name is required"),
  body("customerInfo.email")
    .isEmail()
    .withMessage("Valid email is required"),
  body("customerInfo.phone")
    .notEmpty()
    .withMessage("Phone number is required")
];

// Public routes
router.get("/track/:orderNumber", orderController.trackOrder);

// Protected routes (require authentication)
router.use(protect);

// User order routes
router.post("/", orderValidation, orderController.createOrder);
router.get("/", orderController.getUserOrders);
router.get("/stats", orderController.getUserOrderStats);
router.get("/:id", orderController.getOrderById);
router.put("/:id/cancel", orderController.cancelOrder);

// Payment webhook (should be protected with payment gateway signature verification)
router.post("/payment/webhook", orderController.updatePaymentStatus);

module.exports = router;

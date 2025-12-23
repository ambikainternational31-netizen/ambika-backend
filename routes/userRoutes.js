const express = require("express");
const { check } = require("express-validator");
const {
  register,
  registerB2B,
  login,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  createQuoteRequest,
  getQuoteRequests,
  getQuoteRequest,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} = require("../controllers/userController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Register B2C user
router.post(
  "/register",
  [
    check("username", "Username is required").notEmpty(),
    check("email", "Please include a valid email").isEmail(),
    check("password", "Password must be at least 6 characters").isLength({
      min: 6,
    }),
  ],
  register
);

// Register B2B user
router.post(
  "/register-b2b",
  [
    check("username", "Username is required").notEmpty(),
    check("email", "Please include a valid email").isEmail(),
    check("password", "Password must be at least 6 characters").isLength({
      min: 6,
    }),
    check("companyName", "Company name is required").notEmpty(),
    check("businessType", "Business type is required").notEmpty(),
    check("contactPerson", "Contact person is required").notEmpty(),
    check("businessPhone", "Business phone is required").notEmpty(),
    check("businessEmail", "Business email is required").isEmail(),
  ],
  registerB2B
);

// Login user
router.post(
  "/login",
  [
    check("email", "Please include a valid email").isEmail(),
    check("password", "Password is required").notEmpty(),
  ],
  login
);

// Forgot password - Send OTP
router.post(
  "/forgot-password",
  [
    check("email", "Please include a valid email").isEmail(),
  ],
  forgotPassword
);

// Reset password with OTP
router.post(
  "/reset-password",
  [
    check("email", "Please include a valid email").isEmail(),
    check("otp", "OTP is required").notEmpty(),
    check("newPassword", "New password must be at least 6 characters").isLength({
      min: 6,
    }),
  ],
  resetPassword
);

// Get user profile
router.get("/profile", protect, getProfile);

// Update user profile
router.put("/profile", protect, updateProfile);

// Change password
router.put(
  "/change-password",
  [
    check("currentPassword", "Current password is required").notEmpty(),
    check("newPassword", "New password must be at least 6 characters").isLength(
      { min: 6 }
    ),
  ],
  protect,
  changePassword
);

// Wishlist routes
router.get("/wishlist", protect, getWishlist);
router.post("/wishlist/add/:productId", protect, addToWishlist);
router.delete("/wishlist/remove/:productId", protect, removeFromWishlist);

// Quote request routes (B2B only)
router.post("/quote-request", protect, createQuoteRequest);
router.get("/quote-requests", protect, getQuoteRequests);
router.get("/quote-request/:id", protect, getQuoteRequest);

// Address management routes
router.get("/addresses", protect, getAddresses);
router.post("/addresses", protect, addAddress);
router.put("/addresses/:addressId", protect, updateAddress);
router.delete("/addresses/:addressId", protect, deleteAddress);
router.patch("/addresses/:addressId/default", protect, setDefaultAddress);

module.exports = router;

const express = require("express");
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkUpdateProducts
} = require("../controllers/productController");
const { protect, admin } = require("../middleware/auth");
const { upload } = require("../config/cloudinary");
const { asyncHandler } = require("../middleware/errorHandler");

const router = express.Router();

// Public routes
router.get("/", getProducts);
router.get("/:id", getProductById);

// Simple validation function
const validateProduct = (req, res, next) => {
  const { title, description, price, stock, category } = req.body;
  
  if (!title) {
    return res.status(400).json({
      success: false,
      message: "Title is required"
    });
  }
  
  if (!description) {
    return res.status(400).json({
      success: false,
      message: "Description is required"
    });
  }
  
  if (!price || price < 0) {
    return res.status(400).json({
      success: false,
      message: "Price must be a positive number"
    });
  }
  
  if (!stock || stock < 0) {
    return res.status(400).json({
      success: false,
      message: "Stock must be a positive number"
    });
  }
  
  if (!category) {
    return res.status(400).json({
      success: false,
      message: "Category is required"
    });
  }
  
  next();
};

// Admin routes with image upload
router.post(
  "/",
  protect,
  admin,
  (req, res, next) => {
  // console.log('=== PRODUCT ROUTE - BEFORE MULTER ===');
  // console.log('Content-Type:', req.get('Content-Type'));
  // console.log('Body before multer:', req.body);
  // console.log('Files before multer:', req.files);
    next();
  },
  upload.fields([{ name: 'images', maxCount: 5 }]), // Handle FormData with multiple images
  (req, res, next) => {
  // console.log('=== PRODUCT ROUTE - AFTER MULTER ===');
  // console.log('Body after multer:', req.body);
  // console.log('Files after multer:', req.files);
  // console.log('Body type:', typeof req.body);
    console.log('Body keys:', Object.keys(req.body || {}));
    next();
  },
  asyncHandler(createProduct)
);

router.put(
  "/:id", 
  protect, 
  admin, 
  upload.fields([{ name: 'images', maxCount: 5 }]), // Handle FormData with multiple images
  asyncHandler(updateProduct)
);

router.delete("/:id", protect, admin, asyncHandler(deleteProduct));

// Bulk operations
router.put("/bulk", protect, admin, bulkUpdateProducts);

module.exports = router;
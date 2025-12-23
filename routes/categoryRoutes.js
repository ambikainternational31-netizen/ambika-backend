const express = require("express");
const { check } = require("express-validator");
const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  bulkUpdateCategories
} = require("../controllers/categoryController");
const { protect, admin } = require("../middleware/auth");
const { upload } = require("../config/cloudinary");

const router = express.Router();

// Public routes
router.get("/", getCategories);
router.get("/:id", getCategoryById);

// Admin routes with image upload
router.post(
  "/",
  protect,
  admin,
  (req, res, next) => {
  // console.log('=== BEFORE MULTER ===');
  // console.log('Content-Type:', req.get('Content-Type'));
  // console.log('Body before multer:', req.body);
  // console.log('Files before multer:', req.files);
  // console.log('Raw headers:', req.rawHeaders);
    next();
  },
  upload.fields([{ name: 'image', maxCount: 1 }]), // Handle FormData with optional image
  (req, res, next) => {
  // console.log('=== AFTER MULTER ===');
  // console.log('Body after multer:', req.body);
  // console.log('Files after multer:', req.files);
  // console.log('Body type:', typeof req.body);
  // console.log('Body keys:', Object.keys(req.body || {}));
    next();
  },
  [
    check("name", "Category name is required").notEmpty(),
  ],
  createCategory
);

router.put(
  "/:id", 
  protect, 
  admin, 
  upload.fields([{ name: 'image', maxCount: 1 }]), // Handle FormData with optional image
  updateCategory
);

router.delete("/:id", protect, admin, deleteCategory);

// Bulk operations
router.put("/bulk", protect, admin, bulkUpdateCategories);

module.exports = router;
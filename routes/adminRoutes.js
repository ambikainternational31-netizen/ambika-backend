const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { protect, admin } = require("../middleware/auth");

// Apply auth middleware to all admin routes
router.use(protect);
router.use(admin);

// Dashboard and Analytics
router.get("/dashboard/stats", adminController.getDashboardStats);
router.get("/export", adminController.exportData);

// Products Management
router.get("/products", adminController.getAdminProducts);
router.put("/products/bulk", adminController.bulkUpdateProducts);

// Orders Management
router.get("/orders", adminController.getAdminOrders);
router.put("/orders/:id/status", adminController.updateOrderStatus);
router.get("/orders/:id", adminController.getAdminOrderById);

// Customers Management
router.get("/customers", adminController.getAdminCustomers);
router.get("/customers/:customerId", adminController.getCustomerById);
router.put("/customers/:customerId/approve", adminController.approveCustomer);
router.put("/customers/:customerId/reject", adminController.rejectCustomer);

// Categories Management
router.get("/categories", adminController.getAdminCategories);

// User Management
router.get("/users", adminController.getAllUsers);
router.put("/users/:userId/role", adminController.updateUserRole);
router.delete("/users/:userId", adminController.deleteUser);

// System Maintenance
router.post("/cleanup", adminController.cleanupOrphanedItems);

module.exports = router;

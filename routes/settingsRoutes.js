const express = require("express");
const router = express.Router();
const { 
  getSettings,
  updateGeneralSettings,
  updateNotificationSettings,
  updateSecuritySettings,
  updateSystemSettings,
  updateBusinessSettings,
  getAdminProfile,
  updateAdminProfile,
  uploadCompanyLogo,
  resetSettings
} = require("../controllers/settingsController");
const { protect, admin } = require("../middleware/auth");
const { upload } = require("../config/cloudinary");

// All routes require admin authentication
router.use(protect);
router.use(admin);

// Settings routes
router.get("/", getSettings);
router.put("/general", updateGeneralSettings);
router.put("/notifications", updateNotificationSettings);
router.put("/security", updateSecuritySettings);
router.put("/system", updateSystemSettings);
router.put("/business", updateBusinessSettings);
router.post("/reset", resetSettings);

// Profile routes
router.get("/profile", getAdminProfile);
router.put("/profile", updateAdminProfile);

// File upload routes
router.post("/upload-logo", upload.single('logo'), uploadCompanyLogo);

module.exports = router;

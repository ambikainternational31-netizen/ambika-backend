const Settings = require("../models/settings");
const User = require("../models/user");
const { deleteImage, extractPublicId } = require('../config/cloudinary');

// Get all settings
exports.getSettings = async (req, res) => {
  try {
    const settings = await Settings.getInstance();
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching settings",
      error: error.message
    });
  }
};

// Update general settings
exports.updateGeneralSettings = async (req, res) => {
  try {
    const { company } = req.body;
    const userId = req.user.id;
    
    const settings = await Settings.getInstance();
    
    if (company) {
      // Properly merge nested objects
      Object.keys(company).forEach(key => {
        if (key === 'address' && typeof company[key] === 'object') {
          settings.company.address = { ...settings.company.address, ...company[key] };
        } else {
          settings.company[key] = company[key];
        }
      });
    }
    
    settings.lastUpdatedBy = userId;
    await settings.save();
    
    res.json({
      success: true,
      message: "General settings updated successfully",
      data: settings
    });
  } catch (error) {
    console.error("Error updating general settings:", error);
    res.status(500).json({
      success: false,
      message: "Error updating general settings",
      error: error.message
    });
  }
};

// Update notification settings
exports.updateNotificationSettings = async (req, res) => {
  try {
    const { notifications } = req.body;
    const userId = req.user.id;
    
    const settings = await Settings.getInstance();
    
    if (notifications) {
      settings.notifications = { ...settings.notifications, ...notifications };
    }
    
    settings.lastUpdatedBy = userId;
    await settings.save();
    
    res.json({
      success: true,
      message: "Notification settings updated successfully",
      data: settings
    });
  } catch (error) {
    console.error("Error updating notification settings:", error);
    res.status(500).json({
      success: false,
      message: "Error updating notification settings",
      error: error.message
    });
  }
};

// Update security settings
exports.updateSecuritySettings = async (req, res) => {
  try {
    const { security } = req.body;
    const userId = req.user.id;
    
    const settings = await Settings.getInstance();
    
    if (security) {
      settings.security = { ...settings.security, ...security };
    }
    
    settings.lastUpdatedBy = userId;
    await settings.save();
    
    res.json({
      success: true,
      message: "Security settings updated successfully",
      data: settings
    });
  } catch (error) {
    console.error("Error updating security settings:", error);
    res.status(500).json({
      success: false,
      message: "Error updating security settings",
      error: error.message
    });
  }
};

// Update system settings
exports.updateSystemSettings = async (req, res) => {
  try {
    const { system } = req.body;
    const userId = req.user.id;
    
    const settings = await Settings.getInstance();
    
    if (system) {
      settings.system = { ...settings.system, ...system };
    }
    
    settings.lastUpdatedBy = userId;
    await settings.save();
    
    res.json({
      success: true,
      message: "System settings updated successfully",
      data: settings
    });
  } catch (error) {
    console.error("Error updating system settings:", error);
    res.status(500).json({
      success: false,
      message: "Error updating system settings",
      error: error.message
    });
  }
};

// Update business settings
exports.updateBusinessSettings = async (req, res) => {
  try {
    const { business } = req.body;
    const userId = req.user.id;
    
    const settings = await Settings.getInstance();
    
    if (business) {
      settings.business = { ...settings.business, ...business };
    }
    
    settings.lastUpdatedBy = userId;
    await settings.save();
    
    res.json({
      success: true,
      message: "Business settings updated successfully",
      data: settings
    });
  } catch (error) {
    console.error("Error updating business settings:", error);
    res.status(500).json({
      success: false,
      message: "Error updating business settings",
      error: error.message
    });
  }
};

// Get admin profile
exports.getAdminProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error("Error fetching admin profile:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching admin profile",
      error: error.message
    });
  }
};

// Update admin profile
exports.updateAdminProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { username, name, email, phone } = req.body;
    
    // Check if email or username already exists for other users
    if (email) {
      const existingUser = await User.findOne({ 
        email, 
        _id: { $ne: userId } 
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email already exists"
        });
      }
    }
    
    if (username) {
      const existingUser = await User.findOne({ 
        username, 
        _id: { $ne: userId } 
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Username already exists"
        });
      }
    }
    
    const updateData = {};
    if (username) updateData.username = username;
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    
    const user = await User.findByIdAndUpdate(
      userId, 
      updateData, 
      { new: true, runValidators: true }
    ).select('-password');
    
    res.json({
      success: true,
      message: "Profile updated successfully",
      data: user
    });
  } catch (error) {
    console.error("Error updating admin profile:", error);
    res.status(500).json({
      success: false,
      message: "Error updating admin profile",
      error: error.message
    });
  }
};

// Upload company logo
exports.uploadCompanyLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }
    
    const userId = req.user.id;
    const settings = await Settings.getInstance();
    
    // Delete old logo if exists
    if (settings.company.logo) {
      const publicId = extractPublicId(settings.company.logo);
      if (publicId) {
        await deleteImage(publicId);
      }
    }
    
    // Update with new logo
    settings.company.logo = req.file.path;
    settings.lastUpdatedBy = userId;
    await settings.save();
    
    res.json({
      success: true,
      message: "Company logo uploaded successfully",
      data: settings
    });
  } catch (error) {
    console.error("Error uploading company logo:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading company logo",
      error: error.message
    });
  }
};

// Reset settings to default
exports.resetSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Delete existing settings
    await Settings.deleteMany({});
    
    // Create new default settings
    const settings = await Settings.create({
      lastUpdatedBy: userId
    });
    
    res.json({
      success: true,
      message: "Settings reset to default successfully",
      data: settings
    });
  } catch (error) {
    console.error("Error resetting settings:", error);
    res.status(500).json({
      success: false,
      message: "Error resetting settings",
      error: error.message
    });
  }
};

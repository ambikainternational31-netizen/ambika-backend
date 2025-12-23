const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    // Company/General Settings
    company: {
      name: {
        type: String,
        default: "Ambika International"
      },
      website: {
        type: String,
        default: "https://ambikainternational.com"
      },
      email: {
        type: String,
        default: "info@ambikainternational.com"
      },
      phone: {
        type: String,
        default: "+91 12345 67890"
      },
      description: {
        type: String,
        default: "Leading supplier of hotel and hospitality amenities across India. We provide premium quality products for hotels, resorts, and restaurants."
      },
      logo: String, // URL to company logo
      address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: {
          type: String,
          default: "India"
        }
      }
    },
    
    // Notification Settings
    notifications: {
      emailNotifications: {
        type: Boolean,
        default: true
      },
      pushNotifications: {
        type: Boolean,
        default: true
      },
      orderUpdates: {
        type: Boolean,
        default: true
      },
      systemUpdates: {
        type: Boolean,
        default: false
      },
      marketingEmails: {
        type: Boolean,
        default: false
      }
    },
    
    // Security Settings
    security: {
      twoFactorAuth: {
        type: Boolean,
        default: false
      },
      passwordExpiry: {
        type: Number,
        default: 90 // days
      },
      sessionTimeout: {
        type: Number,
        default: 60 // minutes
      },
      loginAttempts: {
        type: Number,
        default: 5
      }
    },
    
    // System Settings
    system: {
      timezone: {
        type: String,
        default: "Asia/Kolkata"
      },
      currency: {
        type: String,
        default: "INR"
      },
      language: {
        type: String,
        default: "en"
      },
      dateFormat: {
        type: String,
        default: "DD/MM/YYYY"
      },
      maintenanceMode: {
        type: Boolean,
        default: false
      }
    },
    
    // Business Settings
    business: {
      taxRate: {
        type: Number,
        default: 18 // GST percentage
      },
      shippingCharges: {
        type: Number,
        default: 100
      },
      freeShippingThreshold: {
        type: Number,
        default: 2000
      },
      minimumOrderValue: {
        type: Number,
        default: 500
      }
    },
    
    // Last updated info
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { 
    timestamps: true,
    // Ensure only one settings document exists
    collection: 'settings'
  }
);

// Ensure singleton pattern - only one settings document
settingsSchema.statics.getInstance = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const Settings = mongoose.model("Settings", settingsSchema);

module.exports = Settings;

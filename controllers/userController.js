const User = require("../models/user");
const Wishlist = require("../models/wishlist");
const Product = require("../models/product");
const QuoteRequest = require("../models/quoteRequest");
const NotificationService = require("../services/notificationService");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");

// Register B2B user
exports.registerB2B = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { 
      username, 
      email, 
      password, 
      name,
      phone,
      companyName,
      businessType,
      gstNumber,
      businessAddress,
      contactPerson,
      designation,
      businessPhone,
      businessEmail,
      annualRequirement
    } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message:
          existingUser.email === email
            ? "Email already in use"
            : "Username already taken",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create B2B user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      name: name || username,
      phone,
      customerType: "B2B",
      approvalStatus: "pending",
      businessDetails: {
        companyName,
        businessType,
        gstNumber,
        businessAddress,
        contactPerson,
        designation,
        businessPhone,
        businessEmail,
        annualRequirement,
        isVerified: false
      }
    });

    // Generate token
    const token = generateToken(user._id, user.role);

    // Create notification for B2B registration
    try {
      await NotificationService.createB2BRegistrationNotification(user);
    } catch (notificationError) {
      console.error("Error creating B2B registration notification:", notificationError);
      // Don't fail the registration if notification fails
    }

    res.status(201).json({
      success: true,
      token,
      message: "B2B registration successful. Your account is pending approval.",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        customerType: user.customerType,
        approvalStatus: user.approvalStatus,
        businessDetails: user.businessDetails
      },
    });
  } catch (error) {
    console.error("B2B Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during B2B registration",
    });
  }
};

// Register user
exports.register = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { username, email, password, name } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message:
          existingUser.email === email
            ? "Email already in use"
            : "Username already taken",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      name: name || username,
      customerType: "B2C", // Default to B2C for regular registration
      approvalStatus: "approved" // B2C users are auto-approved
    });

    // Generate token
    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        customerType: user.customerType,
        approvalStatus: user.approvalStatus
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
};

// Login user
exports.login = async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log(`[LOGIN] Starting login process for ${req.body?.email || 'unknown'}`);
    
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log(`[LOGIN] Validation errors:`, errors.array());
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;
    console.log(`[LOGIN] Processing login for email: ${email}`);

    // Find user by email
    const userStartTime = Date.now();
    const user = await User.findOne({ email });
    console.log(`[LOGIN] User lookup took: ${Date.now() - userStartTime}ms`);
    
    if (!user) {
      console.log(`[LOGIN] User not found for email: ${email}`);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Compare password
    const bcryptStartTime = Date.now();
    const isMatch = await bcrypt.compare(password, user.password);
    console.log(`[LOGIN] Password comparison took: ${Date.now() - bcryptStartTime}ms`);
    
    if (!isMatch) {
      console.log(`[LOGIN] Password mismatch for email: ${email}`);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate token
    const tokenStartTime = Date.now();
    const token = generateToken(user._id, user.role);
    console.log(`[LOGIN] Token generation took: ${Date.now() - tokenStartTime}ms`);

    const totalTime = Date.now() - startTime;
    console.log(`[LOGIN] Login successful for ${email} - Total time: ${totalTime}ms`);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        customerType: user.customerType,
        approvalStatus: user.approvalStatus,
        businessDetails: user.businessDetails
      },
    });
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`[LOGIN] Error after ${totalTime}ms:`, error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    // User is already attached to req from auth middleware
    res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while retrieving profile",
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;

    // Find user and update
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        name,
        phone,
        address,
      },
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating profile",
    });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user._id);

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while changing password",
    });
  }
};

// Helper function to generate JWT
const generateToken = (id, role) => {
  return jwt.sign({ userId: id, role }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// Get user wishlist
exports.getWishlist = async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.user._id }).populate({
      path: "items.product",
      select: "name title price discountPrice images category stock",
      populate: {
        path: "category",
        select: "name",
      },
    });

    // If no wishlist exists, create an empty one
    if (!wishlist) {
      wishlist = await Wishlist.create({ user: req.user._id, items: [] });
    }

    res.status(200).json({
      success: true,
      data: {
        items: wishlist.items,
        totalItems: wishlist.items.length,
      },
    });
  } catch (error) {
    console.error("Get wishlist error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while retrieving wishlist",
    });
  }
};

// Add product to wishlist
exports.addToWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Find or create wishlist
    let wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) {
      wishlist = await Wishlist.create({ user: req.user._id, items: [] });
    }

    // Check if product already in wishlist
    if (wishlist.hasProduct(productId)) {
      return res.status(400).json({
        success: false,
        message: "Product already in wishlist",
      });
    }

    // Add product to wishlist
    wishlist.items.push({ product: productId });
    await wishlist.save();

    // Populate the wishlist for response
    await wishlist.populate({
      path: "items.product",
      select: "name title price discountPrice images category",
      populate: {
        path: "category",
        select: "name",
      },
    });

    res.status(200).json({
      success: true,
      message: "Product added to wishlist",
      data: {
        items: wishlist.items,
        totalItems: wishlist.items.length,
      },
    });
  } catch (error) {
    console.error("Add to wishlist error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while adding to wishlist",
    });
  }
};

// Remove product from wishlist
exports.removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    // Find wishlist
    const wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found",
      });
    }

    // Check if product exists in wishlist
    const itemIndex = wishlist.items.findIndex(
      item => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Product not found in wishlist",
      });
    }

    // Remove product from wishlist
    wishlist.items.splice(itemIndex, 1);
    await wishlist.save();

    // Populate the wishlist for response
    await wishlist.populate({
      path: "items.product",
      select: "name title price discountPrice images category",
      populate: {
        path: "category",
        select: "name",
      },
    });

    res.status(200).json({
      success: true,
      message: "Product removed from wishlist",
      data: {
        items: wishlist.items,
        totalItems: wishlist.items.length,
      },
    });
  } catch (error) {
    console.error("Remove from wishlist error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while removing from wishlist",
    });
  }
};

// Create quote request (B2B only)
exports.createQuoteRequest = async (req, res) => {
  try {
    // Check if user is B2B
    if (req.user.customerType !== "B2B") {
      return res.status(403).json({
        success: false,
        message: "Quote requests are only available for B2B customers",
      });
    }

    // Check if user is approved
    if (req.user.approvalStatus !== "approved") {
      return res.status(403).json({
        success: false,
        message: "Your B2B account needs to be approved before requesting quotes",
      });
    }

    const {
      items,
      deliveryAddress,
      deliveryTimeline,
      additionalRequirements,
      businessJustification,
      budgetRange
    } = req.body;

    // Validate items
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one item is required for quote request",
      });
    }

    // Create quote request
    const quoteRequest = await QuoteRequest.create({
      user: req.user._id,
      items,
      deliveryAddress,
      deliveryTimeline,
      additionalRequirements,
      businessJustification,
      budgetRange,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    });

    // Populate the quote request for response
    await quoteRequest.populate([
      {
        path: "items.product",
        select: "title images category price"
      },
      {
        path: "user",
        select: "name email businessDetails.companyName"
      }
    ]);

    // Create notification for quote request
    try {
      const user = await User.findById(req.user.id);
      await NotificationService.createQuoteRequestNotification(quoteRequest, user);
    } catch (notificationError) {
      console.error("Error creating quote request notification:", notificationError);
      // Don't fail the quote request if notification fails
    }

    res.status(201).json({
      success: true,
      message: "Quote request created successfully",
      data: quoteRequest
    });
  } catch (error) {
    console.error("Create quote request error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating quote request",
    });
  }
};

// Get user's quote requests
exports.getQuoteRequests = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const quoteRequests = await QuoteRequest.find({ user: req.user._id })
      .populate([
        {
          path: "items.product",
          select: "title images category price"
        }
      ])
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const totalQuoteRequests = await QuoteRequest.countDocuments({ user: req.user._id });

    res.status(200).json({
      success: true,
      data: {
        quoteRequests,
        totalQuoteRequests,
        currentPage: page,
        totalPages: Math.ceil(totalQuoteRequests / limit)
      }
    });
  } catch (error) {
    console.error("Get quote requests error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while retrieving quote requests",
    });
  }
};

// Get single quote request
exports.getQuoteRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const quoteRequest = await QuoteRequest.findOne({
      _id: id,
      user: req.user._id
    }).populate([
      {
        path: "items.product",
        select: "title images category price specifications"
      },
      {
        path: "quotedBy",
        select: "name email"
      }
    ]);

    if (!quoteRequest) {
      return res.status(404).json({
        success: false,
        message: "Quote request not found",
      });
    }

    res.status(200).json({
      success: true,
      data: quoteRequest
    });
  } catch (error) {
    console.error("Get quote request error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while retrieving quote request",
    });
  }
};

// Address Management Functions

// Get user addresses
exports.getAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('addresses');
    
    res.status(200).json({
      success: true,
      addresses: user.addresses || []
    });
  } catch (error) {
    console.error("Get addresses error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while retrieving addresses",
    });
  }
};

// Add new address
exports.addAddress = async (req, res) => {
  try {
    const {
      name,
      customName,
      fullName,
      phone,
      street,
      city,
      state,
      zipCode,
      landmark,
      isDefault
    } = req.body;

    // Validate required fields
    if (!name || !fullName || !phone || !street || !city || !state || !zipCode) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    // Validate custom name for 'Other' type
    if (name === 'Other' && !customName) {
      return res.status(400).json({
        success: false,
        message: "Custom name is required when address type is 'Other'",
      });
    }

    const user = await User.findById(req.user._id);

    // If this is the first address or isDefault is true, make it default
    if (user.addresses.length === 0 || isDefault) {
      // Remove default from other addresses
      user.addresses.forEach(addr => {
        addr.isDefault = false;
      });
    }

    // Create new address
    const newAddress = {
      name,
      customName: name === 'Other' ? customName : undefined,
      fullName,
      phone,
      street,
      city,
      state,
      zipCode,
      landmark,
      isDefault: user.addresses.length === 0 || isDefault
    };

    user.addresses.push(newAddress);
    await user.save();

    res.status(201).json({
      success: true,
      message: "Address added successfully",
      addresses: user.addresses
    });
  } catch (error) {
    console.error("Add address error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while adding address",
    });
  }
};

// Update address
exports.updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const {
      name,
      customName,
      fullName,
      phone,
      street,
      city,
      state,
      zipCode,
      landmark,
      isDefault
    } = req.body;

    const user = await User.findById(req.user._id);
    const address = user.addresses.id(addressId);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    // Validate required fields
    if (!name || !fullName || !phone || !street || !city || !state || !zipCode) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    // Validate custom name for 'Other' type
    if (name === 'Other' && !customName) {
      return res.status(400).json({
        success: false,
        message: "Custom name is required when address type is 'Other'",
      });
    }

    // If setting as default, remove default from other addresses
    if (isDefault) {
      user.addresses.forEach(addr => {
        if (addr._id.toString() !== addressId) {
          addr.isDefault = false;
        }
      });
    }

    // Update address
    address.name = name;
    address.customName = name === 'Other' ? customName : undefined;
    address.fullName = fullName;
    address.phone = phone;
    address.street = street;
    address.city = city;
    address.state = state;
    address.zipCode = zipCode;
    address.landmark = landmark;
    address.isDefault = isDefault;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Address updated successfully",
      addresses: user.addresses
    });
  } catch (error) {
    console.error("Update address error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating address",
    });
  }
};

// Delete address
exports.deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    const user = await User.findById(req.user._id);
    const address = user.addresses.id(addressId);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    // If deleting default address, make first remaining address default
    const wasDefault = address.isDefault;
    
    // Remove the address
    user.addresses.pull(addressId);

    // If the deleted address was default and there are remaining addresses, make the first one default
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Address deleted successfully",
      addresses: user.addresses
    });
  } catch (error) {
    console.error("Delete address error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting address",
    });
  }
};

// Set default address
exports.setDefaultAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    const user = await User.findById(req.user._id);
    const address = user.addresses.id(addressId);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    // Remove default from all addresses
    user.addresses.forEach(addr => {
      addr.isDefault = false;
    });

    // Set this address as default
    address.isDefault = true;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Default address updated successfully",
      addresses: user.addresses
    });
  } catch (error) {
    console.error("Set default address error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while setting default address",
    });
  }
};

// Forgot password - Send OTP
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email address"
      });
    }

    // Check for rate limiting (max 3 attempts per hour)
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    // if (user.lastOTPRequest && user.lastOTPRequest > oneHourAgo && user.resetPasswordAttempts >= 3) {
    //   return res.status(429).json({
    //     success: false,
    //     message: "Too many reset attempts. Please try again in 1 hour."
    //   });
    // }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set OTP expiry (10 minutes)
    const otpExpiry = new Date(now.getTime() + 10 * 60 * 1000);

    // Update user with OTP details
    user.resetPasswordOTP = otp;
    user.resetPasswordExpires = otpExpiry;
    user.resetPasswordAttempts = (user.resetPasswordAttempts || 0) + 1;
    user.lastOTPRequest = now;
    
    await user.save();

    // Send OTP email
    const emailService = require('../utils/emailService');
    
    try {
      const emailResult = await emailService.sendEmail({
        to: user.email,
        subject: 'Password Reset OTP - Ambika International',
        template: 'password_reset_otp',
        variables: {
          name: user.name || user.username,
          otp: otp,
          companyName: 'Ambika International',
          expiryTime: '10 minutes'
        }
      });

      // Handle different email sending scenarios
      if (emailResult.devMode) {
        res.status(200).json({
          success: true,
          message: "OTP generated successfully! Check console/logs for OTP (Development Mode)",
          email: email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
          devNote: "Email service in development mode - check server console for OTP"
        });
      } else {
        res.status(200).json({
          success: true,
          message: "Password reset OTP sent to your email address",
          email: email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
        });
      }
    } catch (emailError) {
      console.error("Email sending error:", emailError);
      
      // For development, still return success but show OTP in console
      if (process.env.NODE_ENV === 'development') {
        console.log(`\n🔐 DEVELOPMENT MODE - Password Reset OTP`);
        console.log(`Email: ${email}`);
        console.log(`OTP: ${otp}`);
        console.log(`Expires: ${otpExpiry}`);
        console.log(`Use this OTP in the reset password form\n`);
        
        res.status(200).json({
          success: true,
          message: "OTP generated successfully! Check server console for OTP (Development Mode)",
          email: email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
          devNote: "Check server console for OTP - Email service failed"
        });
      } else {
        // Clear OTP data if email fails in production
        user.resetPasswordOTP = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        
        res.status(500).json({
          success: false,
          message: "Failed to send reset email. Please try again."
        });
      }
    }
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while processing password reset request"
    });
  }
};

// Verify OTP and reset password
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // Validate input
    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP, and new password are required"
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long"
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email address"
      });
    }

    // Check if OTP exists and is not expired
    if (!user.resetPasswordOTP || !user.resetPasswordExpires) {
      return res.status(400).json({
        success: false,
        message: "No password reset request found. Please request a new OTP."
      });
    }

    if (user.resetPasswordExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one."
      });
    }

    // Verify OTP
    if (user.resetPasswordOTP !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please check and try again."
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password and clear reset fields
    user.password = hashedPassword;
    user.resetPasswordOTP = undefined;
    user.resetPasswordExpires = undefined;
    user.resetPasswordAttempts = 0;
    user.lastOTPRequest = undefined;

    await user.save();

    // Send confirmation email
    const emailService = require('../utils/emailService');
    
    try {
      await emailService.sendEmail({
        to: user.email,
        subject: 'Password Reset Successful - Ambika International',
        template: 'password_reset_success',
        variables: {
          name: user.name || user.username,
          companyName: 'Ambika International',
          timestamp: new Date().toLocaleString()
        }
      });
    } catch (emailError) {
      console.error("Confirmation email error:", emailError);
      // Don't fail the request if confirmation email fails
    }

    res.status(200).json({
      success: true,
      message: "Password reset successful. You can now login with your new password."
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while resetting password"
    });
  }
};

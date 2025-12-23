const Product = require('../models/product');
const Category = require('../models/category');
const Cart = require('../models/cart');
const Wishlist = require('../models/wishlist');
const NotificationService = require('../services/notificationService');
const { deleteImage, extractPublicId } = require('../config/cloudinary');

// Get all products with filtering and pagination
const getProducts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10,
      category,
      search,
      sort = "createdAt",
      order = "desc",
      minPrice,
      maxPrice,
      status
    } = req.query;
    
    // Build query
    const query = {};
    
    // Filter by category
    if (category) {
      query.category = category;
    }
    
    // Filter by search term
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }
    
    // Filter by price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Remove tags filter since we removed tags field
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Sort options
    const sortOptions = {};
    sortOptions[sort] = order === "desc" ? -1 : 1;
    
    // Execute query
    const products = await Product.find(query)
      .populate('category', 'name')
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip(skip)
      .lean();
    
    // Get total count
    const total = await Product.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        products,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / parseInt(limit)),
          count: products.length,
          totalItems: total
        }
      }
    });
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching products",
      error: error.message
    });
  }
};

// Get single product
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name description');
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }
    
    res.json({
      success: true,
      data: { product }
    });
  } catch (error) {
    console.error("Get product error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching product",
      error: error.message
    });
  }
};

// Create product (Admin only)
const createProduct = async (req, res, next) => {
  try {
    // Debug logging
    console.log('📝 Create Product Request Body:', req.body);
    console.log('📸 Files:', req.files);
    
    const {
      title,
      description,
      price,
      discountPrice,
      stock,
      category,
      features,
      specifications,
      warranty,
      status = 'active',
      minOrderQuantity = 1,
      featured = false
    } = req.body;

    console.log('🔥 Featured value received:', featured, 'Type:', typeof featured);

    // Validate required fields
    if (!title || !description || !price || !category) {
      console.log('❌ Validation failed - missing required fields');
      return res.status(400).json({
        success: false,
        message: "Title, description, price, and category are required"
      });
    }

    // Handle images from multer
    const uploadedFiles = req.files && req.files.images ? req.files.images : [];
    const images = uploadedFiles.map(file => file.path);
    console.log('📷 Images processed:', images.length, 'files:', uploadedFiles);
    
    if (images.length === 0) {
      console.log('❌ No images provided for new product');
      return res.status(400).json({
        success: false,
        message: "At least one product image is required"
      });
    }

    // Process features (convert comma-separated string to array)
    const processedFeatures = typeof features === 'string' 
      ? features.split('\n').map(feature => feature.trim()).filter(Boolean)
      : Array.isArray(features) ? features : [];

    console.log('✨ Processed features:', processedFeatures);

    // Process specifications
    let processedSpecs = [];
    
    if (typeof specifications === 'string') {
      try {
        // Try to parse as JSON first
        processedSpecs = JSON.parse(specifications);
        if (!Array.isArray(processedSpecs)) {
          // If it's an object, convert it to array format
          processedSpecs = Object.entries(processedSpecs).map(([key, value]) => ({
            key: key.trim(),
            value: value.toString().trim()
          }));
        }
      } catch (error) {
        // If not JSON, treat as key-value pairs separated by newlines
        processedSpecs = specifications.split('\n')
          .map(line => {
            const [key, ...valueParts] = line.split(':');
            if (key && valueParts.length > 0) {
              return {
                key: key.trim(),
                value: valueParts.join(':').trim()
              };
            }
            return null;
          })
          .filter(spec => spec !== null);
      }
    } else if (Array.isArray(specifications)) {
      processedSpecs = specifications;
    } else if (typeof specifications === 'object' && specifications !== null) {
      processedSpecs = Object.entries(specifications).map(([key, value]) => ({
        key: key.trim(),
        value: value.toString().trim()
      }));
    }
    
    console.log('📋 Processed specifications:', processedSpecs);

    console.log('💾 Creating product in database...');

    // Create product
    const product = new Product({
      title: title.trim(),
      description: description.trim(),
      price: parseFloat(price),
      discountPrice: discountPrice ? parseFloat(discountPrice) : undefined,
      stock: parseInt(stock) || 0,
      category,
      features: processedFeatures,
      specifications: processedSpecs,
      warranty: warranty?.trim(),
      status,
      minOrderQuantity: parseInt(minOrderQuantity) || 1,
      featured: featured === 'true' || featured === true,
      images
    });

    console.log('💾 Saving product to database...');
    const savedProduct = await product.save();
    console.log('✅ Product saved successfully:', savedProduct._id);

    console.log('🔗 Populating category data...');
    await savedProduct.populate('category', 'name description');
    console.log('✅ Category populated successfully');

    console.log('📤 Sending response...');
    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: { product: savedProduct }
    });

  } catch (error) {
    console.error("❌ Create product error:", error);
    console.error("❌ Error stack:", error.stack);
    
    // Clean up uploaded images if product creation fails
    const uploadedFiles = req.files && req.files.images ? req.files.images : [];
    if (uploadedFiles.length > 0) {
      console.log('🧹 Cleaning up uploaded images...');
      for (const file of uploadedFiles) {
        try {
          const publicId = extractPublicId(file.path);
          if (publicId) {
            await deleteImage(publicId);
            console.log('🗑️ Cleaned up image:', publicId);
          }
        } catch (cleanupError) {
          console.error("❌ Error cleaning up image:", cleanupError);
        }
      }
    }

    // Pass error to express error handler
    next(error);
  }
};

// Update product (Admin only)
const updateProduct = async (req, res, next) => {
  try {
    // Debug logging
    console.log('📝 Update Product Request Body:', req.body);
    console.log('📸 Files:', req.files);
    
    const { id } = req.params;
    const {
      title,
      description,
      price,
      discountPrice,
      stock,
      category,
      status,
      specifications,
      warranty,
      minOrderQuantity,
      featured,
      removeImages
    } = req.body;

    console.log('🔥 Featured value received for update:', featured, 'Type:', typeof featured);

    // Find existing product
    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    // Handle new images from multer
    const uploadedFiles = req.files && req.files.images ? req.files.images : [];
    const newImages = uploadedFiles.map(file => file.path);
    console.log('📷 New images to add:', newImages.length);

    // Start with existing images
    let updatedImages = [...existingProduct.images];
    console.log('📷 Starting with existing images:', updatedImages.length);

    // Handle image removal (parse JSON if string)
    if (removeImages) {
      let imagesToRemove = removeImages;
      if (typeof removeImages === 'string') {
        try {
          imagesToRemove = JSON.parse(removeImages);
        } catch (error) {
          console.log('Error parsing removeImages JSON:', error.message);
          imagesToRemove = [];
        }
      }
      
      if (imagesToRemove && imagesToRemove.length > 0) {
        const imageArray = Array.isArray(imagesToRemove) ? imagesToRemove : [imagesToRemove];
        console.log('📷 Images to remove:', imageArray);
        
        // Remove images from Cloudinary
        for (const imageUrl of imageArray) {
          try {
            const publicId = extractPublicId(imageUrl);
            await deleteImage(publicId);
            console.log('🗑️ Deleted image from Cloudinary:', publicId);
          } catch (cleanupError) {
            console.error("Error removing image:", cleanupError);
          }
        }
        
        // Remove from array
        updatedImages = updatedImages.filter(img => !imageArray.includes(img));
        console.log('📷 Images after removal:', updatedImages.length);
      }
    }

    // Add new images if any
    if (newImages.length > 0) {
      updatedImages = [...updatedImages, ...newImages];
      console.log('📷 Images after adding new ones:', updatedImages.length);
    }

    // Validate that at least one image remains
    if (updatedImages.length === 0) {
      console.log('❌ No images remaining after update');
      
      // Clean up any uploaded images since update will fail
      if (newImages.length > 0) {
        for (const imageUrl of newImages) {
          try {
            const publicId = extractPublicId(imageUrl);
            if (publicId) {
              await deleteImage(publicId);
            }
          } catch (cleanupError) {
            console.error("Error cleaning up uploaded image:", cleanupError);
          }
        }
      }
      
      return res.status(400).json({
        success: false,
        message: "At least one product image is required"
      });
    }

    // We don't need tags processing anymore since we removed tags from the schema

    // Process specifications
    let processedSpecs = existingProduct.specifications || [];
    if (specifications) {
      if (typeof specifications === 'string') {
        try {
          // Try to parse as JSON first
          processedSpecs = JSON.parse(specifications);
          if (!Array.isArray(processedSpecs)) {
            // If it's an object, convert it to array format
            processedSpecs = Object.entries(processedSpecs).map(([key, value]) => ({
              key: key.trim(),
              value: value.toString().trim()
            }));
          }
        } catch (error) {
          console.log('❌ Update: Error parsing specifications JSON:', error.message);
          // If parsing fails, try to process as newline-separated key-value pairs
          processedSpecs = specifications.split('\n')
            .map(line => {
              const [key, ...valueParts] = line.split(':');
              if (key && valueParts.length > 0) {
                return {
                  key: key.trim(),
                  value: valueParts.join(':').trim()
                };
              }
              return null;
            })
            .filter(spec => spec !== null);
        }
      } else if (Array.isArray(specifications)) {
        processedSpecs = specifications;
      } else if (typeof specifications === 'object' && specifications !== null) {
        processedSpecs = Object.entries(specifications).map(([key, value]) => ({
          key: key.trim(),
          value: value.toString().trim()
        }));
      }
    }
    
    console.log('✅ Update: Final processed specifications:', processedSpecs);

    // Update product
    const updateData = {
      title: title ? title.trim() : existingProduct.title,
      description: description ? description.trim() : existingProduct.description,
      price: price ? parseFloat(price) : existingProduct.price,
      discountPrice: discountPrice && discountPrice !== '' ? parseFloat(discountPrice) : (discountPrice === '' ? null : existingProduct.discountPrice),
      stock: stock !== undefined && stock !== '' ? parseInt(stock) : existingProduct.stock,
      category: category || existingProduct.category,
      status: status || existingProduct.status,
      specifications: processedSpecs,
      features: Array.isArray(req.body.features) ? req.body.features : 
               (typeof req.body.features === 'string' ? 
                req.body.features.split('\n').map(f => f.trim()).filter(Boolean) : 
                existingProduct.features),
      warranty: warranty ? warranty.trim() : existingProduct.warranty,
      minOrderQuantity: minOrderQuantity && minOrderQuantity !== '' ? parseInt(minOrderQuantity) : existingProduct.minOrderQuantity,
      featured: featured !== undefined ? (featured === 'true' || featured === true) : existingProduct.featured,
      images: updatedImages
    };
    
    console.log('📦 Update: Final updateData images:', updateData.images);
    console.log('📦 Update: Final updateData (full):', updateData);

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('category', 'name description');

    console.log('✅ Product updated successfully:', updatedProduct.title);

    res.json({
      success: true,
      message: "Product updated successfully",
      data: { product: updatedProduct }
    });
  } catch (error) {
    console.error("❌ Update product error:", error);
    console.error("❌ Error stack:", error.stack);
    
    // Clean up uploaded images if update fails
    const uploadedFiles = req.files && req.files.images ? req.files.images : [];
    if (uploadedFiles.length > 0) {
      console.log('🧹 Cleaning up uploaded images...');
      for (const file of uploadedFiles) {
        try {
          const publicId = extractPublicId(file.path);
          if (publicId) {
            await deleteImage(publicId);
            console.log('🗑️ Cleaned up image:', publicId);
          }
        } catch (cleanupError) {
          console.error("❌ Error cleaning up image:", cleanupError);
        }
      }
    }

    // Pass error to express error handler
    next(error);
  }
};

// Delete product (Admin only)
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    // Delete images from Cloudinary
    if (product.images && product.images.length > 0) {
      for (const imageUrl of product.images) {
        try {
          const publicId = extractPublicId(imageUrl);
          await deleteImage(publicId);
        } catch (cleanupError) {
          console.error("Error deleting image:", cleanupError);
        }
      }
    }

    // Delete product from database
    await Product.findByIdAndDelete(id);

    // Clean up cart items that reference this deleted product
    try {
      const cartResult = await Cart.updateMany(
        { 'items.product': id },
        { $pull: { items: { product: id } } }
      );
      console.log(`Cleaned up ${cartResult.modifiedCount} carts after deleting product ${id}`);
    } catch (cartCleanupError) {
      console.error("Error cleaning up cart items:", cartCleanupError);
      // Don't fail the product deletion if cart cleanup fails
    }

    // Clean up wishlist items that reference this deleted product
    try {
      const wishlistResult = await Wishlist.updateMany(
        { 'items.product': id },
        { $pull: { items: { product: id } } }
      );
      console.log(`Cleaned up ${wishlistResult.modifiedCount} wishlists after deleting product ${id}`);
    } catch (wishlistCleanupError) {
      console.error("Error cleaning up wishlist items:", wishlistCleanupError);
      // Don't fail the product deletion if wishlist cleanup fails
    }

    res.json({
      success: true,
      message: "Product deleted successfully"
    });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting product",
      error: error.message
    });
  }
};

// Bulk update products
const bulkUpdateProducts = async (req, res) => {
  try {
    const { productIds, updateData } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Product IDs array is required"
      });
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Update data is required"
      });
    }

    // Update multiple products
    const result = await Product.updateMany(
      { _id: { $in: productIds } },
      { 
        ...updateData,
        updatedAt: new Date()
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} products updated successfully`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      }
    });
  } catch (error) {
    console.error("Bulk update error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating products",
      error: error.message
    });
  }
};

// Check for low stock and create notifications
const checkLowStock = async () => {
  try {
    const lowStockThreshold = 10; // Configure this as needed
    
    const lowStockProducts = await Product.find({
      stock: { $lte: lowStockThreshold },
      status: 'active'
    });

    for (const product of lowStockProducts) {
      // Check if we already have a recent notification for this product
      const existingNotification = await require('../models/notification').findOne({
        type: 'low_stock',
        'data.productId': product._id,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Within last 24 hours
      });

      if (!existingNotification) {
        await NotificationService.createLowStockNotification(product, product.stock, lowStockThreshold);
      }
    }

    return lowStockProducts.length;
  } catch (error) {
    console.error('Error checking low stock:', error);
    return 0;
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkUpdateProducts,
  checkLowStock
};
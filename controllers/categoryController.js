const Category = require('../models/category');
const Product = require('../models/product');
const { deleteImage, extractPublicId } = require('../config/cloudinary');

// Get all categories
const getCategories = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      query.isActive = status === 'active';
    } else {
      query.isActive = true; // Default to active categories
    }

    // Execute query with pagination
    const categories = await Category.find(query)
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    // Get total count
    const total = await Category.countDocuments(query);

    // Add product count to each category
    const categoriesWithProductCount = await Promise.all(
      categories.map(async (category) => {
        const productCount = await Product.countDocuments({ 
          category: category._id
        });
        return {
          ...category,
          productCount
        };
      })
    );

    res.json({
      success: true,
      count: categoriesWithProductCount.length,
      categories: categoriesWithProductCount,
      data: {
        categories: categoriesWithProductCount,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / parseInt(limit)),
          count: categories.length,
          totalItems: total
        }
      }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
};

// Get single category
const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Get product count
    const productCount = await Product.countDocuments({ 
      category: category._id
    });

    res.json({
      success: true,
      category: {
        ...category.toObject(),
        productCount
      }
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching category',
      error: error.message
    });
  }
};

// Create category (Admin only)
const createCategory = async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Object.keys(req.body).length === 0) {
      console.log('❌ Request body is missing or empty');
      return res.status(400).json({
        success: false,
        message: 'Request body is missing',
        error: 'No form data received',
        debug: {
          bodyType: typeof req.body,
          bodyKeys: req.body ? Object.keys(req.body) : 'null',
          files: req.files,
          contentType: req.headers['content-type']
        }
      });
    }
    
    const { name, description } = req.body;
    const isActive = req.body.isActive === 'true' || req.body.isActive === true;
    
    console.log('✅ Parsed data:', { name, description, isActive });
    
    // Validate required fields
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }

    // Check if category already exists
    const existingCategory = await Category.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } 
    });

    if (existingCategory) {
      // If image was uploaded, delete it from Cloudinary
      if (req.files && req.files.image && req.files.image[0]) {
        const publicId = extractPublicId(req.files.image[0].path);
        if (publicId) {
          await deleteImage(publicId);
        }
      }
      
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }

    // Create category data
    const categoryData = {
      name: name.trim(),
      description: description ? description.trim() : '',
      isActive
    };

    // Add image if uploaded
    if (req.files && req.files.image && req.files.image[0]) {
      categoryData.image = req.files.image[0].path;
    }

    const category = new Category(categoryData);
    await category.save();

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category
    });
  } catch (error) {
    console.error('Create category error:', error);
    
    // If image was uploaded, delete it from Cloudinary
    if (req.files && req.files.image && req.files.image[0]) {
      const publicId = extractPublicId(req.files.image[0].path);
      if (publicId) {
        await deleteImage(publicId);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Error creating category',
      error: error.message
    });
  }
};

// Update category (Admin only)
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      // If new image was uploaded, delete it from Cloudinary
      if (req.files && req.files.image && req.files.image[0]) {
        const publicId = extractPublicId(req.files.image[0].path);
        if (publicId) {
          await deleteImage(publicId);
        }
      }
      
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if new name conflicts with existing category
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: id }
      });

      if (existingCategory) {
        // If new image was uploaded, delete it from Cloudinary
        if (req.files && req.files.image && req.files.image[0]) {
          const publicId = extractPublicId(req.files.image[0].path);
          if (publicId) {
            await deleteImage(publicId);
          }
        }
        
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists'
        });
      }
    }

    // Store old image URL for potential deletion
    const oldImageUrl = category.image;

    // Update category data
    if (name) category.name = name;
    if (description !== undefined) category.description = description;
    if (isActive !== undefined) category.isActive = isActive;

    // Update image if new one uploaded
    if (req.files && req.files.image && req.files.image[0]) {
      category.image = req.files.image[0].path;
    }

    await category.save();

    // Delete old image from Cloudinary if new image was uploaded
    if (req.files && req.files.image && req.files.image[0] && oldImageUrl) {
      const oldPublicId = extractPublicId(oldImageUrl);
      if (oldPublicId) {
        await deleteImage(oldPublicId);
      }
    }

    res.json({
      success: true,
      message: 'Category updated successfully',
      category
    });
  } catch (error) {
    console.error('Update category error:', error);
    
    // If new image was uploaded, delete it from Cloudinary
    if (req.files && req.files.image && req.files.image[0]) {
      const publicId = extractPublicId(req.files.image[0].path);
      if (publicId) {
        await deleteImage(publicId);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Error updating category',
      error: error.message
    });
  }
};

// Delete category (Admin only)
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category has products
    const productCount = await Product.countDocuments({ category: id });
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. It has ${productCount} products associated with it. Please move or delete the products first.`
      });
    }

    // Delete image from Cloudinary if exists
    if (category.image) {
      const publicId = extractPublicId(category.image);
      if (publicId) {
        await deleteImage(publicId);
      }
    }

    await Category.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting category',
      error: error.message
    });
  }
};

// Bulk operations
const bulkUpdateCategories = async (req, res) => {
  try {
    const { operations } = req.body;

    if (!operations || !Array.isArray(operations)) {
      return res.status(400).json({
        success: false,
        message: 'Operations array is required'
      });
    }

    const results = [];

    for (const operation of operations) {
      try {
        const { action, categoryId, data } = operation;

        switch (action) {
          case 'update':
            await Category.findByIdAndUpdate(categoryId, data);
            results.push({ categoryId, status: 'updated' });
            break;
          
          case 'delete':
            const productCount = await Product.countDocuments({ category: categoryId });
            if (productCount === 0) {
              const category = await Category.findById(categoryId);
              if (category?.image) {
                const publicId = extractPublicId(category.image);
                if (publicId) {
                  await deleteImage(publicId);
                }
              }
              await Category.findByIdAndDelete(categoryId);
              results.push({ categoryId, status: 'deleted' });
            } else {
              results.push({ categoryId, status: 'error', message: 'Has products' });
            }
            break;
          
          default:
            results.push({ categoryId, status: 'error', message: 'Invalid action' });
        }
      } catch (error) {
        results.push({ 
          categoryId: operation.categoryId, 
          status: 'error', 
          message: error.message 
        });
      }
    }

    res.json({
      success: true,
      message: 'Bulk operations completed',
      data: { results }
    });
  } catch (error) {
    console.error('Bulk operations error:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing bulk operations',
      error: error.message
    });
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  bulkUpdateCategories
};
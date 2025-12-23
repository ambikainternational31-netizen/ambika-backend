const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('❌ Cloudinary configuration missing. Please check your .env file');
  throw new Error('Cloudinary configuration missing');
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'ambika-ecommerce', // Folder name in Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { 
        width: 600, 
        height: 600, 
        crop: 'limit', 
        quality: '70',  // Reduced quality from 'auto' to 60%
        format: 'webp'  // Convert to WebP for better compression
      }, 
    ],
  },
});

// Create multer upload middleware
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 3 * 1024 * 1024, // Reduced to 3MB limit from 5MB
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Helper function to delete image from Cloudinary
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    throw error;
  }
};

// Helper function to extract public ID from Cloudinary URL
const extractPublicId = (url) => {
  if (!url) return null;
  
  const matches = url.match(/\/v\d+\/(.+)\./);
  return matches ? matches[1] : null;
};

// Helper function to generate optimized URLs for different use cases
const getOptimizedImageUrl = (publicId, options = {}) => {
  const {
    width = 600,
    height = 600,
    quality = '70',
    format = 'webp'
  } = options;
  
  return cloudinary.url(publicId, {
    width,
    height,
    crop: 'limit',
    quality,
    format,
    fetch_format: 'auto',
    dpr: 'auto'
  });
};

// Pre-defined image variants for different use cases
const IMAGE_VARIANTS = {
  thumbnail: { width: 150, height: 150, quality: '50' },
  card: { width: 300, height: 300, quality: '60' },
  detail: { width: 600, height: 600, quality: '70' },
  gallery: { width: 800, height: 800, quality: '80' }
};

module.exports = {
  cloudinary,
  upload,
  deleteImage,
  extractPublicId,
  getOptimizedImageUrl,
  IMAGE_VARIANTS
};

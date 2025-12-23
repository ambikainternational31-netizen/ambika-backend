// Constants for backend configuration and shared values

// Environment constants
const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test'
};

// HTTP status codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// Error messages
const ERROR_MESSAGES = {
  INTERNAL_SERVER_ERROR: 'Internal server error',
  VALIDATION_ERROR: 'Validation failed',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  NOT_FOUND: 'Resource not found',
  USER_NOT_FOUND: 'User not found',
  PRODUCT_NOT_FOUND: 'Product not found',
  ORDER_NOT_FOUND: 'Order not found',
  CATEGORY_NOT_FOUND: 'Category not found',
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_ALREADY_EXISTS: 'Email already exists',
  PHONE_ALREADY_EXISTS: 'Phone number already exists',
  INVALID_TOKEN: 'Invalid or expired token',
  PASSWORD_MISMATCH: 'Passwords do not match',
  INSUFFICIENT_STOCK: 'Insufficient stock available',
  INVALID_FILE_TYPE: 'Invalid file type',
  FILE_TOO_LARGE: 'File size exceeds limit',
  RATE_LIMIT_EXCEEDED: 'Too many requests, please try again later'
};

// Success messages
const SUCCESS_MESSAGES = {
  USER_CREATED: 'User created successfully',
  USER_UPDATED: 'User updated successfully',
  USER_DELETED: 'User deleted successfully',
  PRODUCT_CREATED: 'Product created successfully',
  PRODUCT_UPDATED: 'Product updated successfully',
  PRODUCT_DELETED: 'Product deleted successfully',
  CATEGORY_CREATED: 'Category created successfully',
  CATEGORY_UPDATED: 'Category updated successfully',
  CATEGORY_DELETED: 'Category deleted successfully',
  ORDER_CREATED: 'Order created successfully',
  ORDER_UPDATED: 'Order updated successfully',
  ORDER_CANCELLED: 'Order cancelled successfully',
  LOGIN_SUCCESS: 'Logged in successfully',
  LOGOUT_SUCCESS: 'Logged out successfully',
  PASSWORD_UPDATED: 'Password updated successfully',
  EMAIL_SENT: 'Email sent successfully',
  PAYMENT_SUCCESS: 'Payment processed successfully'
};

// User roles
const USER_ROLES = {
  ADMIN: 'admin',
  CUSTOMER: 'customer',
  B2B_CUSTOMER: 'b2b_customer',
  MANAGER: 'manager'
};

// User status
const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING: 'pending'
};

// Product status
const PRODUCT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  OUT_OF_STOCK: 'out_of_stock',
  DISCONTINUED: 'discontinued'
};

// Order status
const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  RETURNED: 'returned',
  REFUNDED: 'refunded'
};

// Payment status
const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
};

// Payment methods
const PAYMENT_METHODS = {
  CARD: 'card',
  UPI: 'upi',
  NET_BANKING: 'net_banking',
  WALLET: 'wallet',
  COD: 'cod'
};

// Notification types
const NOTIFICATION_TYPES = {
  ORDER_PLACED: 'order_placed',
  ORDER_CONFIRMED: 'order_confirmed',
  ORDER_SHIPPED: 'order_shipped',
  ORDER_DELIVERED: 'order_delivered',
  ORDER_CANCELLED: 'order_cancelled',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  STOCK_LOW: 'stock_low',
  PROMOTION: 'promotion',
  WELCOME: 'welcome'
};

// File types
const ALLOWED_FILE_TYPES = {
  IMAGES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
  DOCUMENTS: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
};

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
  IMAGE: 5 * 1024 * 1024, // 5MB
  DOCUMENT: 10 * 1024 * 1024 // 10MB
};

// Cache TTL (in seconds)
const CACHE_TTL = {
  PRODUCTS: 10 * 60, // 10 minutes
  CATEGORIES: 30 * 60, // 30 minutes
  USERS: 5 * 60, // 5 minutes
  SETTINGS: 60 * 60, // 1 hour
  SEARCH_RESULTS: 15 * 60 // 15 minutes
};

// Pagination defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1
};

// Rate limiting (Relaxed for better user experience)
const RATE_LIMITS = {
  GENERAL: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200 // Increased from 100 to 200 requests per window
  },
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20 // Increased from 5 to 20 login attempts per window
  },
  API: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 120 // Increased from 60 to 120 requests per minute
  }
};

// Email templates
const EMAIL_TEMPLATES = {
  WELCOME: 'welcome',
  PASSWORD_RESET: 'password_reset',
  ORDER_CONFIRMATION: 'order_confirmation',
  ORDER_SHIPPED: 'order_shipped',
  ORDER_DELIVERED: 'order_delivered',
  INVOICE: 'invoice'
};

// Database collection names
const COLLECTIONS = {
  USERS: 'users',
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  ORDERS: 'orders',
  CARTS: 'carts',
  WISHLISTS: 'wishlists',
  NOTIFICATIONS: 'notifications',
  SETTINGS: 'settings',
  ANALYTICS: 'analytics',
  SUBSCRIPTIONS: 'subscriptions',
  QUOTE_REQUESTS: 'quoterequests'
};

// Regex patterns
const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[+]?[\d\s\-\(\)]{10,15}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  NAME: /^[a-zA-Z\s]{2,50}$/,
  PINCODE: /^[1-9][0-9]{5}$/,
  GST: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
  PAN: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
};

// Default values
const DEFAULTS = {
  CURRENCY: 'INR',
  LANGUAGE: 'en',
  TIMEZONE: 'Asia/Kolkata',
  COUNTRY: 'India',
  PRODUCT_IMAGE: '/images/default-product.jpg',
  USER_AVATAR: '/images/default-avatar.jpg'
};

// API endpoints (for external services)
const EXTERNAL_APIS = {

  CLOUDINARY: {
    BASE_URL: 'https://api.cloudinary.com/v1_1'
  }
};

// JWT configuration
const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
  PASSWORD_RESET_EXPIRY: '1h',
  EMAIL_VERIFICATION_EXPIRY: '24h'
};

// Cookie settings
const COOKIE_SETTINGS = {
  HTTP_ONLY: true,
  SECURE: process.env.NODE_ENV === 'production',
  SAME_SITE: 'strict',
  MAX_AGE: 7 * 24 * 60 * 60 * 1000 // 7 days
};

// CORS settings
const CORS_OPTIONS = {
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://ambika-international-ixiy2810o-faizwebworks-projects.vercel.app',
        'https://ambika-international.vercel.app',
        'https://ambika-frontend.vercel.app',
        process.env.FRONTEND_URL
      ].filter(Boolean)
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

module.exports = {
  ENVIRONMENTS,
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  USER_ROLES,
  USER_STATUS,
  PRODUCT_STATUS,
  ORDER_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHODS,
  NOTIFICATION_TYPES,
  ALLOWED_FILE_TYPES,
  FILE_SIZE_LIMITS,
  CACHE_TTL,
  PAGINATION,
  RATE_LIMITS,
  EMAIL_TEMPLATES,
  COLLECTIONS,
  REGEX_PATTERNS,
  DEFAULTS,
  EXTERNAL_APIS,
  JWT_CONFIG,
  COOKIE_SETTINGS,
  CORS_OPTIONS
};

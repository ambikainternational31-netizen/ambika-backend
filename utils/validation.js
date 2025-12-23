// Validation schemas using Joi would be ideal, but for now using simple validators

// Email validation
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone validation (Indian numbers)
const isValidPhone = (phone) => {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
};

// Password validation
const isValidPassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// Pincode validation
const isValidPincode = (pincode) => {
  const pincodeRegex = /^[1-9][0-9]{5}$/;
  return pincodeRegex.test(pincode);
};

// GSTIN validation
const isValidGSTIN = (gstin) => {
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin);
};

// MongoDB ObjectId validation
const isValidObjectId = (id) => {
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return objectIdRegex.test(id);
};

// URL validation
const isValidURL = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Sanitize input (basic XSS prevention)
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .trim();
};

// Validate required fields
const validateRequired = (fields, data) => {
  const errors = [];
  
  fields.forEach(field => {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      errors.push(`${field} is required`);
    }
  });
  
  return errors;
};

// Product validation
const validateProduct = (productData) => {
  const errors = [];
  
  // Required fields
  const requiredFields = ['title', 'description', 'price', 'stock', 'category'];
  errors.push(...validateRequired(requiredFields, productData));
  
  // Price validation
  if (productData.price && (isNaN(productData.price) || productData.price <= 0)) {
    errors.push('Price must be a positive number');
  }
  
  // Stock validation
  if (productData.stock && (isNaN(productData.stock) || productData.stock < 0)) {
    errors.push('Stock must be a non-negative number');
  }
  
  // Category validation
  if (productData.category && !isValidObjectId(productData.category)) {
    errors.push('Invalid category ID');
  }
  
  return errors;
};

// User validation
const validateUser = (userData, isUpdate = false) => {
  const errors = [];
  
  // Required fields for registration
  if (!isUpdate) {
    const requiredFields = ['name', 'email', 'password'];
    errors.push(...validateRequired(requiredFields, userData));
  }
  
  // Email validation
  if (userData.email && !isValidEmail(userData.email)) {
    errors.push('Invalid email format');
  }
  
  // Password validation (only for new users or password updates)
  if (userData.password && !isValidPassword(userData.password)) {
    errors.push('Password must be at least 8 characters with uppercase, lowercase, and number');
  }
  
  // Phone validation
  if (userData.phone && !isValidPhone(userData.phone)) {
    errors.push('Invalid phone number format');
  }
  
  return errors;
};

// Order validation
const validateOrder = (orderData) => {
  const errors = [];
  
  // Required fields
  const requiredFields = ['items', 'shippingAddress'];
  errors.push(...validateRequired(requiredFields, orderData));
  
  // Items validation
  if (orderData.items && Array.isArray(orderData.items)) {
    if (orderData.items.length === 0) {
      errors.push('Order must contain at least one item');
    }
    
    orderData.items.forEach((item, index) => {
      if (!item.product || !isValidObjectId(item.product)) {
        errors.push(`Invalid product ID at item ${index + 1}`);
      }
      
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`Invalid quantity at item ${index + 1}`);
      }
    });
  }
  
  return errors;
};

// Address validation
const validateAddress = (addressData) => {
  const errors = [];
  
  const requiredFields = ['street', 'city', 'state', 'pincode', 'country'];
  errors.push(...validateRequired(requiredFields, addressData));
  
  if (addressData.pincode && !isValidPincode(addressData.pincode)) {
    errors.push('Invalid pincode format');
  }
  
  return errors;
};

// File validation
const validateFile = (file, allowedTypes = ['image/jpeg', 'image/png', 'image/webp'], maxSize = 5 * 1024 * 1024) => {
  const errors = [];
  
  if (!allowedTypes.includes(file.mimetype)) {
    errors.push(`File type ${file.mimetype} is not allowed`);
  }
  
  if (file.size > maxSize) {
    errors.push(`File size exceeds maximum limit of ${maxSize / 1024 / 1024}MB`);
  }
  
  return errors;
};

// Query parameter validation
const validateQueryParams = (query, allowedParams = []) => {
  const errors = [];
  const validatedQuery = {};
  
  // Only allow specific parameters
  Object.keys(query).forEach(key => {
    if (allowedParams.includes(key)) {
      validatedQuery[key] = sanitizeInput(query[key]);
    }
  });
  
  // Validate pagination parameters
  if (validatedQuery.page) {
    const page = parseInt(validatedQuery.page);
    if (isNaN(page) || page < 1) {
      errors.push('Page must be a positive number');
    } else {
      validatedQuery.page = page;
    }
  }
  
  if (validatedQuery.limit) {
    const limit = parseInt(validatedQuery.limit);
    if (isNaN(limit) || limit < 1 || limit > 100) {
      errors.push('Limit must be between 1 and 100');
    } else {
      validatedQuery.limit = limit;
    }
  }
  
  return { errors, validatedQuery };
};

module.exports = {
  isValidEmail,
  isValidPhone,
  isValidPassword,
  isValidPincode,
  isValidGSTIN,
  isValidObjectId,
  isValidURL,
  sanitizeInput,
  validateRequired,
  validateProduct,
  validateUser,
  validateOrder,
  validateAddress,
  validateFile,
  validateQueryParams
};

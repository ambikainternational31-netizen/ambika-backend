// Response helpers for consistent API responses

// Success response
const sendSuccessResponse = (res, data = null, message = 'Success', statusCode = 200) => {
  const response = {
    success: true,
    message,
    data
  };
  
  return res.status(statusCode).json(response);
};

// Error response
const sendErrorResponse = (res, message = 'Internal Server Error', statusCode = 500, errors = null) => {
  const response = {
    success: false,
    message
  };
  
  if (errors) {
    response.errors = errors;
  }
  
  return res.status(statusCode).json(response);
};

// Paginated response
const sendPaginatedResponse = (res, data, pagination, message = 'Success') => {
  const response = {
    success: true,
    message,
    data,
    pagination
  };
  
  return res.status(200).json(response);
};

// Created response
const sendCreatedResponse = (res, data, message = 'Created successfully') => {
  return sendSuccessResponse(res, data, message, 201);
};

// No content response
const sendNoContentResponse = (res, message = 'Deleted successfully') => {
  return res.status(204).json({
    success: true,
    message
  });
};

// Validation error response
const sendValidationErrorResponse = (res, errors) => {
  return sendErrorResponse(res, 'Validation failed', 400, errors);
};

// Unauthorized response
const sendUnauthorizedResponse = (res, message = 'Unauthorized access') => {
  return sendErrorResponse(res, message, 401);
};

// Forbidden response
const sendForbiddenResponse = (res, message = 'Access forbidden') => {
  return sendErrorResponse(res, message, 403);
};

// Not found response
const sendNotFoundResponse = (res, message = 'Resource not found') => {
  return sendErrorResponse(res, message, 404);
};

// Conflict response
const sendConflictResponse = (res, message = 'Resource conflict') => {
  return sendErrorResponse(res, message, 409);
};

// Rate limit response
const sendRateLimitResponse = (res, message = 'Too many requests') => {
  return sendErrorResponse(res, message, 429);
};

// Pagination helper
const getPaginationInfo = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  
  return {
    current: page,
    total: totalPages,
    count: total,
    limit,
    hasNext,
    hasPrev,
    next: hasNext ? page + 1 : null,
    prev: hasPrev ? page - 1 : null
  };
};

// Query builder helper
const buildQuery = (Model, filters = {}, options = {}) => {
  let query = Model.find(filters);
  
  // Population
  if (options.populate) {
    if (Array.isArray(options.populate)) {
      options.populate.forEach(pop => {
        query = query.populate(pop);
      });
    } else {
      query = query.populate(options.populate);
    }
  }
  
  // Sorting
  if (options.sort) {
    query = query.sort(options.sort);
  }
  
  // Field selection
  if (options.select) {
    query = query.select(options.select);
  }
  
  // Pagination
  if (options.page && options.limit) {
    const skip = (options.page - 1) * options.limit;
    query = query.skip(skip).limit(options.limit);
  }
  
  return query;
};

// Search query builder
const buildSearchQuery = (searchTerm, searchFields = []) => {
  if (!searchTerm || !searchFields.length) {
    return {};
  }
  
  const searchRegex = new RegExp(searchTerm, 'i');
  
  return {
    $or: searchFields.map(field => ({
      [field]: searchRegex
    }))
  };
};

// Filter query builder
const buildFilterQuery = (filters = {}) => {
  const query = {};
  
  Object.keys(filters).forEach(key => {
    const value = filters[key];
    
    if (value !== undefined && value !== null && value !== '') {
      // Handle array filters (e.g., status in ['active', 'inactive'])
      if (Array.isArray(value)) {
        query[key] = { $in: value };
      }
      // Handle range filters (e.g., price between min and max)
      else if (typeof value === 'object' && !Array.isArray(value)) {
        query[key] = value;
      }
      // Handle exact match
      else {
        query[key] = value;
      }
    }
  });
  
  return query;
};

// Aggregation pipeline helper
const buildAggregationPipeline = (options = {}) => {
  const pipeline = [];
  
  // Match stage
  if (options.match) {
    pipeline.push({ $match: options.match });
  }
  
  // Lookup stages
  if (options.lookups) {
    options.lookups.forEach(lookup => {
      pipeline.push({ $lookup: lookup });
    });
  }
  
  // Group stage
  if (options.group) {
    pipeline.push({ $group: options.group });
  }
  
  // Sort stage
  if (options.sort) {
    pipeline.push({ $sort: options.sort });
  }
  
  // Project stage
  if (options.project) {
    pipeline.push({ $project: options.project });
  }
  
  // Pagination
  if (options.skip !== undefined) {
    pipeline.push({ $skip: options.skip });
  }
  
  if (options.limit) {
    pipeline.push({ $limit: options.limit });
  }
  
  return pipeline;
};

// Format currency
const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

// Format date
const formatDate = (date, locale = 'en-IN') => {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(date));
};

// Generate unique code
const generateUniqueCode = (prefix = '', length = 8) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = prefix;
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
};

// Deep clone object
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

// Remove undefined and null values from object
const cleanObject = (obj) => {
  const cleaned = {};
  
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined && obj[key] !== null) {
      cleaned[key] = obj[key];
    }
  });
  
  return cleaned;
};

module.exports = {
  sendSuccessResponse,
  sendErrorResponse,
  sendPaginatedResponse,
  sendCreatedResponse,
  sendNoContentResponse,
  sendValidationErrorResponse,
  sendUnauthorizedResponse,
  sendForbiddenResponse,
  sendNotFoundResponse,
  sendConflictResponse,
  sendRateLimitResponse,
  getPaginationInfo,
  buildQuery,
  buildSearchQuery,
  buildFilterQuery,
  buildAggregationPipeline,
  formatCurrency,
  formatDate,
  generateUniqueCode,
  deepClone,
  cleanObject
};

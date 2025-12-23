const logger = require('../utils/logger');

// Custom error class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Handle different types of errors
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg ? err.errmsg.match(/(["'])(\\?.)*?\1/)[0] : 'duplicate value';
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401);

// Send error in development
const sendErrorDev = (err, res) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

// Send error in production
const sendErrorProd = (err, res) => {
  const statusCode = err.statusCode || 500;
  
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(statusCode).json({
      success: false,
      message: err.message
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('ERROR:', {
      message: err.message,
      stack: err.stack,
      statusCode: statusCode
    });
    
    res.status(500).json({
      success: false,
      message: 'Something went wrong!'
    });
  }
};

// Main error handler
const errorHandler = (err, req, res, next) => {
  // Set default status code if not set
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode;

  // Log error
  logger.error('Error details:', {
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') error = handleCastErrorDB(error);

  // Mongoose duplicate key
  if (err.code === 11000) error = handleDuplicateFieldsDB(error);

  // Mongoose validation error
  if (err.name === 'ValidationError') error = handleValidationErrorDB(error);

  // JWT error
  if (err.name === 'JsonWebTokenError') error = handleJWTError();

  // JWT expired error
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

// Async error handler wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Not found middleware
const notFound = (req, res, next) => {
  const error = new AppError(`Not found - ${req.originalUrl}`, 404);
  next(error);
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFound,
  AppError
};
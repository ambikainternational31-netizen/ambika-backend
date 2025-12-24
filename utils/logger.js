const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logDir = path.join(__dirname, '../logs');
try {
  if (!fs.existsSync(logDir)) {
    // fs.mkdirSync(logDir, { recursive: true });
  }
} catch (error) {
  console.error('Failed to create logs directory:', error);
}

// Ultra lightweight logger configuration
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'error' : 'info',
  format: winston.format.simple(),
  defaultMeta: { service: 'ambika-api' },
  transports: [
    // Production: Only log errors to file
    // new winston.transports.File({
    //   filename: path.join(logDir, 'error.log'),
    //   level: 'error',
    //   maxsize: 1048576, // 1MB
    //   maxFiles: 1,
    //   tailable: true,
    //   format: winston.format.combine(
    //     winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    //     winston.format.printf(({ level, message, timestamp }) => 
    //       `${timestamp} [${level}]: ${message}`
    //     )
    //   )
    // })
  ]
});

// Add console logging only in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: process.env.NODE_ENV === 'production' ? 5 : 3,
      minPoolSize: 1,
      maxIdleTimeMS: 30000, // Reduced idle time
      serverSelectionTimeoutMS: 5000, // Faster timeout
      socketTimeoutMS: 30000, // Reduced socket timeout
      connectTimeoutMS: 5000, // Faster connect timeout
      retryWrites: true,
      writeConcern: { w: 'majority' },
      // Enable caching for better performance
      bufferCommands: false,
      autoIndex: process.env.NODE_ENV !== 'production'
    });
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`MongoDB Connected: ${conn.connection.host}`);
    }
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
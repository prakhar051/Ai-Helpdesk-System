const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const connString = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-helpdesk';
    
    const mongooseOptions = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    mongoose.connection.on('connected', () => {
      console.log('MongoDB connection event: connected');
    });

    mongoose.connection.on('error', (err) => {
      console.error(`MongoDB connection event error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB connection event: disconnected');
    });

    const conn = await mongoose.connect(connString, mongooseOptions);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB Initial Connection Error: ${error.message}`);
    // Exit process with failure in production, but let it retry in development
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

module.exports = connectDB;

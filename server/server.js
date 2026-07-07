const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Validate required environment configurations
const requiredEnv = ['PORT', 'DATABASE_URL'];
const missingEnv = requiredEnv.filter(env => !process.env[env]);
if (missingEnv.length > 0) {
  console.error(`CRITICAL CONFIG ERROR: Missing env variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const app = require('./app');
const prisma = require('./config/prisma');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

// Test database connection on startup
const verifyDatabase = async () => {
  try {
    logger.info('Verifying database connection...');
    await prisma.$connect();
    logger.info('PostgreSQL connected successfully via Prisma Client.');
  } catch (error) {
    logger.error('Database connection verification failed on boot:', { error: error.message });
    // In production, we crash the server process on database boot failures
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

verifyDatabase();

// Start server listener
const server = app.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Promise Rejection: ${err.message}`, { stack: err.stack });
  // Close server and exit
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack });
  // Close server and exit
  server.close(() => process.exit(1));
});

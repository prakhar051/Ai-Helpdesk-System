const prisma = require('../config/prisma');
const logger = require('../utils/logger');

// @desc    Get system health status
// @route   GET /api/v1/health
// @access  Public
const getHealth = async (req, res, next) => {
  try {
    // Run direct database check query without specific tables
    await prisma.$queryRaw`SELECT 1`;

    const healthInfo = {
      server: 'healthy',
      database: 'connected',
      uptime: process.uptime(),
      timestamp: new Date()
    };

    logger.info('System health diagnostics completed successfully.');

    return res.status(200).json({
      status: 'success',
      data: healthInfo
    });
  } catch (error) {
    logger.error('Database diagnostic query failed:', { error: error.message });
    
    const healthInfo = {
      server: 'healthy',
      database: 'disconnected',
      uptime: process.uptime(),
      timestamp: new Date()
    };

    return res.status(500).json({
      status: 'error',
      message: 'Database connection check failed',
      data: healthInfo
    });
  }
};

module.exports = {
  getHealth
};

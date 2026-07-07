const mongoose = require('mongoose');

// @desc    Get system health check
// @route   GET /api/v1/health
// @access  Public
const getHealth = (req, res) => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const dbState = states[mongoose.connection.readyState] || 'unknown';

  const healthInfo = {
    server: 'healthy',
    database: dbState,
    uptime: process.uptime(),
    timestamp: new Date()
  };

  if (mongoose.connection.readyState === 1) {
    return res.status(200).json({
      status: 'success',
      data: healthInfo
    });
  } else {
    return res.status(500).json({
      status: 'error',
      message: 'Database connection issue detected',
      data: healthInfo
    });
  }
};

module.exports = {
  getHealth
};
